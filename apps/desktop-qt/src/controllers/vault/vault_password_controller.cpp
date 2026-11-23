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

// Master-password changes and credential strength checks.

namespace {

struct VaultPasswordBytesWiper {
    QByteArray &value;
    ~VaultPasswordBytesWiper() {
        if (!value.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(value.data()),
                                       static_cast<size_t>(value.size()));
        }
    }
};

struct VaultMasterKeyWiper {
    uint8_t *value;
    ~VaultMasterKeyWiper() { synapse_crypto_wipe_memory(value, 32); }
};

struct VaultQStringWiper {
    QString &value;
    ~VaultQStringWiper() { value.fill(QChar(0)); }
};

}

bool SynapseDataController::changeMasterPassword(const QString &oldPassword, const QString &newPassword) {
    const auto fail = [this](const QString &message) {
        m_vaultLockError = message;
        emit vaultLockErrorChanged();
        return false;
    };
    if (newPassword.trimmed().size() < 6) {
        return fail("The new master password must contain at least six characters.");
    }

    QByteArray oldPasswordBytes = oldPassword.toUtf8();
    QByteArray newPasswordBytes = newPassword.toUtf8();
    VaultPasswordBytesWiper oldPasswordWiper{oldPasswordBytes};
    VaultPasswordBytesWiper newPasswordWiper{newPasswordBytes};
    uint8_t oldKey[32]{};
    uint8_t newKey[32]{};
    VaultMasterKeyWiper oldKeyWiper{oldKey};
    VaultMasterKeyWiper newKeyWiper{newKey};
    if (synapse_crypto_derive_master_key(oldPasswordBytes.constData(), oldKey) != 0) {
        return fail("Could not derive the current master key.");
    }

    const QJsonArray rows = executeQuery(
        "SELECT id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, "
        "anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, "
        "core_key_enc FROM keychain LIMIT 1");
    if (rows.isEmpty()) return fail("The vault is not configured.");
    const QJsonObject keychain = rows.first().toObject();

    auto unwrapModuleKey = [](const QString &envelope, const uint8_t *masterKey, QString *moduleKey) {
        if (envelope.isEmpty() || !moduleKey) return false;
        const QByteArray envelopeBytes = envelope.toUtf8();
        char *rawKey = synapse_crypto_decrypt_module_key(envelopeBytes.constData(), masterKey);
        if (!rawKey) return false;
        *moduleKey = QString::fromUtf8(rawKey);
        synapse_free_secret_string(rawKey);
        return moduleKey->size() == 64;
    };
    auto wrapModuleKey = [](const QString &moduleKey, const uint8_t *masterKey, QString *envelope) {
        if (moduleKey.isEmpty() || !envelope) return false;
        QByteArray keyBytes = moduleKey.toUtf8();
        VaultPasswordBytesWiper keyWiper{keyBytes};
        char *rawEnvelope = synapse_crypto_encrypt_module_key(keyBytes.constData(), masterKey);
        if (!rawEnvelope) return false;
        *envelope = QString::fromUtf8(rawEnvelope);
        synapse_free_string(rawEnvelope);
        return !envelope->isEmpty();
    };

    const QStringList envelopeNames = {
        "library_key_enc", "finance_key_enc", "notes_key_enc", "culture_key_enc", "anki_key_enc",
        "focus_key_enc", "files_key_enc", "vault_key_enc", "calendar_key_enc", "practice_key_enc", "core_key_enc"
    };
    QString verifiedKey;
    QString verificationEnvelope;
    for (const QString &name : envelopeNames) {
        const QString candidate = keychain.value(name).toString();
        if (!candidate.isEmpty()) {
            verificationEnvelope = candidate;
            break;
        }
    }
    if (!unwrapModuleKey(verificationEnvelope, oldKey, &verifiedKey)) {
        return fail("The current password is incorrect or the keychain is damaged.");
    }
    VaultQStringWiper verifiedKeyWiper{verifiedKey};

    if (synapse_crypto_derive_master_key(newPasswordBytes.constData(), newKey) != 0) {
        return fail("Could not derive the new master key.");
    }

    QString notesKey = keychain.value("notes_key_enc").toString().isEmpty()
        ? verifiedKey : QString();
    VaultQStringWiper notesKeyWiper{notesKey};
    const QString notesEnvelope = keychain.value("notes_key_enc").toString();
    if (!notesEnvelope.isEmpty() && !unwrapModuleKey(notesEnvelope, oldKey, &notesKey)) {
        return fail("The notes key could not be unwrapped; the password was not changed.");
    }
    if (notesKey.isEmpty()) return fail("The keychain has no usable notes key.");

    auto rewrap = [&](const QString &name, QString *nextEnvelope) {
        const QString existingEnvelope = keychain.value(name).toString();
        QString moduleKey;
        VaultQStringWiper moduleKeyWiper{moduleKey};
        if (existingEnvelope.isEmpty()) {
            moduleKey = notesKey;
        } else if (!unwrapModuleKey(existingEnvelope, oldKey, &moduleKey)) {
            return false;
        }
        return wrapModuleKey(moduleKey, newKey, nextEnvelope);
    };

    QString libraryEnvelope;
    QString financeEnvelope;
    QString nextNotesEnvelope;
    QString cultureEnvelope;
    QString ankiEnvelope;
    QString focusEnvelope;
    QString filesEnvelope;
    QString vaultEnvelope;
    QString calendarEnvelope;
    QString practiceEnvelope;
    QString coreEnvelope;
    if (!rewrap("library_key_enc", &libraryEnvelope) ||
        !rewrap("finance_key_enc", &financeEnvelope) ||
        !rewrap("notes_key_enc", &nextNotesEnvelope) ||
        !rewrap("culture_key_enc", &cultureEnvelope) ||
        !rewrap("anki_key_enc", &ankiEnvelope) ||
        !rewrap("focus_key_enc", &focusEnvelope) ||
        !rewrap("files_key_enc", &filesEnvelope) ||
        !rewrap("vault_key_enc", &vaultEnvelope) ||
        !rewrap("calendar_key_enc", &calendarEnvelope) ||
        !rewrap("practice_key_enc", &practiceEnvelope) ||
        !rewrap("core_key_enc", &coreEnvelope)) {
        return fail("A module key could not be rewrapped; the password was not changed.");
    }

    char *rawHash = synapse_crypto_hash_password_v2(newPasswordBytes.constData());
    if (!rawHash) return fail("Could not create the new password verifier.");
    const QString newAuthHash = QString::fromUtf8(rawHash);
    synapse_free_string(rawHash);

    if (!executeSql("BEGIN IMMEDIATE;")) return fail("Could not start the password change transaction.");
    const int updated = executeSqlPrepared(
        "UPDATE keychain SET auth_hash = ?1, library_key_enc = ?2, finance_key_enc = ?3, notes_key_enc = ?4, "
        "culture_key_enc = ?5, anki_key_enc = ?6, focus_key_enc = ?7, files_key_enc = ?8, vault_key_enc = ?9, "
        "calendar_key_enc = ?10, practice_key_enc = ?11, core_key_enc = ?12 WHERE id = ?13",
        {newAuthHash, libraryEnvelope, financeEnvelope, nextNotesEnvelope, cultureEnvelope, ankiEnvelope,
         focusEnvelope, filesEnvelope, vaultEnvelope, calendarEnvelope, practiceEnvelope, coreEnvelope,
         keychain.value("id").toString()});
    if (updated != 1 || !executeSql("COMMIT;")) {
        executeSql("ROLLBACK;");
        return fail("Could not commit the password change; the old password remains active.");
    }
    m_vaultLockError.clear();
    emit vaultLockErrorChanged();
    emit vaultStateChanged();
    return true;
}

