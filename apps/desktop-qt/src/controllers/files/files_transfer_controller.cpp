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

// Native encrypted file import and export operations.

void SynapseDataController::importLocalFile(const QString &sourcePath, const QString &folderId,
                                            const QString &requestId) {
    const auto fail = [this, requestId](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message}, {"operation", "import"},
                                    {"requestId", requestId}});
    };
    if (m_fileOperationRunning) return fail("Another file operation is already running.");
    if (!m_isVaultConfigured || !m_isVaultUnlocked || m_unlockedKeys.value("files").isEmpty()) {
        return fail("Unlock the vault before importing files so they can be encrypted locally.");
    }

    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalSource = sourceInfo.canonicalFilePath();
    constexpr qint64 maxFileSize = 250LL * 1024LL * 1024LL;
    if (canonicalSource.isEmpty() || !sourceInfo.isFile() || sourceInfo.size() < 0 || sourceInfo.size() > maxFileSize) {
        return fail("Choose a readable file smaller than 250 MB.");
    }

    const QString id = generateUuid();
    QString extension = sourceInfo.suffix().toLower();
    extension.remove(QRegularExpression("[^a-z0-9]"));
    if (extension.size() > 16) extension = extension.left(16);
    const QString storedName = extension.isEmpty() ? id + ".enc" : id + "." + extension + ".enc";
    const QString filesDirectory = QFileInfo(m_dbPath).absolutePath() + "/files";
    if (!QDir().mkpath(filesDirectory)) return fail("Could not create the local files directory.");

    const QString destination = filesDirectory + "/" + storedName;
    const QString temporaryDestination = destination + ".partial";
    QString key = m_unlockedKeys.value("files");
    const QString encryptedLocalPath = encryptContent(key, "files/" + storedName);
    if (encryptedLocalPath.isNull() || encryptedLocalPath.isEmpty()) {
        key.fill(QChar(0));
        return fail("Could not protect the local file reference.");
    }
    const QString name = sourceInfo.fileName();
    const QString mimeType = QMimeDatabase().mimeTypeForFile(sourceInfo).name();
    const qint64 fileSize = sourceInfo.size();
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        key.fill(QChar(0));
        return fail("Could not start the encrypted file operation.");
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, id, name, mimeType, fileSize, folderId, requestId, destination,
             temporaryDestination, encryptedLocalPath, operation]() {
        const QVariantMap operationResult = watcher->result();
        watcher->deleteLater();
        bool success = operationResult.value("success").toBool();
        QString error = operationResult.value("error").toString();
        if (success) {
            if (!QFile::rename(temporaryDestination, destination)) {
                QFile::remove(temporaryDestination);
                success = false;
                error = "Could not finalize encrypted file storage.";
            }
        }
        if (success) {
            const QByteArray idBytes = id.toUtf8();
            const QByteArray nameBytes = name.toUtf8();
            const QByteArray typeBytes = fileTypeCategory(name).toUtf8();
            const QByteArray pathBytes = encryptedLocalPath.toUtf8();
            const QByteArray folderBytes = folderId.toUtf8();
            const QByteArray mimeBytes = mimeType.toUtf8();
            const int res = synapse_files_create_file(
                m_db,
                idBytes.constData(),
                nameBytes.constData(),
                typeBytes.constData(),
                fileSize,
                pathBytes.constData(),
                folderId.isEmpty() ? nullptr : folderBytes.constData(),
                mimeType.isEmpty() ? nullptr : mimeBytes.constData()
            );
            success = (res == 0);
            if (!success) {
                QFile::remove(destination);
                error = "Could not save the file record in the database.";
            } else {
                emit filesChanged();
            }
        }
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        QVariantMap result{{"success", success}, {"id", id}, {"name", name}, {"error", error}};
        result["operation"] = "import";
        result["requestId"] = requestId;
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished(result);
    });
    watcher->setFuture(QtConcurrent::run([canonicalSource, temporaryDestination, key, operation]() mutable {
        const QByteArray sourceBytes = canonicalSource.toUtf8();
        const QByteArray targetBytes = temporaryDestination.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = synapse_file_encrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(temporaryDestination);
            return QVariantMap{{"success", false}, {"error", "File encryption failed."}};
        }
        return QVariantMap{{"success", true}};
    }));
    key.fill(QChar(0));
}

void SynapseDataController::exportLocalFile(const QString &fileId, const QString &destinationPath) {
    const auto fail = [this](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message}, {"operation", "export"}});
    };
    if (m_fileOperationRunning) return fail("Another file operation is already running.");
    if (m_isVaultConfigured && (!m_isVaultUnlocked || m_unlockedKeys.value("files").isEmpty())) {
        return fail("Unlock the vault before exporting encrypted files.");
    }
    char *raw = synapse_files_get_file(m_db, fileId.trimmed().toUtf8().constData());
    if (!raw) return fail("The selected file is no longer available.");
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    if (!doc.isObject()) return fail("The selected file is no longer available.");

    const QJsonObject record = doc.object();
    const QString name = record.value("name").toString();
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
    const QFileInfo destinationInfo(destinationPath);
    if (destinationPath.isEmpty() || !destinationInfo.dir().exists()) return fail("Choose a valid export destination.");

    QString key = encryptedAtRest ? filesKey : QString();
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        key.fill(QChar(0));
        return fail("Could not start the encrypted file operation.");
    }
    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this, [this, watcher, name, operation]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        result["name"] = name;
        result["operation"] = "export";
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished(result);
    });
    watcher->setFuture(QtConcurrent::run([fullSourcePath, destinationPath, key, encryptedAtRest, operation]() mutable {
        QTemporaryFile preparedTemporary;
        preparedTemporary.setAutoRemove(true);
        if (!preparedTemporary.open()) {
            return QVariantMap{{"success", false}, {"error", "Could not create a secure temporary file."}};
        }
        const QString exportSourcePath = preparedTemporary.fileName();
        preparedTemporary.close();
        const QByteArray sourceBytes = fullSourcePath.toUtf8();
        const QByteArray targetBytes = exportSourcePath.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = encryptedAtRest
            ? synapse_file_decrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation)
            : synapse_file_copy(sourceBytes.constData(), targetBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            return QVariantMap{{"success", false}, {"error", "The file could not be prepared for export."}};
        }
        QFile decryptedInput(exportSourcePath);
        QSaveFile safeOutput(destinationPath);
        if (!decryptedInput.open(QIODevice::ReadOnly) || !safeOutput.open(QIODevice::WriteOnly)) {
            return QVariantMap{{"success", false}, {"error", "Could not open the selected export destination."}};
        }
        QByteArray buffer(1024 * 1024, Qt::Uninitialized);
        while (!decryptedInput.atEnd()) {
            const qint64 bytesRead = decryptedInput.read(buffer.data(), buffer.size());
            if (bytesRead < 0 || safeOutput.write(buffer.constData(), bytesRead) != bytesRead) {
                buffer.fill('\0');
                safeOutput.cancelWriting();
                return QVariantMap{{"success", false}, {"error", "The decrypted file could not be written completely."}};
            }
            buffer.fill('\0');
        }
        if (!safeOutput.commit()) {
            return QVariantMap{{"success", false}, {"error", "Could not finalize the exported file."}};
        }
        return QVariantMap{{"success", true}};
    }));
    key.fill(QChar(0));
}

