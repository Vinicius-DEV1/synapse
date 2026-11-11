#include "synapse_controller.h"
#include <QtConcurrent/QtConcurrent>
#include <QtCore/QDir>
#include <QtCore/QEventLoop>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QSaveFile>
#include <QtCore/QSet>
#include <QtCore/QFutureWatcher>

namespace {

bool isUnderDirectory(const QString &path, const QString &directory) {
    if (path.isEmpty() || directory.isEmpty()) return false;
    const QString prefix = directory + QDir::separator();
#ifdef Q_OS_WIN
    return path.startsWith(prefix, Qt::CaseInsensitive);
#else
    return path.startsWith(prefix, Qt::CaseSensitive);
#endif
}

bool hasEnc1Header(const QString &path) {
    QFile file(path);
    return file.open(QIODevice::ReadOnly) && file.read(4) == QByteArrayLiteral("ENC1");
}

struct VaultSetupAssetBytesWiper {
    QByteArray &value;
    ~VaultSetupAssetBytesWiper() { value.fill('\0'); }
};

}

bool SynapseDataController::stageVaultSetupAssets(
    const QString &filesKey, const QString &libraryKey, const QString &cultureKey,
    QVector<VaultSetupAssetMigration> &migrations) {
    if (m_fileOperationRunning) {
        m_vaultLockError = "Wait for the current file operation to finish before setting up vault protection.";
        emit vaultLockErrorChanged();
        return false;
    }

    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    QDir().mkpath(appDirectory + "/files");
    QDir().mkpath(appDirectory + "/library");
    QDir().mkpath(appDirectory + "/videos");
    const QString resolvedFilesDirectory = QFileInfo(appDirectory + "/files").canonicalFilePath();
    const QString resolvedLibraryDirectory = QFileInfo(appDirectory + "/library").canonicalFilePath();
    const QString resolvedVideosDirectory = QFileInfo(appDirectory + "/videos").canonicalFilePath();

    struct Candidate {
        QString path;
        QString key;
        QString label;
    };
    QVector<Candidate> candidates;
    struct CandidateKeyWiper {
        QVector<Candidate> &values;
        ~CandidateKeyWiper() {
            for (Candidate &candidate : values) candidate.key.fill(QChar(0));
        }
    } candidateKeyWiper{candidates};
    QSet<QString> uniquePaths;

    const auto addCandidate = [&](const QString &recordedPath, const QString &root,
                                  const QString &key, const QString &label) -> bool {
        if (recordedPath.trimmed().isEmpty()) return true;
        if (recordedPath.contains(QLatin1Char(':')) && !QDir::isAbsolutePath(recordedPath)) {
            m_vaultLockError = QString("A stored %1 path is already encrypted or malformed; vault setup was stopped.").arg(label);
            emit vaultLockErrorChanged();
            return false;
        }
        const QString candidate = QDir::isAbsolutePath(recordedPath)
            ? recordedPath : QDir(appDirectory).filePath(recordedPath);
        const QFileInfo info(candidate);
        if (!info.exists()) return true;
        const QString canonical = info.canonicalFilePath();
        if (canonical.isEmpty() || !info.isFile() || !info.isReadable()) {
            m_vaultLockError = QString("A local %1 could not be read; vault setup was stopped.").arg(label);
            emit vaultLockErrorChanged();
            return false;
        }
        if (!isUnderDirectory(canonical, root)) {
            m_vaultLockError = QString("A local %1 is outside the app-managed folder and could not be migrated safely.").arg(label);
            emit vaultLockErrorChanged();
            return false;
        }
        if (hasEnc1Header(canonical)) return true;
        if (key.isEmpty()) {
            m_vaultLockError = QString("The %1 encryption key is unavailable; vault setup was stopped.").arg(label);
            emit vaultLockErrorChanged();
            return false;
        }
        const QString identity = canonical + QLatin1Char('\n') + key;
        if (uniquePaths.contains(identity)) return true;
        uniquePaths.insert(identity);
        candidates.append({canonical, key, label});
        return true;
    };

    const QJsonArray fileRows = executeQuery(
        "SELECT local_path FROM files WHERE local_path IS NOT NULL AND local_path != ''");
    for (const QJsonValue &value : fileRows) {
        if (!addCandidate(value.toObject().value("local_path").toString(), resolvedFilesDirectory,
                          filesKey, "file attachment")) return false;
    }

    const QJsonArray bookRows = executeQuery(
        "SELECT file_path FROM library_books WHERE file_path IS NOT NULL AND file_path != ''");
    for (const QJsonValue &value : bookRows) {
        QString path = value.toObject().value("file_path").toString();
        path.remove(QStringLiteral("file://"));
        if (!addCandidate(path, resolvedLibraryDirectory, libraryKey, "book")) return false;
    }

    const QJsonArray videoRows = executeQuery(
        "SELECT file_path, subtitles_json, local_subtitle_path FROM videos");
    for (const QJsonValue &value : videoRows) {
        const QJsonObject row = value.toObject();
        if (!addCandidate(row.value("file_path").toString(), resolvedVideosDirectory,
                          cultureKey, "video")) return false;

        const QString serialized = row.value("subtitles_json").toString();
        if (!serialized.trimmed().isEmpty()) {
            QJsonParseError parseError;
            const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
            if (parseError.error != QJsonParseError::NoError || !document.isArray()) {
                m_vaultLockError = "A video's subtitle list is invalid; vault setup was stopped.";
                emit vaultLockErrorChanged();
                return false;
            }
            for (const QJsonValue &trackValue : document.array()) {
                if (!addCandidate(trackValue.toObject().value("local_path").toString(),
                                  resolvedVideosDirectory, cultureKey, "subtitle")) return false;
            }
        }
        const QString legacyPath = row.value("local_subtitle_path").toString();
        if (!addCandidate(legacyPath, resolvedVideosDirectory, cultureKey, "subtitle")) return false;
    }

    auto removeStaged = [&migrations]() {
        for (const VaultSetupAssetMigration &migration : migrations) QFile::remove(migration.stagedPath);
        migrations.clear();
    };

    for (const Candidate &candidate : candidates) {
        const QString stagedPath = candidate.path + ".vault-setup-stage-" + generateUuid();
        SynapseFileOperation *operation = synapse_file_operation_create();
        if (!operation) {
            removeStaged();
            m_vaultLockError = QString("Could not stage a local %1 for encryption.").arg(candidate.label);
            emit vaultLockErrorChanged();
            return false;
        }

        const QByteArray sourceBytes = candidate.path.toUtf8();
        const QByteArray targetBytes = stagedPath.toUtf8();
        QByteArray keyBytes = candidate.key.toUtf8();
        VaultSetupAssetBytesWiper keyWiper{keyBytes};
        m_fileOperationRunning = true;
        emit fileOperationStateChanged();
        m_activeFileOperation = operation;
        QFutureWatcher<int> watcher;
        QEventLoop waitLoop;
        connect(&watcher, &QFutureWatcher<int>::finished, &waitLoop, &QEventLoop::quit);
        watcher.setFuture(QtConcurrent::run([sourceBytes, targetBytes, keyBytes, operation]() mutable {
            const int result = synapse_file_encrypt(sourceBytes.constData(), targetBytes.constData(),
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

        if (result != 0 || !hasEnc1Header(stagedPath)) {
            QFile::remove(stagedPath);
            removeStaged();
            m_vaultLockError = QString("A local %1 could not be encrypted; vault setup was stopped.").arg(candidate.label);
            emit vaultLockErrorChanged();
            return false;
        }
        const QString relativeTarget = QDir(appDirectory).relativeFilePath(candidate.path);
        const QString relativeStaged = QDir(appDirectory).relativeFilePath(stagedPath);
        migrations.append({generateUuid(), relativeTarget, relativeStaged});
    }
    return true;
}

bool SynapseDataController::finishVaultSetupAssetMigrations() {
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QJsonArray rows = executeQuery(
        "SELECT id, target_path, staged_path FROM vault_asset_migrations ORDER BY rowid ASC");
    for (const QJsonValue &value : rows) {
        const QJsonObject row = value.toObject();
        const QString id = row.value("id").toString();
        const QString targetRelative = QDir::cleanPath(row.value("target_path").toString());
        const QString stagedRelative = QDir::cleanPath(row.value("staged_path").toString());
        const QString targetPath = QFileInfo(QDir(appDirectory).filePath(targetRelative)).absoluteFilePath();
        const QString stagedPath = QFileInfo(QDir(appDirectory).filePath(stagedRelative)).absoluteFilePath();
        const QString filesRoot = QFileInfo(appDirectory + "/files").canonicalFilePath();
        const QString libraryRoot = QFileInfo(appDirectory + "/library").canonicalFilePath();
        const QString videosRoot = QFileInfo(appDirectory + "/videos").canonicalFilePath();
        const bool targetManaged = isUnderDirectory(targetPath, filesRoot) ||
                                   isUnderDirectory(targetPath, libraryRoot) ||
                                   isUnderDirectory(targetPath, videosRoot);
        const QString targetParent = QFileInfo(targetPath).absolutePath();
        const QString canonicalParent = QFileInfo(targetParent).canonicalFilePath();
        const QString canonicalStage = QFileInfo(stagedPath).canonicalFilePath();
        if (!targetManaged || canonicalParent.isEmpty() || canonicalStage.isEmpty() ||
            !isUnderDirectory(canonicalStage, canonicalParent)) {
            m_vaultLockError = "A pending encrypted asset migration has an invalid path; the vault remains locked.";
            emit vaultLockErrorChanged();
            return false;
        }

        if (!hasEnc1Header(targetPath)) {
            if (!hasEnc1Header(stagedPath)) {
                m_vaultLockError = "A staged encrypted asset is missing or invalid; the vault remains locked.";
                emit vaultLockErrorChanged();
                return false;
            }
            QFile staged(stagedPath);
            QSaveFile target(targetPath);
            target.setDirectWriteFallback(false);
            if (!staged.open(QIODevice::ReadOnly) || !target.open(QIODevice::WriteOnly)) {
                target.cancelWriting();
                m_vaultLockError = "Could not install an encrypted asset; the vault remains locked.";
                emit vaultLockErrorChanged();
                return false;
            }
            target.setPermissions(QFileDevice::ReadOwner | QFileDevice::WriteOwner);
            QByteArray buffer(1024 * 1024, Qt::Uninitialized);
            bool copied = true;
            while (!staged.atEnd()) {
                const qint64 count = staged.read(buffer.data(), buffer.size());
                if (count <= 0 || target.write(buffer.constData(), count) != count) {
                    copied = false;
                    break;
                }
                buffer.fill('\0');
            }
            buffer.fill('\0');
            if (!copied || !target.commit() || !hasEnc1Header(targetPath)) {
                target.cancelWriting();
                m_vaultLockError = "Could not finalize an encrypted asset; the vault remains locked.";
                emit vaultLockErrorChanged();
                return false;
            }
        }

        QFile::remove(stagedPath);
        if (executeSqlPrepared("DELETE FROM vault_asset_migrations WHERE id = ?1", {id}) != 1) {
            m_vaultLockError = "An encrypted asset was installed, but its recovery record could not be cleared.";
            emit vaultLockErrorChanged();
            return false;
        }
    }
    return true;
}
