#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrent>
#include <QtCore/QCryptographicHash>
#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QEventLoop>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QFutureWatcher>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSaveFile>
#include <QtCore/QSet>
#include <QtCore/QTemporaryFile>
#include <QtCore/QTimer>
#include <QtCore/QVector>
#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkReply>
#include <QtNetwork/QNetworkRequest>

// Transactional master-password removal and encrypted asset migration.

bool SynapseDataController::removeMasterPassword(const QString &password) {
    if (m_fileOperationRunning) {
        m_vaultLockError = "Wait for the current encrypted file operation to finish.";
        emit vaultLockErrorChanged();
        return false;
    }
    if (!unlockVault(password)) return false;

    QString notesKey = m_unlockedKeys.value("notes");
    QString vaultKey = m_unlockedKeys.value("vault", notesKey);
    QString filesKey = m_unlockedKeys.value("files");
    struct QStringWiper {
        QString &value;
        ~QStringWiper() { value.fill(QChar(0)); }
    } notesKeyWiper{notesKey};
    QStringWiper vaultKeyWiper{vaultKey};
    QStringWiper filesKeyWiper{filesKey};
    if (notesKey.isEmpty() || vaultKey.isEmpty()) {
        m_vaultLockError = "The required module keys are unavailable; the master password was not removed.";
        emit vaultLockErrorChanged();
        return false;
    }

    QVector<PasswordRemovalFileMigration> fileMigrations;
    QVector<PasswordRemovalAssetMigration> assetMigrations;
    if (!preparePasswordRemovalAssets(fileMigrations, assetMigrations)) return false;

    auto restoreEncryptedFiles = [&fileMigrations, &assetMigrations]() {
        for (PasswordRemovalFileMigration &migration : fileMigrations) {
            if (migration.plaintextInstalled) QFile::remove(migration.sourcePath);
            if (migration.backupMoved) QFile::rename(migration.backupPath, migration.sourcePath);
            if (!migration.temporaryPath.isEmpty()) QFile::remove(migration.temporaryPath);
        }
        for (PasswordRemovalAssetMigration &migration : assetMigrations) {
            if (migration.plaintextInstalled) QFile::remove(migration.sourcePath);
            if (migration.backupMoved) QFile::rename(migration.backupPath, migration.sourcePath);
            if (!migration.temporaryPath.isEmpty()) QFile::remove(migration.temporaryPath);
        }
    };

    for (PasswordRemovalFileMigration &migration : fileMigrations) {
        if (migration.temporaryPath.isEmpty()) continue;
        migration.backupPath = migration.sourcePath + ".enc-backup-" + generateUuid();
        if (!QFile::rename(migration.sourcePath, migration.backupPath)) {
            restoreEncryptedFiles();
            m_vaultLockError = "Could not stage local files safely; the master password was not removed.";
            emit vaultLockErrorChanged();
            return false;
        }
        migration.backupMoved = true;
        if (!QFile::rename(migration.temporaryPath, migration.sourcePath)) {
            restoreEncryptedFiles();
            m_vaultLockError = "Could not install decrypted local files safely; the master password was not removed.";
            emit vaultLockErrorChanged();
            return false;
        }
        migration.plaintextInstalled = true;
    }
    for (PasswordRemovalAssetMigration &migration : assetMigrations) {
        migration.backupPath = migration.sourcePath + ".enc-backup-" + generateUuid();
        if (!QFile::rename(migration.sourcePath, migration.backupPath)) {
            restoreEncryptedFiles();
            m_vaultLockError = "Could not stage local encrypted assets safely; the master password was not removed.";
            emit vaultLockErrorChanged();
            return false;
        }
        migration.backupMoved = true;
        if (!QFile::rename(migration.temporaryPath, migration.sourcePath)) {
            restoreEncryptedFiles();
            m_vaultLockError = "Could not install decrypted local assets safely; the master password was not removed.";
            emit vaultLockErrorChanged();
            return false;
        }
        migration.plaintextInstalled = true;
    }

    if (!executeSql("BEGIN IMMEDIATE;")) {
        restoreEncryptedFiles();
        m_vaultLockError = "Could not start the key removal transaction.";
        emit vaultLockErrorChanged();
        return false;
    }
    bool migrationSaved = true;
    for (const PasswordRemovalFileMigration &migration : fileMigrations) {
        const QVariant localPath = migration.localPath.isEmpty() ? QVariant() : QVariant(migration.localPath);
        const QVariant driveId = migration.driveFileId.isEmpty() ? QVariant() : QVariant(migration.driveFileId);
        if (executeSqlPrepared(
                "UPDATE files SET local_path = ?1, drive_file_id = ?2, updated_at = ?3 WHERE id = ?4",
                {localPath, driveId, currentTimestamp(), migration.id}) != 1) {
            migrationSaved = false;
            break;
        }
    }
    if (!migrationSaved) {
        executeSql("ROLLBACK;");
        restoreEncryptedFiles();
        m_vaultLockError = "Could not save local file metadata; the master password was not removed.";
        emit vaultLockErrorChanged();
        return false;
    }

    if (!notesKey.isEmpty()) {
        QJsonArray pagesToDecrypt = executeQuery("SELECT id, encrypted_content FROM pages WHERE encrypted_content IS NOT NULL AND encrypted_content != ''");
        for (const QJsonValue &pv : pagesToDecrypt) {
            QJsonObject po = pv.toObject();
            QString pid = po.value("id").toString();
            QString enc = po.value("encrypted_content").toString();
            QString dec = decryptContent(notesKey, enc);
            if (dec.isNull() || executeSqlPrepared(
                    "UPDATE pages SET content = ?1, encrypted_content = NULL WHERE id = ?2",
                    {dec, pid}) != 1) {
                migrationSaved = false;
                break;
            }
        }

        QJsonArray historyToDecrypt = executeQuery(
            "SELECT id, encrypted_content FROM page_history WHERE encrypted_content IS NOT NULL AND encrypted_content != ''");
        for (const QJsonValue &value : historyToDecrypt) {
            if (!migrationSaved) break;
            const QJsonObject row = value.toObject();
            const QString decrypted = decryptContent(notesKey, row.value("encrypted_content").toString());
            if (decrypted.isNull() || executeSqlPrepared(
                    "UPDATE page_history SET content = ?1, encrypted_content = NULL WHERE id = ?2",
                    {decrypted, row.value("id").toString()}) != 1) {
                migrationSaved = false;
            }
        }

        QJsonArray diagramsToDecrypt = executeQuery("SELECT id, encrypted_content FROM diagrams WHERE encrypted_content IS NOT NULL AND encrypted_content != ''");
        for (const QJsonValue &dv : diagramsToDecrypt) {
            if (!migrationSaved) break;
            QJsonObject do_ = dv.toObject();
            QString did = do_.value("id").toString();
            QString enc = do_.value("encrypted_content").toString();
            QString dec = decryptContent(notesKey, enc);
            if (dec.isNull() || executeSqlPrepared(
                    "UPDATE diagrams SET content = ?1, encrypted_content = NULL WHERE id = ?2",
                    {dec, did}) != 1) {
                migrationSaved = false;
            }
        }
    }

    if (!vaultKey.isEmpty()) {
        const QJsonArray vaultGroups = executeQuery("SELECT id, name, icon, color FROM vault_groups");
        for (const QJsonValue &value : vaultGroups) {
            if (!migrationSaved) break;
            const QJsonObject row = value.toObject();
            const QString name = decryptContent(vaultKey, row.value("name").toString());
            const QString icon = row.value("icon").isNull()
                ? QStringLiteral("") : decryptContent(vaultKey, row.value("icon").toString());
            const QString color = row.value("color").isNull()
                ? QStringLiteral("") : decryptContent(vaultKey, row.value("color").toString());
            if (name.isNull() || icon.isNull() || color.isNull()) {
                migrationSaved = false;
                break;
            }
            const QVariant iconValue = row.value("icon").isNull() ? QVariant() : QVariant(icon);
            const QVariant colorValue = row.value("color").isNull() ? QVariant() : QVariant(color);
            migrationSaved = executeSqlPrepared(
                "UPDATE vault_groups SET name = ?1, icon = ?2, color = ?3 WHERE id = ?4",
                {name, iconValue, colorValue, row.value("id").toString()}) == 1;
        }

        QJsonArray vaultToDecrypt = executeQuery(
            "SELECT id, label, username, email, password, url, notes, custom_fields FROM vault_items");
        for (const QJsonValue &vv : vaultToDecrypt) {
            if (!migrationSaved) break;
            QJsonObject vo = vv.toObject();
            QString vid = vo.value("id").toString();
            const QString decLabel = decryptContent(vaultKey, vo.value("label").toString());
            const QString decUser = decryptContent(vaultKey, vo.value("username").toString());
            const QString decEmail = decryptContent(vaultKey, vo.value("email").toString());
            const QString decPass = decryptContent(vaultKey, vo.value("password").toString());
            const QString decUrl = decryptContent(vaultKey, vo.value("url").toString());
            const QString decNotes = decryptContent(vaultKey, vo.value("notes").toString());
            const QString decCustom = decryptContent(vaultKey, vo.value("custom_fields").toString());

            if (decLabel.isNull() || decUser.isNull() || decEmail.isNull() || decPass.isNull() ||
                decUrl.isNull() || decNotes.isNull() || decCustom.isNull() ||
                executeSqlPrepared(
                    "UPDATE vault_items SET label = ?1, username = ?2, email = ?3, password = ?4, "
                    "url = ?5, notes = ?6, custom_fields = ?7 WHERE id = ?8",
                    {decLabel, decUser, decEmail, decPass, decUrl, decNotes, decCustom, vid}) != 1) {
                migrationSaved = false;
            }
        }

        QJsonArray passwordHistory = executeQuery("SELECT id, password FROM vault_password_history");
        for (const QJsonValue &value : passwordHistory) {
            if (!migrationSaved) break;
            const QJsonObject row = value.toObject();
            const QString decrypted = decryptContent(vaultKey, row.value("password").toString());
            if (decrypted.isNull() || executeSqlPrepared(
                    "UPDATE vault_password_history SET password = ?1 WHERE id = ?2",
                    {decrypted, row.value("id").toString()}) != 1) {
                migrationSaved = false;
            }
        }
    }

    if (migrationSaved) migrationSaved = executeSql("DELETE FROM keychain;");
    if (migrationSaved) migrationSaved = executeSql("COMMIT;");
    if (!migrationSaved) {
        executeSql("ROLLBACK;");
        restoreEncryptedFiles();
        m_vaultLockError = "Could not commit decrypted content; the master password was not removed.";
        emit vaultLockErrorChanged();
        return false;
    }
    for (const PasswordRemovalFileMigration &migration : fileMigrations) {
        if (!migration.backupPath.isEmpty()) QFile::remove(migration.backupPath);
    }
    for (const PasswordRemovalAssetMigration &migration : assetMigrations) {
        if (!migration.backupPath.isEmpty()) QFile::remove(migration.backupPath);
    }

    if (m_pendingPreviewFile) {
        m_cancelPreviewRequested = true;
        if (m_activeFileOperation) synapse_file_operation_cancel(m_activeFileOperation);
    }
    for (QTemporaryFile *previewFile : m_filePreviewFiles) delete previewFile;
    m_filePreviewFiles.clear();
    emit filePreviewsInvalidated();
    clearUnlockedKeys();
    m_isVaultConfigured = false;
    m_isVaultUnlocked = false;
    clearStats();
    m_autoLockTimer->stop();
    m_vaultLockError = "";

    emit vaultLockErrorChanged();
    emit vaultStateChanged();
    return true;
}

