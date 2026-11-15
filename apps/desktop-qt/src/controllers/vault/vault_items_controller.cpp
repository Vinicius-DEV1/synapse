#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>

// Native encrypted credential persistence delegated to synapse_vault_* domain APIs.

QVariantList SynapseDataController::getVaultItems(const QString &groupId) {
    if (!m_db || (m_isVaultConfigured && !m_isVaultUnlocked)) {
        return {};
    }

    const QByteArray groupBytes = groupId.trimmed().toUtf8();
    const char *groupPtr = groupBytes.isEmpty() ? nullptr : groupBytes.constData();

    char *jsonStr = synapse_vault_get_items(m_db, groupPtr);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);

    const QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    if (m_isVaultConfigured && vKey.isEmpty()) return {};

    QVariantList list;
    for (const QJsonValue &val : doc.array()) {
        QJsonObject item = val.toObject();
        if (!vKey.isEmpty()) {
            bool decryptionFailed = false;
            auto tryDec = [&](const QString &key) {
                const QString valStr = item.value(key).toString();
                if (!valStr.isEmpty() && valStr.count(':') == 2) {
                    const QString dec = decryptContent(vKey, valStr);
                    if (dec.isNull()) {
                        decryptionFailed = true;
                    } else {
                        item[key] = dec;
                    }
                }
            };
            tryDec("label");
            tryDec("username");
            tryDec("email");
            tryDec("password");
            tryDec("url");
            tryDec("notes");
            tryDec("custom_fields");
            if (decryptionFailed) item["decryption_error"] = true;
        }
        if (!item.contains("login_type") || item.value("login_type").toString().isEmpty()) {
            item["login_type"] = QStringLiteral("password");
        }
        list.append(item.toVariantMap());
    }
    return list;
}

bool SynapseDataController::saveVaultItem(const QString &id, const QString &groupId, const QString &label,
                                         const QString &username, const QString &email, const QString &password,
                                         const QString &url, const QString &notes, const QString &customFields,
                                         const QString &loginType) {
    if (!m_db || (m_isVaultConfigured && !m_isVaultUnlocked)) return false;
    const QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    if (m_isVaultConfigured && vKey.isEmpty()) return false;

    QString sLabel = label;
    QString sUser = username;
    QString sEmail = email;
    QString sPass = password;
    QString sUrl = url;
    QString sNotes = notes;
    QString sCustom = customFields;
    QString sLogin = loginType.trimmed().isEmpty() ? QStringLiteral("password") : loginType.trimmed();

    if (m_isVaultConfigured && m_isVaultUnlocked && !vKey.isEmpty()) {
        sLabel = encryptContent(vKey, label);
        if (sLabel.isNull()) return false;
        if (!username.isEmpty()) { sUser = encryptContent(vKey, username); if (sUser.isNull()) return false; }
        if (!email.isEmpty()) { sEmail = encryptContent(vKey, email); if (sEmail.isNull()) return false; }
        if (!password.isEmpty()) { sPass = encryptContent(vKey, password); if (sPass.isNull()) return false; }
        if (!url.isEmpty()) { sUrl = encryptContent(vKey, url); if (sUrl.isNull()) return false; }
        if (!notes.isEmpty()) { sNotes = encryptContent(vKey, notes); if (sNotes.isNull()) return false; }
        if (!customFields.isEmpty()) { sCustom = encryptContent(vKey, customFields); if (sCustom.isNull()) return false; }
    }

    const QByteArray idBytes = id.trimmed().toUtf8();
    const QByteArray groupBytes = groupId.trimmed().toUtf8();
    const QByteArray labelBytes = sLabel.trimmed().toUtf8();
    const QByteArray userBytes = sUser.trimmed().toUtf8();
    const QByteArray emailBytes = sEmail.trimmed().toUtf8();
    const QByteArray passBytes = sPass.trimmed().toUtf8();
    const QByteArray urlBytes = sUrl.trimmed().toUtf8();
    const QByteArray notesBytes = sNotes.trimmed().toUtf8();
    const QByteArray customBytes = sCustom.trimmed().toUtf8();
    const QByteArray loginBytes = sLogin.toUtf8();

    const int ret = synapse_vault_save_item_extended(
        m_db,
        idBytes.isEmpty() ? nullptr : idBytes.constData(),
        groupBytes.isEmpty() ? nullptr : groupBytes.constData(),
        labelBytes.constData(),
        userBytes.isEmpty() ? nullptr : userBytes.constData(),
        emailBytes.isEmpty() ? nullptr : emailBytes.constData(),
        passBytes.isEmpty() ? nullptr : passBytes.constData(),
        urlBytes.isEmpty() ? nullptr : urlBytes.constData(),
        notesBytes.isEmpty() ? nullptr : notesBytes.constData(),
        customBytes.isEmpty() ? nullptr : customBytes.constData(),
        loginBytes.constData(),
        0
    );

    if (ret == 1) {
        refreshStats();
        emit vaultStateChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteVaultItem(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const int ret = synapse_vault_delete_item(m_db, itemId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        emit vaultStateChanged();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getPasswordHistory(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return {};
    if (m_isVaultConfigured && !m_isVaultUnlocked) return {};

    const QByteArray idBytes = itemId.trimmed().toUtf8();
    char *jsonStr = synapse_vault_get_password_history(m_db, idBytes.constData());
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);

    const QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    QVariantList list;
    for (const QJsonValue &val : doc.array()) {
        QJsonObject entry = val.toObject();
        if (!vKey.isEmpty()) {
            const QString passStr = entry.value("password").toString();
            if (!passStr.isEmpty() && passStr.count(':') == 2) {
                const QString dec = decryptContent(vKey, passStr);
                if (!dec.isNull()) {
                    entry["password"] = dec;
                }
            }
        }
        list.append(entry.toVariantMap());
    }
    return list;
}

QString SynapseDataController::generateSecurePassword(int length, bool uppercase, bool lowercase, bool numbers, bool symbols) {
    QString pool;
    if (uppercase) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) pool += "abcdefghijklmnopqrstuvwxyz";
    if (numbers) pool += "0123456789";
    if (symbols) pool += "!@#$%^&*()-_=+[]{}<>?~";
    if (pool.isEmpty()) pool = "abcdefghijklmnopqrstuvwxyz0123456789";

    QString result;
    result.reserve(length);
    auto *rng = QRandomGenerator::global();
    for (int i = 0; i < length; ++i) {
        int idx = rng->bounded(pool.length());
        result.append(pool.at(idx));
    }
    return result;
}
