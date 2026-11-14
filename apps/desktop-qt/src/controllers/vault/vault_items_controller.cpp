#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>

// Native encrypted credential and group persistence delegated to synapse_vault_* domain APIs.

QVariantList SynapseDataController::getVaultGroups() {
    if (!m_db) return {};
    char *jsonStr = synapse_vault_get_groups(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);

    const QJsonArray rows = doc.array();
    QVariantList groups;
    const QString vaultKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    for (const QJsonValue &value : rows) {
        QJsonObject group = value.toObject();
        if (m_isVaultConfigured) {
            if (!m_isVaultUnlocked || vaultKey.isEmpty()) continue;
            bool failed = false;
            for (const QString &field : {QStringLiteral("name"), QStringLiteral("icon"), QStringLiteral("color")}) {
                const QString val = group.value(field).toString();
                if (val.isEmpty()) continue;
                // An AES-GCM encrypted envelope consists of 3 hex parts separated by colons (IV:Ciphertext:Tag)
                if (val.count(':') == 2) {
                    const QString decrypted = decryptContent(vaultKey, val);
                    if (!decrypted.isNull()) {
                        group[field] = decrypted;
                    } else {
                        failed = true;
                    }
                }
            }
            if (failed) group["decryption_error"] = true;
        }
        groups.append(group.toVariantMap());
    }
    return groups;
}

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
            if (decryptionFailed) item["decryption_error"] = true;
        }
        list.append(item.toVariantMap());
    }
    return list;
}

bool SynapseDataController::saveVaultItem(const QString &id, const QString &groupId, const QString &label,
                                         const QString &username, const QString &email, const QString &password,
                                         const QString &url, const QString &notes) {
    if (!m_db || (m_isVaultConfigured && !m_isVaultUnlocked)) return false;
    const QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    if (m_isVaultConfigured && vKey.isEmpty()) return false;

    QString sLabel = label;
    QString sUser = username;
    QString sEmail = email;
    QString sPass = password;
    QString sUrl = url;
    QString sNotes = notes;

    if (m_isVaultConfigured && m_isVaultUnlocked && !vKey.isEmpty()) {
        sLabel = encryptContent(vKey, label);
        if (sLabel.isNull()) return false;
        if (!username.isEmpty()) { sUser = encryptContent(vKey, username); if (sUser.isNull()) return false; }
        if (!email.isEmpty()) { sEmail = encryptContent(vKey, email); if (sEmail.isNull()) return false; }
        if (!password.isEmpty()) { sPass = encryptContent(vKey, password); if (sPass.isNull()) return false; }
        if (!url.isEmpty()) { sUrl = encryptContent(vKey, url); if (sUrl.isNull()) return false; }
        if (!notes.isEmpty()) { sNotes = encryptContent(vKey, notes); if (sNotes.isNull()) return false; }
    }

    const QByteArray idBytes = id.trimmed().toUtf8();
    const QByteArray groupBytes = groupId.trimmed().toUtf8();
    const QByteArray labelBytes = sLabel.trimmed().toUtf8();
    const QByteArray userBytes = sUser.trimmed().toUtf8();
    const QByteArray emailBytes = sEmail.trimmed().toUtf8();
    const QByteArray passBytes = sPass.trimmed().toUtf8();
    const QByteArray urlBytes = sUrl.trimmed().toUtf8();
    const QByteArray notesBytes = sNotes.trimmed().toUtf8();

    const int ret = synapse_vault_save_item(
        m_db,
        idBytes.isEmpty() ? nullptr : idBytes.constData(),
        groupBytes.isEmpty() ? nullptr : groupBytes.constData(),
        labelBytes.constData(),
        userBytes.isEmpty() ? nullptr : userBytes.constData(),
        emailBytes.isEmpty() ? nullptr : emailBytes.constData(),
        passBytes.isEmpty() ? nullptr : passBytes.constData(),
        urlBytes.isEmpty() ? nullptr : urlBytes.constData(),
        notesBytes.isEmpty() ? nullptr : notesBytes.constData(),
        0
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteVaultItem(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const int ret = synapse_vault_delete_item(m_db, itemId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
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
