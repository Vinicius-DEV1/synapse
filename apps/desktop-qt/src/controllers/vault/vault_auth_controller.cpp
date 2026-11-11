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

// Vault unlock, lock, and initial keychain setup.

// Vault unlock and in-memory key lifecycle.

namespace {

constexpr int FailedUnlockThreshold = 3;
constexpr int FailedUnlockCooldownSeconds = 15;

struct AuthPasswordBytesWiper {
    QByteArray &value;
    ~AuthPasswordBytesWiper() {
        if (!value.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(value.data()),
                                       static_cast<size_t>(value.size()));
        }
    }
};

struct AuthMasterKeyWiper {
    uint8_t *value;
    ~AuthMasterKeyWiper() { synapse_crypto_wipe_memory(value, 32); }
};

struct AuthQStringWiper {
    QString &value;
    ~AuthQStringWiper() { value.fill(QChar(0)); }
};

struct UnlockedKeyMapWiper {
    QMap<QString, QString> &value;
    ~UnlockedKeyMapWiper() {
        for (auto it = value.begin(); it != value.end(); ++it) it.value().fill(QChar(0));
        value.clear();
    }
};

}

int SynapseDataController::vaultUnlockRemainingSeconds() const {
    QSettings settings;
    const int failedAttempts = settings.value("security/masterPassword/failedAttempts", 0).toInt();
    if (failedAttempts <= 0 || failedAttempts % FailedUnlockThreshold != 0) return 0;

    const qint64 lastFailedAt = settings.value("security/masterPassword/lastFailedAt", 0).toLongLong();
    const qint64 elapsed = qMax<qint64>(0, QDateTime::currentSecsSinceEpoch() - lastFailedAt);
    return qMax(0, FailedUnlockCooldownSeconds - static_cast<int>(elapsed));
}

void SynapseDataController::refreshVaultLockout() {
    if (vaultUnlockRemainingSeconds() == 0 &&
        m_vaultLockError.startsWith(QStringLiteral("Too many failed attempts."))) {
        m_vaultLockError.clear();
        emit vaultLockErrorChanged();
    }
    emit vaultLockoutChanged();
}

void SynapseDataController::recordFailedVaultUnlock() {
    QSettings settings;
    const int attempts = settings.value("security/masterPassword/failedAttempts", 0).toInt() + 1;
    settings.setValue("security/masterPassword/failedAttempts", attempts);
    settings.setValue("security/masterPassword/lastFailedAt", QDateTime::currentSecsSinceEpoch());
    settings.sync();
    emit vaultLockoutChanged();
}

void SynapseDataController::clearFailedVaultUnlocks() {
    QSettings settings;
    settings.remove("security/masterPassword/failedAttempts");
    settings.remove("security/masterPassword/lastFailedAt");
    settings.sync();
    emit vaultLockoutChanged();
}