int SynapseDataController::checkPasswordStrength(const QString &password) {
    int len = password.length();
    bool hasUpper = false, hasLower = false, hasNum = false, hasSym = false;
    for (const QChar &ch : password) {
        if (ch.isUpper()) hasUpper = true;
        else if (ch.isLower()) hasLower = true;
        else if (ch.isDigit()) hasNum = true;
        else hasSym = true;
    }
    int score = 0;
    if (len > 8) score++;
    if (len >= 12) score++;
    if (hasUpper && hasLower) score++;
    if (hasNum && hasSym) score++;
    if (len >= 16 && (hasUpper || hasLower) && (hasNum || hasSym)) score = qMax(score, 4);
    if (score > 4) score = 4;
    QString lower = password.toLower();
    if (lower == "password" || lower == "123456" || lower == "12345678" || lower == "admin") {
        score = 0;
    }
    return score;
}

void SynapseDataController::cancelPasswordBreachCheck() {
    if (m_activeBreachReply) {
        m_activeBreachReply->abort();
        m_activeBreachReply->deleteLater();
        m_activeBreachReply = nullptr;
    }
}

void SynapseDataController::checkPasswordBreachAsync(const QString &password) {
    cancelPasswordBreachCheck();

    QVariantMap res;
    res["breached"] = false;
    res["count"] = 0;

    if (password.isEmpty()) {
        emit passwordBreachChecked(password, res);
        return;
    }

    QByteArray sha1 = QCryptographicHash::hash(password.toUtf8(), QCryptographicHash::Sha1).toHex().toUpper();
    if (sha1.length() < 5) {
        res["error"] = "Falha ao gerar hash SHA-1";
        emit passwordBreachChecked(password, res);
        return;
    }

    QString prefix = QString::fromLatin1(sha1.left(5));
    QString suffix = QString::fromLatin1(sha1.mid(5));

    if (!m_networkManager) {
        m_networkManager = new QNetworkAccessManager(this);
    }

    QNetworkRequest req(QUrl("https://api.pwnedpasswords.com/range/" + prefix));
    req.setHeader(QNetworkRequest::UserAgentHeader, "Synapse-Desktop/1.0");
    req.setAttribute(QNetworkRequest::Http2AllowedAttribute, true);

    QNetworkReply *reply = m_networkManager->get(req);
    m_activeBreachReply = reply;

    connect(reply, &QNetworkReply::finished, this, [this, reply, password, suffix]() {
        if (reply != m_activeBreachReply) {
            reply->deleteLater();
            return;
        }
        m_activeBreachReply = nullptr;

        QVariantMap result;
        result["breached"] = false;
        result["count"] = 0;

        if (reply->error() != QNetworkReply::NoError) {
            if (reply->error() != QNetworkReply::OperationCanceledError) {
                result["error"] = reply->errorString();
            }
            reply->deleteLater();
            emit passwordBreachChecked(password, result);
            return;
        }

        const QByteArray body = reply->readAll();
        reply->deleteLater();

        const QString text = QString::fromUtf8(body);
        const QStringList lines = text.split(QLatin1String("\r\n"), Qt::SkipEmptyParts);
        for (const QString &line : lines) {
            int idx = line.indexOf(':');
            if (idx != -1) {
                QString hashSuff = line.left(idx).trimmed();
                if (hashSuff.compare(suffix, Qt::CaseInsensitive) == 0) {
                    qint64 count = line.mid(idx + 1).trimmed().toLongLong();
                    result["breached"] = (count > 0);
                    result["count"] = count;
                    break;
                }
            }
        }
        emit passwordBreachChecked(password, result);
    });
}

