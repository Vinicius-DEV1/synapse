#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native Vault Group CRUD delegated to synapse_vault_* domain APIs.

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

QString SynapseDataController::createVaultGroup(const QString &name, const QString &icon, const QString &color) {
    if (!m_db || name.trimmed().isEmpty()) return QString();
    if (m_isVaultConfigured && !m_isVaultUnlocked) return QString();

    const QString vaultKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    QString encName = name.trimmed();
    QString encIcon = icon.trimmed();
    QString encColor = color.trimmed().isEmpty() ? QStringLiteral("#3b82f6") : color.trimmed();

    if (m_isVaultConfigured && !vaultKey.isEmpty()) {
        encName = encryptContent(vaultKey, encName);
        if (encName.isNull()) return QString();
        if (!encIcon.isEmpty()) {
            encIcon = encryptContent(vaultKey, encIcon);
            if (encIcon.isNull()) return QString();
        }
        if (!encColor.isEmpty()) {
            encColor = encryptContent(vaultKey, encColor);
            if (encColor.isNull()) return QString();
        }
    }

    const QByteArray nameBytes = encName.toUtf8();
    const QByteArray iconBytes = encIcon.toUtf8();
    const QByteArray colorBytes = encColor.toUtf8();

    char *idStr = synapse_vault_create_group(
        m_db,
        nameBytes.constData(),
        iconBytes.isEmpty() ? nullptr : iconBytes.constData(),
        colorBytes.isEmpty() ? nullptr : colorBytes.constData()
    );

    if (!idStr) return QString();
    const QString id = QString::fromUtf8(idStr);
    synapse_free_string(idStr);

    refreshStats();
    emit vaultStateChanged();
    return id;
}

bool SynapseDataController::updateVaultGroup(const QString &id, const QString &name, const QString &icon, const QString &color, int position) {
    if (!m_db || id.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;

    const QString vaultKey = m_unlockedKeys.value("vault", m_unlockedKeys.value("notes"));
    QString encName = name.trimmed();
    QString encIcon = icon.trimmed();
    QString encColor = color.trimmed();

    if (m_isVaultConfigured && !vaultKey.isEmpty()) {
        encName = encryptContent(vaultKey, encName);
        if (encName.isNull()) return false;
        if (!encIcon.isEmpty()) {
            encIcon = encryptContent(vaultKey, encIcon);
            if (encIcon.isNull()) return false;
        }
        if (!encColor.isEmpty()) {
            encColor = encryptContent(vaultKey, encColor);
            if (encColor.isNull()) return false;
        }
    }

    const QByteArray idBytes = id.trimmed().toUtf8();
    const QByteArray nameBytes = encName.toUtf8();
    const QByteArray iconBytes = encIcon.toUtf8();
    const QByteArray colorBytes = encColor.toUtf8();

    const int ret = synapse_vault_update_group(
        m_db,
        idBytes.constData(),
        nameBytes.constData(),
        iconBytes.isEmpty() ? nullptr : iconBytes.constData(),
        colorBytes.isEmpty() ? nullptr : colorBytes.constData(),
        position
    );

    if (ret == 1) {
        refreshStats();
        emit vaultStateChanged();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteVaultGroup(const QString &id) {
    if (!m_db || id.trimmed().isEmpty()) return false;
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;

    const QByteArray idBytes = id.trimmed().toUtf8();
    const int ret = synapse_vault_delete_group(m_db, idBytes.constData());

    if (ret == 1) {
        refreshStats();
        emit vaultStateChanged();
        return true;
    }
    return false;
}
