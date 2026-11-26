#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrent>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QRegularExpression>
#include <QtCore/QTemporaryFile>

void SynapseDataController::saveNotesTextFile(const QString &fileId, const QString &content,
                                               const QString &requestId) {
    const auto fail = [this, &requestId](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message},
                                    {"operation", "save-text"}, {"requestId", requestId}});
    };
    if (m_fileOperationRunning) return fail("Another file operation is already running.");
    if (!m_isVaultConfigured || !m_isVaultUnlocked || m_unlockedKeys.value("files").isEmpty())
        return fail("Unlock the files vault before editing a document.");

    const QString cleanFileId = fileId.trimmed();
    if (cleanFileId.isEmpty() || requestId.trimmed().isEmpty()) return fail("The file edit request is invalid.");
    const QByteArray contentBytes = content.toUtf8();
    constexpr qint64 maxEditableTextSize = 4LL * 1024LL * 1024LL;
    if (contentBytes.size() > maxEditableTextSize) return fail("Markdown edits are limited to 4 MB.");

    char *raw = synapse_files_get_file(m_db, cleanFileId.toUtf8().constData());
    if (!raw) return fail("The selected file is no longer available.");
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    if (!doc.isObject()) return fail("The selected file is no longer available.");

    const QJsonObject record = doc.object();
    const QString name = record.value("name").toString();
    const bool hasDriveCopy = !record.value("drive_file_id").toString().trimmed().isEmpty();
    const QString extension = QFileInfo(name).suffix().toLower();
    if (extension != "md" && extension != "markdown") return fail("Only Markdown attachments can be edited here.");

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString filesDirectory = appDirectory + "/files";
    if (!QDir().mkpath(filesDirectory)) return fail("Could not create the encrypted files directory.");
    const QString filesRoot = QFileInfo(filesDirectory).canonicalFilePath();
    const QString oldStoredPath = record.value("local_path").toString();
    const QString oldRelativePath = decryptContent(m_unlockedKeys.value("files"), oldStoredPath);
    const QString oldPath = QFileInfo(appDirectory + "/" + oldRelativePath).canonicalFilePath();
    if (filesRoot.isEmpty() || oldRelativePath.isEmpty() || oldPath.isEmpty() ||
            !oldPath.startsWith(filesRoot + QDir::separator()))
        return fail("The file's protected local path is invalid.");

    QString storedExtension = extension;
    storedExtension.remove(QRegularExpression("[^a-z0-9]"));
    if (storedExtension.size() > 16) storedExtension = storedExtension.left(16);
    const QString storageName = generateUuid() + "." + storedExtension + ".enc";
    const QString destination = filesRoot + "/" + storageName;
    const QString stagedDestination = destination + ".partial";
    const QString encryptedRelativePath = encryptContent(m_unlockedKeys.value("files"), "files/" + storageName);
    if (encryptedRelativePath.isEmpty()) return fail("Could not protect the new file reference.");

    auto *sourceFile = new QTemporaryFile(this);
    sourceFile->setAutoRemove(true);
    if (!sourceFile->open() || sourceFile->write(contentBytes) != contentBytes.size() || !sourceFile->flush()) {
        delete sourceFile;
        return fail("Could not prepare the edited text safely.");
    }
    const QString sourcePath = sourceFile->fileName();
    sourceFile->close();

    QString key = m_unlockedKeys.value("files");
    const bool vaultWasConfigured = m_isVaultConfigured;
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        key.fill(QChar(0));
        delete sourceFile;
        return fail("Could not start the encrypted save operation.");
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, sourceFile, operation, requestId, cleanFileId, name, filesRoot,
             oldPath, destination, stagedDestination, encryptedRelativePath, contentSize = contentBytes.size(),
             vaultWasConfigured, hasDriveCopy]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        bool success = result.value("success").toBool() &&
                       (vaultWasConfigured ? m_isVaultUnlocked : !m_isVaultConfigured);
        QString error = result.value("error").toString();
        if (success && !QFile::rename(stagedDestination, destination)) {
            success = false;
            error = "Could not finalize the encrypted file.";
        }
        if (success) {
            const QByteArray idBytes = cleanFileId.toUtf8();
            const QByteArray pathBytes = encryptedRelativePath.toUtf8();
            success = synapse_files_replace_content_reference(m_db, idBytes.constData(),
                pathBytes.constData(), contentSize) == 1;
            if (!success) error = "The edited file could not be saved to its record.";
        }
        if (success) {
            if (oldPath != destination && oldPath.startsWith(filesRoot + QDir::separator())) QFile::remove(oldPath);
            emit filesChanged();
        } else {
            QFile::remove(stagedDestination);
            QFile::remove(destination);
            if (error.isEmpty()) error = "The files vault locked before the edit could be saved.";
        }
        delete sourceFile;
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished({{"success", success}, {"error", error}, {"name", name},
                                    {"has_drive_copy", hasDriveCopy},
                                    {"operation", "save-text"}, {"requestId", requestId}});
    });
    watcher->setFuture(QtConcurrent::run([sourcePath, stagedDestination, key, operation]() mutable {
        const QByteArray sourceBytes = sourcePath.toUtf8();
        const QByteArray targetBytes = stagedDestination.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = synapse_file_encrypt(sourceBytes.constData(), targetBytes.constData(),
                                                keyBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(stagedDestination);
            return QVariantMap{{"success", false}, {"error", "The edited file could not be encrypted."}};
        }
        return QVariantMap{{"success", true}};
    }));
    key.fill(QChar(0));
}