QVariantMap SynapseDataController::checkPasswordBreach(const QString &password) {
    QVariantMap res;
    res["breached"] = false;
    res["count"] = 0;
    if (password.isEmpty()) return res;

    QByteArray sha1 = QCryptographicHash::hash(password.toUtf8(), QCryptographicHash::Sha1).toHex().toUpper();
    if (sha1.length() < 5) {
        res["error"] = "Falha ao gerar hash SHA-1";
        return res;
    }

    QString prefix = QString::fromLatin1(sha1.left(5));
    QString suffix = QString::fromLatin1(sha1.mid(5));

    QNetworkAccessManager mgr;
    QNetworkRequest req(QUrl("https://api.pwnedpasswords.com/range/" + prefix));
    req.setHeader(QNetworkRequest::UserAgentHeader, "Synapse-Desktop/1.0");
    req.setAttribute(QNetworkRequest::Http2AllowedAttribute, true);

    QEventLoop loop;
    QTimer timer;
    timer.setSingleShot(true);
    QObject::connect(&timer, &QTimer::timeout, &loop, &QEventLoop::quit);

    QNetworkReply *reply = mgr.get(req);
    QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    timer.start(5000); // 5s timeout
    loop.exec();

    if (timer.isActive()) {
        timer.stop();
    } else {
        reply->abort();
        reply->deleteLater();
        res["error"] = "Tempo limite excedido ao consultar base de senhas.";
        return res;
    }

    if (reply->error() != QNetworkReply::NoError) {
        res["error"] = reply->errorString();
        reply->deleteLater();
        return res;
    }

    QByteArray body = reply->readAll();
    reply->deleteLater();

    QString text = QString::fromUtf8(body);
    const QStringList lines = text.split(QLatin1String("\r\n"), Qt::SkipEmptyParts);
    for (const QString &line : lines) {
        int idx = line.indexOf(':');
        if (idx != -1) {
            QString hashSuff = line.left(idx).trimmed();
            if (hashSuff.compare(suffix, Qt::CaseInsensitive) == 0) {
                qint64 count = line.mid(idx + 1).trimmed().toLongLong();
                res["breached"] = (count > 0);
                res["count"] = count;
                break;
            }
        }
    }
    return res;
}

