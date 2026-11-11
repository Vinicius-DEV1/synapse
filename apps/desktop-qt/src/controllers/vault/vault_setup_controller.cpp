#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonObject>
#include <QtCore/QFile>
#include <QtCore/QRegularExpression>
#include <utility>

namespace {

struct MasterKeyWiper {
    uint8_t *value;
    ~MasterKeyWiper() { synapse_crypto_wipe_memory(value, 32); }
};

struct ByteArrayWiper {
    QByteArray &value;
    ~ByteArrayWiper() {
        if (!value.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(value.data()),
                                       static_cast<size_t>(value.size()));
        }
    }
};

struct QStringWiper {
    QString &value;
    ~QStringWiper() { value.fill(QChar(0)); }
};

bool looksLikeContentCiphertext(const QString &value) {
    static const QRegularExpression encryptedContentPattern(
        QStringLiteral("^[0-9a-fA-F]{24}:[0-9a-fA-F]{32}:[0-9a-fA-F]*$"));
    return encryptedContentPattern.match(value).hasMatch();
}

}

bool SynapseDataController::setupMasterPassword(const QString &password) {
    checkKeychainState();
    if (m_isVaultConfigured) {
        m_vaultLockError = "The master password is already configured.";
        emit vaultLockErrorChanged();
        return false;
    }
    if (password.trimmed().size() < 6) {
        m_vaultLockError = "The master password must contain at least six characters.";
        emit vaultLockErrorChanged();
        return false;
    }

    const auto fail = [this](const QString &message) {
        m_vaultLockError = message;
        emit vaultLockErrorChanged();
        return false;
    };

    QByteArray passwordBytes = password.toUtf8();
    ByteArrayWiper passwordWiper{passwordBytes};
    uint8_t masterKey[32]{};
    MasterKeyWiper masterKeyWiper{masterKey};
    if (synapse_crypto_derive_master_key(passwordBytes.constData(), masterKey) != 0) {
        return fail("Could not derive the master key.");
    }

    auto generateModuleKey = []() -> QString {
        char *rawKey = synapse_crypto_generate_module_key();
        if (!rawKey) return QString();
        QString key = QString::fromUtf8(rawKey);
        synapse_free_secret_string(rawKey);
        return key;
    };
    auto wrapModuleKey = [masterKey](const QString &key) -> QString {
        QByteArray keyBytes = key.toUtf8();
        ByteArrayWiper keyWiper{keyBytes};
        char *rawPayload = synapse_crypto_encrypt_module_key(keyBytes.constData(), masterKey);
        if (!rawPayload) return QString();
        QString payload = QString::fromUtf8(rawPayload);
        synapse_free_string(rawPayload);
        return payload;
    };

    QString libraryKey = generateModuleKey();
    QString financeKey = generateModuleKey();
    QString notesKey = generateModuleKey();
    QString cultureKey = generateModuleKey();
    QString ankiKey = generateModuleKey();
    QString focusKey = generateModuleKey();
    QString filesKey = generateModuleKey();
    QString vaultKey = generateModuleKey();
    QString calendarKey = generateModuleKey();
    QString practiceKey = generateModuleKey();
    QString coreKey = generateModuleKey();
    QStringWiper libraryKeyWiper{libraryKey};
    QStringWiper financeKeyWiper{financeKey};
    QStringWiper notesKeyWiper{notesKey};
    QStringWiper cultureKeyWiper{cultureKey};
    QStringWiper ankiKeyWiper{ankiKey};
    QStringWiper focusKeyWiper{focusKey};
    QStringWiper filesKeyWiper{filesKey};
    QStringWiper vaultKeyWiper{vaultKey};
    QStringWiper calendarKeyWiper{calendarKey};
    QStringWiper practiceKeyWiper{practiceKey};
    QStringWiper coreKeyWiper{coreKey};
    if (libraryKey.isEmpty() || financeKey.isEmpty() || notesKey.isEmpty() ||
        cultureKey.isEmpty() || ankiKey.isEmpty() || focusKey.isEmpty() ||
        filesKey.isEmpty() || vaultKey.isEmpty() || calendarKey.isEmpty() ||
        practiceKey.isEmpty() || coreKey.isEmpty()) {
        return fail("Could not generate all module keys.");
    }

    const QString libraryEnvelope = wrapModuleKey(libraryKey);
    const QString financeEnvelope = wrapModuleKey(financeKey);
    const QString notesEnvelope = wrapModuleKey(notesKey);
    const QString cultureEnvelope = wrapModuleKey(cultureKey);
    const QString ankiEnvelope = wrapModuleKey(ankiKey);
    const QString focusEnvelope = wrapModuleKey(focusKey);
    const QString filesEnvelope = wrapModuleKey(filesKey);
    const QString vaultEnvelope = wrapModuleKey(vaultKey);
    const QString calendarEnvelope = wrapModuleKey(calendarKey);
    const QString practiceEnvelope = wrapModuleKey(practiceKey);
    const QString coreEnvelope = wrapModuleKey(coreKey);
    if (libraryEnvelope.isEmpty() || financeEnvelope.isEmpty() || notesEnvelope.isEmpty() ||
        cultureEnvelope.isEmpty() || ankiEnvelope.isEmpty() || focusEnvelope.isEmpty() ||
        filesEnvelope.isEmpty() || vaultEnvelope.isEmpty() || calendarEnvelope.isEmpty() ||
        practiceEnvelope.isEmpty() || coreEnvelope.isEmpty()) {
        return fail("Could not wrap all module keys.");
    }

    char *rawHash = synapse_crypto_hash_password_v2(passwordBytes.constData());
    if (!rawHash) return fail("Could not create the password verifier.");
    const QString authHash = QString::fromUtf8(rawHash);
    synapse_free_string(rawHash);

    QVector<VaultSetupAssetMigration> assetMigrations;
    if (!stageVaultSetupAssets(filesKey, libraryKey, cultureKey, assetMigrations)) return false;
    const auto removeStagedAssets = [&assetMigrations]() {
        for (const VaultSetupAssetMigration &migration : assetMigrations) QFile::remove(migration.stagedPath);
    };

    const QString keychainId = generateUuid();
    if (!executeSql("BEGIN IMMEDIATE;")) {
        removeStagedAssets();
        return fail("Could not start the vault setup transaction.");
    }

    bool migrationOk = executeSqlPrepared(
        "INSERT INTO keychain (id, auth_hash, library_key_enc, finance_key_enc, notes_key_enc, culture_key_enc, "
        "anki_key_enc, focus_key_enc, files_key_enc, vault_key_enc, calendar_key_enc, practice_key_enc, core_key_enc) "
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        {keychainId, authHash, libraryEnvelope, financeEnvelope, notesEnvelope, cultureEnvelope, ankiEnvelope,
         focusEnvelope, filesEnvelope, vaultEnvelope, calendarEnvelope, practiceEnvelope, coreEnvelope}) == 1;

    const auto encryptTableContent = [this](const QString &table, const QString &idColumn,
                                            const QString &plainColumn, const QString &encryptedColumn,
                                            const QString &moduleKey) -> bool {
        const QString query = QString("SELECT %1, %2, %3 FROM %4")
                                  .arg(idColumn, plainColumn, encryptedColumn, table);
        const QJsonArray rows = executeQuery(query);
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            const QString id = row.value(idColumn).toString();
            const QString plaintext = row.value(plainColumn).toString();
            const QString existingCiphertext = row.value(encryptedColumn).toString();
            if (!existingCiphertext.isEmpty()) return false;
            if (plaintext.isEmpty()) continue;
            const QString ciphertext = encryptContent(moduleKey, plaintext);
            if (ciphertext.isNull()) return false;
            const QString update = QString("UPDATE %1 SET %2 = '', %3 = ?1 WHERE %4 = ?2")
                                       .arg(table, plainColumn, encryptedColumn, idColumn);
            if (executeSqlPrepared(update, {ciphertext, id}) != 1) return false;
        }
        return true;
    };

    if (migrationOk) migrationOk = encryptTableContent("pages", "id", "content", "encrypted_content", notesKey);
    if (migrationOk) migrationOk = encryptTableContent("page_history", "id", "content", "encrypted_content", notesKey);
    if (migrationOk) migrationOk = encryptTableContent("diagrams", "id", "content", "encrypted_content", notesKey);

    if (migrationOk) {
        const QJsonArray rows = executeQuery(
            "SELECT id, local_path FROM files WHERE local_path IS NOT NULL AND local_path != ''");
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            const QString localPath = row.value("local_path").toString();
            if (looksLikeContentCiphertext(localPath)) {
                migrationOk = false;
                break;
            }
            const QString encryptedPath = encryptContent(filesKey, localPath);
            if (encryptedPath.isNull() || executeSqlPrepared(
                    "UPDATE files SET local_path = ?1 WHERE id = ?2", {encryptedPath, row.value("id").toString()}) != 1) {
                migrationOk = false;
                break;
            }
        }
    }

    if (migrationOk) {
        const QJsonArray rows = executeQuery(
            "SELECT id, label, username, email, password, url, notes, custom_fields FROM vault_items");
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            QString label = row.value("label").toString();
            QString username = row.value("username").toString();
            QString email = row.value("email").toString();
            QString passwordValue = row.value("password").toString();
            QString url = row.value("url").toString();
            QString notes = row.value("notes").toString();
            QString customFields = row.value("custom_fields").toString();
            QString *fields[] = {&label, &username, &email, &passwordValue, &url, &notes, &customFields};
            for (QString *field : fields) {
                if (field->isEmpty()) continue;
                if (looksLikeContentCiphertext(*field)) {
                    migrationOk = false;
                    break;
                }
                *field = encryptContent(vaultKey, *field);
                if (field->isNull()) {
                    migrationOk = false;
                    break;
                }
            }
            if (!migrationOk) break;
            migrationOk = executeSqlPrepared(
                "UPDATE vault_items SET label = ?1, username = ?2, email = ?3, password = ?4, url = ?5, "
                "notes = ?6, custom_fields = ?7 WHERE id = ?8",
                {label, username, email, passwordValue, url, notes, customFields, row.value("id").toString()}) == 1;
            if (!migrationOk) break;
        }
    }

    if (migrationOk) {
        const QJsonArray rows = executeQuery("SELECT id, name, icon, color FROM vault_groups");
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            QString name = row.value("name").toString();
            QString icon = row.value("icon").toString();
            QString color = row.value("color").toString();
            if (looksLikeContentCiphertext(name) || looksLikeContentCiphertext(icon) ||
                looksLikeContentCiphertext(color)) {
                migrationOk = false;
                break;
            }
            name = encryptContent(vaultKey, name);
            if (name.isNull()) {
                migrationOk = false;
                break;
            }
            if (!icon.isEmpty()) {
                icon = encryptContent(vaultKey, icon);
                if (icon.isNull()) {
                    migrationOk = false;
                    break;
                }
            }
            if (!color.isEmpty()) {
                color = encryptContent(vaultKey, color);
                if (color.isNull()) {
                    migrationOk = false;
                    break;
                }
            }
            const QVariant iconValue = row.value("icon").isNull() ? QVariant() : QVariant(icon);
            const QVariant colorValue = row.value("color").isNull() ? QVariant() : QVariant(color);
            if (executeSqlPrepared(
                    "UPDATE vault_groups SET name = ?1, icon = ?2, color = ?3 WHERE id = ?4",
                    {name, iconValue, colorValue, row.value("id").toString()}) != 1) {
                migrationOk = false;
                break;
            }
        }
    }

    if (migrationOk) {
        const QJsonArray rows = executeQuery("SELECT id, password FROM vault_password_history");
        for (const QJsonValue &value : rows) {
            const QJsonObject row = value.toObject();
            const QString passwordValue = row.value("password").toString();
            if (passwordValue.isEmpty()) continue;
            if (looksLikeContentCiphertext(passwordValue)) {
                migrationOk = false;
                break;
            }
            const QString ciphertext = encryptContent(vaultKey, passwordValue);
            if (ciphertext.isNull() || executeSqlPrepared(
                    "UPDATE vault_password_history SET password = ?1 WHERE id = ?2",
                    {ciphertext, row.value("id").toString()}) != 1) {
                migrationOk = false;
                break;
            }
        }
    }

    if (migrationOk) {
        for (const VaultSetupAssetMigration &migration : assetMigrations) {
            if (executeSqlPrepared(
                    "INSERT INTO vault_asset_migrations (id, target_path, staged_path) VALUES (?1, ?2, ?3)",
                    {migration.id, migration.targetPath, migration.stagedPath}) != 1) {
                migrationOk = false;
                break;
            }
        }
    }

    if (migrationOk) migrationOk = executeSql("COMMIT;");
    if (!migrationOk) {
        executeSql("ROLLBACK;");
        removeStagedAssets();
        return fail("Vault setup failed; existing data was left unchanged.");
    }

    m_isVaultConfigured = true;
    if (!finishVaultSetupAssetMigrations()) {
        clearUnlockedKeys();
        m_isVaultUnlocked = false;
        emit vaultStateChanged();
        return false;
    }

    const bool residualPagesCleared = executeSql(
        "PRAGMA wal_checkpoint(TRUNCATE); VACUUM; PRAGMA wal_checkpoint(TRUNCATE);");
    clearUnlockedKeys();
    m_unlockedKeys.insert("library", std::move(libraryKey));
    m_unlockedKeys.insert("finance", std::move(financeKey));
    m_unlockedKeys.insert("notes", std::move(notesKey));
    m_unlockedKeys.insert("culture", std::move(cultureKey));
    m_unlockedKeys.insert("anki", std::move(ankiKey));
    m_unlockedKeys.insert("focus", std::move(focusKey));
    m_unlockedKeys.insert("files", std::move(filesKey));
    m_unlockedKeys.insert("vault", std::move(vaultKey));
    m_unlockedKeys.insert("calendar", std::move(calendarKey));
    m_unlockedKeys.insert("practice", std::move(practiceKey));
    m_unlockedKeys.insert("core", std::move(coreKey));
    m_isVaultUnlocked = true;
    m_vaultLockError = residualPagesCleared
        ? QString() : QStringLiteral("Vault protection is active, but prior SQLite pages could not be scrubbed. Close other app instances and optimize storage.");
    emit vaultLockErrorChanged();
    emit vaultStateChanged();
    emit vaultUnlocked();
    if (m_autoLockMinutes > 0) m_autoLockTimer->start(m_autoLockMinutes * 60 * 1000);
    clearFailedVaultUnlocks();
    refreshStats();
    return true;
}
