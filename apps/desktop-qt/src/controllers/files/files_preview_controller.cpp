#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrent>
#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QMimeDatabase>
#include <QtCore/QRegularExpression>
#include <QtCore/QSaveFile>
#include <QtCore/QSet>
#include <QtCore/QTemporaryFile>
#include <QtCore/QUrl>

// Native protected file previews and type classification.

void SynapseDataController::previewLocalFile(const QString &fileId) {
    const auto fail = [this](const QString &message) {
        emit filePreviewReady({{"success", false}, {"error", message}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current file operation to finish.");
    if (m_isVaultConfigured && (!m_isVaultUnlocked || m_unlockedKeys.value("files").isEmpty())) {
        return fail("Unlock the vault before previewing encrypted files.");
    }

    const QString escapedId = escapeSql(fileId);
    const QJsonArray rows = executeQuery(QString("SELECT name, local_path, file_type, mime_type, file_size "
                                                 "FROM files WHERE id = '%1' AND deleted_at IS NULL")
                                         .arg(escapedId));
    if (rows.isEmpty()) return fail("The selected file is no longer available.");

    const QJsonObject record = rows.first().toObject();
    const QString name = record.value("name").toString();
    const QString fileType = record.value("file_type").toString();
    const QString mimeType = record.value("mime_type").toString();
    const qint64 fileSize = record.value("file_size").toVariant().toLongLong();
    constexpr qint64 maxPreviewFileSize = 250LL * 1024LL * 1024LL;
    if (fileSize < 0 || fileSize > maxPreviewFileSize) return fail("The file is too large to preview safely.");

    const QString storedLocalPath = record.value("local_path").toString();
    const QString storedPath = m_isVaultConfigured
        ? decryptContent(m_unlockedKeys.value("files"), storedLocalPath)
        : storedLocalPath;
    if (storedPath.isNull() || storedPath.isEmpty()) return fail("The local file reference could not be decrypted.");
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString filesDirectory = QFileInfo(appDirectory + "/files").canonicalFilePath();
    const QString fullSourcePath = QFileInfo(appDirectory + "/" + storedPath).canonicalFilePath();
    if (filesDirectory.isEmpty() || fullSourcePath.isEmpty() ||
        !fullSourcePath.startsWith(filesDirectory + QDir::separator())) {
        return fail("The local file path is invalid or outside the managed files directory.");
    }
    QFile sourceProbe(fullSourcePath);
    if (!sourceProbe.open(QIODevice::ReadOnly)) return fail("The local file could not be opened.");
    const bool encryptedAtRest = sourceProbe.read(4) == QByteArrayLiteral("ENC1");
    sourceProbe.close();
    const QString filesKey = m_unlockedKeys.value("files");
    if (encryptedAtRest && filesKey.isEmpty()) return fail("The encrypted file key is unavailable.");

    QString suffix = QFileInfo(name).suffix().toLower();
    suffix.remove(QRegularExpression("[^a-z0-9]"));
    if (suffix.isEmpty() || suffix.size() > 16) suffix = "bin";
    const QString previewTemplate = QDir(QDir::tempPath()).filePath("synapse-preview-XXXXXX." + suffix);
    auto *previewFile = new QTemporaryFile(previewTemplate, this);
    previewFile->setAutoRemove(true);
    if (!previewFile->open()) {
        delete previewFile;
        return fail("Could not create a protected temporary preview file.");
    }
    previewFile->setPermissions(QFileDevice::ReadOwner | QFileDevice::WriteOwner);
    const QString previewPath = previewFile->fileName();
    previewFile->close();

    QString key = encryptedAtRest ? filesKey : QString();
    const bool vaultWasConfigured = m_isVaultConfigured;
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        delete previewFile;
        key.fill(QChar(0));
        return fail("Could not start the encrypted file preview.");
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    m_pendingPreviewFile = previewFile;
    m_cancelPreviewRequested = false;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, previewFile, previewPath, name, fileType, mimeType, fileSize, vaultWasConfigured, operation]() {
        const QVariantMap operationResult = watcher->result();
        watcher->deleteLater();
        const bool wasCancelled = m_cancelPreviewRequested;
        m_cancelPreviewRequested = false;
        const bool vaultStateAllowsPreview = vaultWasConfigured ? m_isVaultUnlocked : !m_isVaultConfigured;
        bool success = operationResult.value("success").toBool() && vaultStateAllowsPreview && !wasCancelled;
        QVariantMap result = operationResult;
        if (success) {
            m_filePreviewFiles.insert(previewPath, previewFile);
            result.insert("path", previewPath);
            result.insert("url", QUrl::fromLocalFile(previewPath).toString());
            result.insert("name", name);
            result.insert("file_type", fileType);
            result.insert("mime_type", mimeType);
            result.insert("file_size", fileSize);
        } else {
            QFile::remove(previewPath);
            delete previewFile;
            if (wasCancelled) {
                result.insert("cancelled", true);
                result.insert("error", "The preview was cancelled.");
            } else if (result.value("error").toString().isEmpty()) {
                result.insert("error", "The vault locked before the preview could be opened.");
            }
        }
        if (m_pendingPreviewFile == previewFile) m_pendingPreviewFile = nullptr;
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        result.insert("success", success);
        emit filePreviewReady(result);
    });
    watcher->setFuture(QtConcurrent::run([fullSourcePath, previewPath, key, encryptedAtRest, operation]() mutable {
        const QByteArray sourceBytes = fullSourcePath.toUtf8();
        const QByteArray targetBytes = previewPath.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = encryptedAtRest
            ? synapse_file_decrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation)
            : synapse_file_copy(sourceBytes.constData(), targetBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(previewPath);
            return QVariantMap{{"success", false}, {"error", "The file could not be prepared for preview."}};
        }
        return QVariantMap{{"success", true}};
    }));
    key.fill(QChar(0));
}