bool SynapseDataController::unlockVault(const QString &password) {
    if (password.trimmed().isEmpty()) {
        m_vaultLockError = "Enter the master password.";
        emit vaultLockErrorChanged();
        return false;
    }

    const int lockoutRemaining = vaultUnlockRemainingSeconds();
    if (lockoutRemaining > 0) {
        m_vaultLockError = QStringLiteral("Too many failed attempts. Try again in %1 seconds.").arg(lockoutRemaining);
        emit vaultLockErrorChanged();
        return false;
    }

    const auto reportPasswordFailure = [this](const QString &message) {
        recordFailedVaultUnlock();
        const int remaining = vaultUnlockRemainingSeconds();
        m_vaultLockError = remaining > 0
            ? QStringLiteral("Too many failed attempts. Try again in %1 seconds.").arg(remaining)
            : message;
        emit vaultLockErrorChanged();
        return false;
    };

    const QJsonArray rows = executeQuery(
        "SELECT id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, anki_key_enc, "
        "focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc "
        "FROM keychain LIMIT 1");
    if (rows.isEmpty()) {
        m_vaultLockError = "The vault is not configured on this device.";
        emit vaultLockErrorChanged();
        return false;
    }

    QByteArray passwordBytes = password.toUtf8();
    AuthPasswordBytesWiper passwordWiper{passwordBytes};
    uint8_t masterKey[32]{};
    AuthMasterKeyWiper masterKeyWiper{masterKey};
    if (synapse_crypto_derive_master_key(passwordBytes.constData(), masterKey) != 0) {
        m_vaultLockError = "Could not derive the encryption key.";
        emit vaultLockErrorChanged();
        return false;
    }

    const QJsonObject keychain = rows.first().toObject();
    const QStringList moduleNames = {
        "library", "finance", "notes", "culture", "anki", "focus", "files", "vault",
        "calendar", "practice", "core"
    };
    const QStringList envelopeNames = {
        "library_key_enc", "finance_key_enc", "notes_key_enc", "culture_key_enc", "anki_key_enc",
        "focus_key_enc", "files_key_enc", "vault_key_enc", "calendar_key_enc", "practice_key_enc", "core_key_enc"
    };
    QMap<QString, QString> recoveredKeys;
    UnlockedKeyMapWiper recoveredKeyWiper{recoveredKeys};
    bool verifiedEnvelope = false;
    for (qsizetype index = 0; index < moduleNames.size(); ++index) {
        const QString envelope = keychain.value(envelopeNames.at(index)).toString();
        if (envelope.isEmpty()) continue;
        const QByteArray envelopeBytes = envelope.toUtf8();
        char *rawKey = synapse_crypto_decrypt_module_key(envelopeBytes.constData(), masterKey);
        if (!rawKey) {
            return reportPasswordFailure("The password is incorrect or the keychain is damaged.");
        }
        QString moduleKey = QString::fromUtf8(rawKey);
        synapse_free_secret_string(rawKey);
        if (moduleKey.size() != 64) {
            moduleKey.fill(QChar(0));
            m_vaultLockError = "The keychain contains an invalid module key.";
            emit vaultLockErrorChanged();
            return false;
        }
        recoveredKeys.insert(moduleNames.at(index), std::move(moduleKey));
        verifiedEnvelope = true;
    }
    if (!verifiedEnvelope) {
        return reportPasswordFailure("The keychain contains no usable module keys.");
    }

    clearFailedVaultUnlocks();

    QString fallbackKey = recoveredKeys.value("notes");
    if (fallbackKey.isEmpty()) fallbackKey = recoveredKeys.first();
    AuthQStringWiper fallbackKeyWiper{fallbackKey};
    for (const QString &moduleName : moduleNames) {
        if (!recoveredKeys.contains(moduleName)) recoveredKeys.insert(moduleName, fallbackKey);
    }

    QByteArray verifierPasswordBytes = password.toUtf8();
    AuthPasswordBytesWiper verifierPasswordWiper{verifierPasswordBytes};
    char *rawVerifier = synapse_crypto_hash_password_v2(verifierPasswordBytes.constData());
    if (!rawVerifier) {
        m_vaultLockError = "Could not update the password verifier.";
        emit vaultLockErrorChanged();
        return false;
    }
    const QString verifier = QString::fromUtf8(rawVerifier);
    synapse_free_string(rawVerifier);
    const bool verifierUpdated = keychain.value("auth_hash").toString() == verifier ||
        executeSqlPrepared("UPDATE keychain SET auth_hash = ?1 WHERE id = ?2",
                           {verifier, keychain.value("id").toString()}) == 1;
    if (!finishVaultSetupAssetMigrations()) {
        clearUnlockedKeys();
        m_isVaultUnlocked = false;
        emit vaultStateChanged();
        emit vaultLockErrorChanged();
        return false;
    }
    clearUnlockedKeys();
    m_unlockedKeys.swap(recoveredKeys);
    m_isVaultUnlocked = true;
    m_vaultLockError = verifierUpdated
        ? QString() : QStringLiteral("The vault opened, but its password verifier could not be upgraded.");
    emit vaultLockErrorChanged();
    emit vaultStateChanged();
    emit vaultUnlocked();
    if (m_autoLockMinutes > 0) m_autoLockTimer->start(m_autoLockMinutes * 60 * 1000);
    refreshStats();
    return true;
}
void SynapseDataController::lockVault() {
    if (!finishActiveLibraryReadingSession()) {
        qWarning() << "[SynapseDataController] Could not finalize the active library reading session before locking.";
    }
    if (m_librarySearchCancellation) {
        m_librarySearchCancellation->store(true, std::memory_order_relaxed);
    }
    cancelLibraryMetadataRequests();
    m_autoLockTimer->stop();
    if (m_activeFileOperation) {
        if (m_pendingPreviewFile) m_cancelPreviewRequested = true;
        synapse_file_operation_cancel(m_activeFileOperation);
    }
    for (QTemporaryFile *previewFile : m_filePreviewFiles) delete previewFile;
    m_filePreviewFiles.clear();
    emit filePreviewsInvalidated();
    clearUnlockedKeys();
    m_isVaultUnlocked = false;
    clearStats();
    m_vaultLockError = "";
    emit vaultLockErrorChanged();
    emit vaultStateChanged();
    emit vaultLocked();
}
