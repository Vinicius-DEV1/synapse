#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <cmath>
#include <functional>

// Native encrypted credential and group persistence.


QVariantList SynapseDataController::getVaultGroups() {
    const QJsonArray rows = executeQuery(
        "SELECT id, name, icon, color, position FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, name ASC");
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
    if (m_isVaultConfigured && !m_isVaultUnlocked) {
        return QVariantList();
    }

    const QString sql = groupId.isEmpty()
        ? "SELECT id, group_id, label, username, email, password, url, notes, is_favorite FROM vault_items WHERE deleted_at IS NULL ORDER BY label ASC LIMIT 100"
        : "SELECT id, group_id, label, username, email, password, url, notes, is_favorite FROM vault_items WHERE deleted_at IS NULL AND group_id = ?1 ORDER BY label ASC LIMIT 100";
    QJsonArray arr = groupId.isEmpty() ? executeQuery(sql) : executeQueryPrepared(sql, {groupId});
    QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    if (m_isVaultConfigured && vKey.isEmpty()) return {};

    QVariantList list;
    for (const QJsonValue &val : arr) {
        QJsonObject item = val.toObject();
        if (!vKey.isEmpty()) {
            bool decryptionFailed = false;
            auto tryDec = [&](const QString &key) {
                const QString val = item.value(key).toString();
                if (!val.isEmpty()) {
                    if (val.count(':') == 2) {
                        const QString dec = decryptContent(vKey, val);
                        if (dec.isNull()) {
                            decryptionFailed = true;
                        } else {
                            item[key] = dec;
                        }
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

bool SynapseDataController::saveVaultItem(const QString &id, const QString &groupId, const QString &label, const QString &username, const QString &email, const QString &password, const QString &url, const QString &notes) {
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;
    QString ts = currentTimestamp();
    QString vKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
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

    if (id.isEmpty()) {
        const QString newId = generateUuid();
        const int inserted = executeSqlPrepared(
            "INSERT INTO vault_items (id, group_id, label, username, email, password, url, notes, is_favorite, created_at, updated_at) "
            "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9, ?9)",
            {newId, groupId, sLabel, sUser, sEmail, sPass, sUrl, sNotes, ts});
        if (inserted != 1) return false;
    } else {
        const int updated = executeSqlPrepared(
            "UPDATE vault_items SET group_id = ?1, label = ?2, username = ?3, email = ?4, password = ?5, "
            "url = ?6, notes = ?7, updated_at = ?8 WHERE id = ?9 AND deleted_at IS NULL",
            {groupId, sLabel, sUser, sEmail, sPass, sUrl, sNotes, ts, id});
        if (updated != 1) return false;
    }
    refreshStats();
    return true;
}

bool SynapseDataController::deleteVaultItem(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE vault_items SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(itemId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
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