QVariantMap SynapseDataController::readFilePreviewText(const QString &temporaryPath) {
    if (!m_filePreviewFiles.contains(temporaryPath)) {
        return {{"success", false}, {"error", "The preview file is no longer available."}};
    }
    QFile file(temporaryPath);
    constexpr qint64 maxTextPreviewSize = 4LL * 1024LL * 1024LL;
    if (!file.open(QIODevice::ReadOnly) || file.size() > maxTextPreviewSize) {
        return {{"success", false}, {"error", "Text previews are limited to 4 MB."}};
    }
    QByteArray bytes = file.readAll();
    if (file.error() != QFileDevice::NoError) {
        bytes.fill('\0');
        return {{"success", false}, {"error", "Could not read the text preview."}};
    }
    const QString text = QString::fromUtf8(bytes.constData(), bytes.size());
    bytes.fill('\0');
    return {{"success", true}, {"text", text}};
}

void SynapseDataController::closeFilePreview(const QString &temporaryPath) {
    auto preview = m_filePreviewFiles.find(temporaryPath);
    if (preview == m_filePreviewFiles.end()) return;
    QTemporaryFile *file = preview.value();
    m_filePreviewFiles.erase(preview);
    delete file;
}

void SynapseDataController::cancelFilePreview() {
    if (!m_pendingPreviewFile || !m_activeFileOperation) return;
    m_cancelPreviewRequested = true;
    synapse_file_operation_cancel(m_activeFileOperation);
}

QString SynapseDataController::fileTypeCategory(const QString &filename) const {
    const QString suffix = QFileInfo(filename).suffix().toLower();
    static const QStringList imageTypes{"png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tif", "tiff"};
    static const QStringList videoTypes{"mp4", "mkv", "webm", "mov", "avi", "flv", "wmv", "m4v"};
    static const QStringList textTypes{"txt", "md", "markdown", "json", "csv", "xml", "js", "ts", "jsx", "tsx", "css", "html", "log", "yaml", "yml", "toml", "ini", "env"};
    static const QStringList archiveTypes{"zip", "rar", "7z", "tar", "gz", "bz2", "xz"};
    if (suffix == "pdf") return "pdf";
    if (imageTypes.contains(suffix)) return "image";
    if (videoTypes.contains(suffix)) return "video";
    if (suffix == "epub") return "epub";
    if (QStringList{"ppt", "pptx", "key", "odp"}.contains(suffix)) return "slide";
    if (textTypes.contains(suffix)) return "text";
    if (archiveTypes.contains(suffix)) return "archive";
    return "other";
}
