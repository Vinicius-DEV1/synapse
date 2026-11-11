#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrent>
#include <QtCore/QDir>
#include <QtCore/QEventLoop>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonObject>
#include <QtCore/QSet>
#include <QtCore/QTemporaryFile>
#include "controllers/video/video_subtitle_helpers.h"

// Stages encrypted files and media before master-password removal.

bool SynapseDataController::preparePasswordRemovalAssets(
    QVector<PasswordRemovalFileMigration> &fileMigrations,
    QVector<PasswordRemovalAssetMigration> &assetMigrations) {
    QString filesKey = m_unlockedKeys.value("files");
    QString cultureKey = m_unlockedKeys.value("culture");
    QString libraryKey = m_unlockedKeys.value("library");
    struct QStringWiper {
        QString &value;
        ~QStringWiper() { value.fill(QChar(0)); }
    } filesKeyWiper{filesKey};
    QStringWiper cultureKeyWiper{cultureKey};
    QStringWiper libraryKeyWiper{libraryKey};

    const auto decryptToTemporary = [this](const QString &sourcePath, const QString &temporaryPath,
                                           const QString &key) -> bool {
        SynapseFileOperation *operation = synapse_file_operation_create();
        if (!operation) return false;
        const QByteArray sourceBytes = sourcePath.toUtf8();
        const QByteArray targetBytes = temporaryPath.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        QFutureWatcher<int> watcher;
        QEventLoop waitLoop;
        connect(&watcher, &QFutureWatcher<int>::finished, &waitLoop, &QEventLoop::quit);
        m_fileOperationRunning = true;
        emit fileOperationStateChanged();
        m_activeFileOperation = operation;
        watcher.setFuture(QtConcurrent::run([sourceBytes, targetBytes, keyBytes, operation]() mutable {
            const int result = synapse_file_decrypt(sourceBytes.constData(), targetBytes.constData(),
                                                    keyBytes.constData(), operation);
            keyBytes.fill('\0');
            return result;
        }));
        keyBytes.fill('\0');
        if (!watcher.isFinished()) waitLoop.exec(QEventLoop::ExcludeUserInputEvents);
        const int result = watcher.result();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        synapse_file_operation_close(operation);
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        return result == 0;
    };

    const auto cleanupStagedFiles = [&fileMigrations, &assetMigrations]() {
        for (const PasswordRemovalFileMigration &pending : fileMigrations) {
            if (!pending.temporaryPath.isEmpty()) QFile::remove(pending.temporaryPath);
        }
        for (const PasswordRemovalAssetMigration &pending : assetMigrations) {
            if (!pending.temporaryPath.isEmpty()) QFile::remove(pending.temporaryPath);
        }
    };
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString filesDirectory = QFileInfo(appDirectory + "/files").canonicalFilePath();
    const QString videosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();
    const QString libraryDirectory = QFileInfo(appDirectory + "/library").canonicalFilePath();
    const QJsonArray fileRows = executeQuery("SELECT id, local_path, drive_file_id FROM files WHERE local_path IS NOT NULL OR drive_file_id IS NOT NULL");
    for (const QJsonValue &value : fileRows) {
        const QJsonObject row = value.toObject();
        PasswordRemovalFileMigration migration;
        migration.id = row.value("id").toString();
        const QString encryptedPath = row.value("local_path").toString();
        const QString encryptedDriveId = row.value("drive_file_id").toString();
        if (!encryptedPath.isEmpty()) {
            migration.localPath = decryptContent(filesKey, encryptedPath);
            if (migration.localPath.isNull() || migration.localPath.isEmpty()) {
                cleanupStagedFiles();
                m_vaultLockError = "A file path could not be decrypted; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
        }
        if (!encryptedDriveId.isEmpty()) {
            migration.driveFileId = decryptContent(filesKey, encryptedDriveId);
            if (migration.driveFileId.isNull() || migration.driveFileId.isEmpty()) {
                cleanupStagedFiles();
                m_vaultLockError = "A cloud file reference could not be decrypted; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
        }

        const QFileInfo candidateInfo(migration.localPath.isEmpty()
            ? QString()
            : (QDir::isAbsolutePath(migration.localPath) ? migration.localPath : appDirectory + "/" + migration.localPath));
        const QString canonicalCandidate = candidateInfo.canonicalFilePath();
        if (!canonicalCandidate.isEmpty() && !filesDirectory.isEmpty() &&
            canonicalCandidate.startsWith(filesDirectory + QDir::separator()) && candidateInfo.isFile()) {
            QFile encryptedFile(canonicalCandidate);
            if (encryptedFile.open(QIODevice::ReadOnly)) {
                const QByteArray magic = encryptedFile.read(4);
                encryptedFile.close();
                if (magic == QByteArrayLiteral("ENC1")) {
                    if (filesKey.isEmpty()) {
                        cleanupStagedFiles();
                        m_vaultLockError = "The local files key is unavailable; the master password was not removed.";
                        emit vaultLockErrorChanged();
                        return false;
                    }
                    QTemporaryFile decryptedStage(appDirectory + "/files/.decrypted-XXXXXX");
                    decryptedStage.setAutoRemove(false);
                    if (!decryptedStage.open()) {
                        cleanupStagedFiles();
                        m_vaultLockError = "Could not stage local files securely; the master password was not removed.";
                        emit vaultLockErrorChanged();
                        return false;
                    }
                    migration.sourcePath = canonicalCandidate;
                    migration.temporaryPath = decryptedStage.fileName();
                    decryptedStage.close();
                    if (!decryptToTemporary(migration.sourcePath, migration.temporaryPath, filesKey)) {
                        QFile::remove(migration.temporaryPath);
                        cleanupStagedFiles();
                        m_vaultLockError = "A local file could not be decrypted; the master password was not removed.";
                        emit vaultLockErrorChanged();
                        return false;
                    }
                }
            }
        }
        fileMigrations.append(migration);
    }

    const auto stageEncryptedAssets = [this, &appDirectory, &cleanupStagedFiles, &assetMigrations,
                                      &decryptToTemporary](
        const QString &tableName, const QString &managedDirectory, const QString &assetKey,
        const QString &assetLabel) -> bool {
        if (managedDirectory.isEmpty()) return true;
        const QJsonArray rows = executeQuery(QString("SELECT id, file_path FROM %1 WHERE file_path IS NOT NULL AND file_path != ''")
                                             .arg(tableName));
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            const QString recordedPath = row.value("file_path").toString();
            const QFileInfo candidateInfo(QDir::isAbsolutePath(recordedPath)
                ? recordedPath : QDir(appDirectory).filePath(recordedPath));
            const QString canonicalCandidate = candidateInfo.canonicalFilePath();
            if (canonicalCandidate.isEmpty() || !candidateInfo.isFile() ||
                !canonicalCandidate.startsWith(managedDirectory + QDir::separator())) {
                continue;
            }

            QFile encryptedFile(canonicalCandidate);
            if (!encryptedFile.open(QIODevice::ReadOnly)) {
                cleanupStagedFiles();
                m_vaultLockError = QString("A local %1 could not be inspected; the master password was not removed.")
                                       .arg(assetLabel);
                emit vaultLockErrorChanged();
                return false;
            }
            const QByteArray magic = encryptedFile.read(4);
            encryptedFile.close();
            if (magic != QByteArrayLiteral("ENC1")) continue;
            if (assetKey.isEmpty()) {
                cleanupStagedFiles();
                m_vaultLockError = QString("The local %1 key is unavailable; the master password was not removed.")
                                       .arg(assetLabel);
                emit vaultLockErrorChanged();
                return false;
            }

            QTemporaryFile decryptedStage(managedDirectory + QString("/.decrypted-%1-XXXXXX").arg(assetLabel));
            decryptedStage.setAutoRemove(false);
            if (!decryptedStage.open()) {
                cleanupStagedFiles();
                m_vaultLockError = QString("Could not stage local %1 files securely; the master password was not removed.")
                                       .arg(assetLabel);
                emit vaultLockErrorChanged();
                return false;
            }
            PasswordRemovalAssetMigration migration;
            migration.id = row.value("id").toString();
            migration.sourcePath = canonicalCandidate;
            migration.temporaryPath = decryptedStage.fileName();
            decryptedStage.close();

            if (!decryptToTemporary(migration.sourcePath, migration.temporaryPath, assetKey)) {
                QFile::remove(migration.temporaryPath);
                cleanupStagedFiles();
                m_vaultLockError = QString("A local %1 file could not be decrypted; the master password was not removed.")
                                       .arg(assetLabel);
                emit vaultLockErrorChanged();
                return false;
            }
            assetMigrations.append(migration);
        }
        return true;
    };
    if (!stageEncryptedAssets("videos", videosDirectory, cultureKey, "video") ||
        !stageEncryptedAssets("library_books", libraryDirectory, libraryKey, "book")) {
        return false;
    }

    const QJsonArray subtitleRows = executeQuery(
        "SELECT id, subtitles_json, local_subtitle_path FROM videos WHERE deleted_at IS NULL");
    QSet<QString> stagedSubtitlePaths;
    for (const QJsonValue &value : subtitleRows) {
        const QJsonObject video = value.toObject();
        const QString serialized = video.value("subtitles_json").toString();
        QJsonArray subtitleTracks;
        if (!serialized.trimmed().isEmpty()) {
            QJsonParseError parseError;
            const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
            if (parseError.error != QJsonParseError::NoError || !document.isArray()) {
                cleanupStagedFiles();
                m_vaultLockError = "A video's subtitle list is invalid; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
            subtitleTracks = document.array();
        }
        const QString legacyPath = video.value("local_subtitle_path").toString();
        if (!legacyPath.isEmpty()) {
            subtitleTracks.append(QJsonObject{{"local_path", legacyPath}});
        }

        for (const QJsonValue &subtitleValue : subtitleTracks) {
            const QString path = VideoSubtitleHelpers::canonicalManagedPath(
                subtitleValue.toObject().value("local_path").toString(), appDirectory, videosDirectory);
            if (path.isEmpty() || stagedSubtitlePaths.contains(path)) continue;
            stagedSubtitlePaths.insert(path);

            QFile encryptedSubtitle(path);
            if (!encryptedSubtitle.open(QIODevice::ReadOnly)) {
                cleanupStagedFiles();
                m_vaultLockError = "A local subtitle could not be inspected; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
            const QByteArray magic = encryptedSubtitle.read(4);
            encryptedSubtitle.close();
            if (magic != QByteArrayLiteral("ENC1")) continue;
            if (cultureKey.isEmpty()) {
                cleanupStagedFiles();
                m_vaultLockError = "The local subtitle key is unavailable; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }

            QTemporaryFile decryptedStage(videosDirectory + "/.decrypted-subtitle-XXXXXX");
            decryptedStage.setAutoRemove(false);
            if (!decryptedStage.open()) {
                cleanupStagedFiles();
                m_vaultLockError = "Could not stage local subtitles; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
            PasswordRemovalAssetMigration migration;
            migration.id = video.value("id").toString() + ":" + subtitleValue.toObject().value("id").toString();
            migration.sourcePath = path;
            migration.temporaryPath = decryptedStage.fileName();
            decryptedStage.close();
            if (!decryptToTemporary(migration.sourcePath, migration.temporaryPath, cultureKey)) {
                QFile::remove(migration.temporaryPath);
                cleanupStagedFiles();
                m_vaultLockError = "A local subtitle could not be decrypted; the master password was not removed.";
                emit vaultLockErrorChanged();
                return false;
            }
            assetMigrations.append(migration);
        }
    }

    return true;
}
