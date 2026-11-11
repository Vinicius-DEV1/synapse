#include "synapse_controller.h"
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QDir>
#include <QtCore/QStandardPaths>
#include <QtCore/QDebug>
#include <QtCore/QTemporaryFile>

namespace {

struct ByteArrayWiper {
    QByteArray &value;
    ~ByteArrayWiper() {
        if (!value.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(value.data()),
                                       static_cast<size_t>(value.size()));
        }
    }
};

}

SynapseDataController::SynapseDataController(QObject *parent, bool initializeDefaultDatabase)
    : QObject(parent),
      m_db(nullptr),
      m_pageCount(0),
      m_videoCount(0),
      m_deckCount(0),
      m_bookCount(0),
      m_cultureCount(0),
      m_vaultItemCount(0),
      m_transactionCount(0),
      m_eventCount(0),
      m_habitCount(0),
      m_quizBatteryCount(0),
      m_focusSessionCount(0),
      m_unreadNotificationCount(0),
      m_fileOperationRunning(false),
      m_fileOperationWatcher(nullptr),
      m_activeFileOperation(nullptr),
      m_pendingPreviewFile(nullptr),
      m_cancelPreviewRequested(false),
      m_isVaultConfigured(false),
      m_isVaultUnlocked(false),
      m_autoLockMinutes(5),
      m_vaultLockError(""),
      m_autoLockTimer(new QTimer(this)) {
    
    m_autoLockTimer->setSingleShot(true);
    connect(m_autoLockTimer, &QTimer::timeout, this, &SynapseDataController::lockVault);

    if (!initializeDefaultDatabase) return;

    // Automatically locate user's canonical Caderno SQLite database
    QString home = QDir::homePath();
    QString canonicalTauriPath = home + "/.local/share/com.caderno.app/caderno.sqlite";
    QString legacyPath = home + "/.local/share/caderno/caderno.sqlite";
    QString defaultQtPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) + "/caderno.sqlite";

    if (QFile::exists(canonicalTauriPath)) {
        openDatabase(canonicalTauriPath);
    } else if (QFile::exists(legacyPath)) {
        openDatabase(legacyPath);
    } else {
        openDatabase(defaultQtPath);
    }
}

SynapseDataController::~SynapseDataController() {
    lockVault();
    if (m_fileOperationWatcher) m_fileOperationWatcher->waitForFinished();
    if (m_librarySearchWatcher) m_librarySearchWatcher->waitForFinished();
    if (m_pendingPreviewFile) {
        delete m_pendingPreviewFile;
        m_pendingPreviewFile = nullptr;
    }
    for (QTemporaryFile *previewFile : m_filePreviewFiles) delete previewFile;
    m_filePreviewFiles.clear();
    if (m_activeFileOperation) {
        synapse_file_operation_close(m_activeFileOperation);
        m_activeFileOperation = nullptr;
    }
    if (m_db) {
        synapse_db_close(m_db);
        m_db = nullptr;
    }
}

bool SynapseDataController::openDatabase(const QString &path) {
    if (m_db) {
        if (m_fileOperationRunning) {
            qWarning() << "[SynapseDataController] Cannot switch databases while a file operation is running.";
            return false;
        }
        if (m_librarySearchRunning) {
            if (m_librarySearchCancellation) m_librarySearchCancellation->store(true, std::memory_order_relaxed);
            qWarning() << "[SynapseDataController] Cannot switch databases while a book search is running.";
            return false;
        }
        if (!finishActiveLibraryReadingSession()) {
            qWarning() << "[SynapseDataController] Cannot switch databases while a reading session is active.";
            return false;
        }
        cancelLibraryMetadataRequests();
        m_autoLockTimer->stop();
        clearUnlockedKeys();
        m_isVaultUnlocked = false;
        m_isVaultConfigured = false;
        clearStats();
        m_pageHistoryCooldown.clear();
        for (QTemporaryFile *previewFile : m_filePreviewFiles) delete previewFile;
        m_filePreviewFiles.clear();
        emit filePreviewsInvalidated();
        emit vaultStateChanged();
        synapse_db_close(m_db);
        m_db = nullptr;
    }

    QDir().mkpath(QFileInfo(path).absolutePath());
    m_dbPath = path;
    qInfo() << "[SynapseDataController] Opening local database.";

    m_db = synapse_db_open(m_dbPath.toUtf8().constData());
    if (!m_db) {
        qWarning() << "[SynapseDataController] Error opening database!";
        return false;
    }

    emit dbPathChanged();
    clearStats();
    checkKeychainState();
    return true;
}

QString SynapseDataController::escapeSql(const QString &str) const {
    QString res = str;
    res.replace("'", "''");
    return res;
}

QString SynapseDataController::generateUuid() const {
    return QUuid::createUuid().toString(QUuid::WithoutBraces);
}

QString SynapseDataController::currentTimestamp() const {
    return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs);
}

QJsonArray SynapseDataController::executeQuery(const QString &sql) {
    if (!m_db) return QJsonArray();

    char *jsonRaw = synapse_db_query_json(m_db, sql.toUtf8().constData());
    if (!jsonRaw) return QJsonArray();

    QByteArray bytes(jsonRaw);
    synapse_free_string(jsonRaw);

    QJsonDocument doc = QJsonDocument::fromJson(bytes);
    return doc.isArray() ? doc.array() : QJsonArray();
}

bool SynapseDataController::executeSql(const QString &sql) {
    if (!m_db) return false;
    int res = synapse_db_execute(m_db, sql.toUtf8().constData());
    if (res != 0) {
        qWarning() << "[SynapseDataController] Database write failed.";
        return false;
    }
    return true;
}

void SynapseDataController::refreshStats() {
    if (!m_db || !m_isVaultUnlocked) {
        clearStats();
        return;
    }

    auto getCount = [this](const QString &table) -> int {
        QString sql = QString("SELECT count(*) as count FROM %1 WHERE deleted_at IS NULL").arg(table);
        QJsonArray arr = executeQuery(sql);
        if (!arr.isEmpty()) {
            return arr[0].toObject().value("count").toInt();
        }
        return 0;
    };

    m_pageCount = getCount("pages");
    m_videoCount = getCount("videos");
    m_deckCount = getCount("anki_decks");
    m_bookCount = getCount("library_books");
    m_cultureCount = getCount("culture_items");
    m_vaultItemCount = getCount("vault_items");
    m_transactionCount = getCount("transactions");
    m_eventCount = getCount("calendar_events");
    m_habitCount = getCount("habits");
    m_quizBatteryCount = getCount("quiz_batteries");
    m_focusSessionCount = getCount("focus_sessions");
    QJsonArray unread = executeQuery("SELECT count(*) as count FROM notifications WHERE deleted_at IS NULL AND is_read = 0");
    m_unreadNotificationCount = unread.isEmpty() ? 0 : unread[0].toObject().value("count").toInt();

    qInfo() << "[SynapseDataController] Stats updated -> Pages:" << m_pageCount
            << "| Videos:" << m_videoCount
            << "| Decks:" << m_deckCount
            << "| Books:" << m_bookCount
            << "| Culture:" << m_cultureCount
            << "| Vault:" << m_vaultItemCount
            << "| Transactions:" << m_transactionCount
            << "| Batteries:" << m_quizBatteryCount
            << "| FocusSessions:" << m_focusSessionCount;
    emit countsChanged();
}

void SynapseDataController::clearStats() {
    m_pageCount = 0;
    m_videoCount = 0;
    m_deckCount = 0;
    m_bookCount = 0;
    m_cultureCount = 0;
    m_vaultItemCount = 0;
    m_transactionCount = 0;
    m_eventCount = 0;
    m_habitCount = 0;
    m_quizBatteryCount = 0;
    m_focusSessionCount = 0;
    m_unreadNotificationCount = 0;
    emit countsChanged();
}

void SynapseDataController::checkKeychainState() {
    QJsonArray arr = executeQuery("SELECT count(*) as count FROM keychain");
    int cnt = 0;
    if (!arr.isEmpty()) {
        cnt = arr[0].toObject().value("count").toInt();
    }
    bool configured = (cnt > 0);
    if (configured != m_isVaultConfigured) {
        m_isVaultConfigured = configured;
        if (!configured) {
            m_autoLockTimer->stop();
            clearUnlockedKeys();
            m_isVaultUnlocked = false;
            clearStats();
            emit vaultLocked();
        }
        emit vaultStateChanged();
    }
}

void SynapseDataController::clearUnlockedKeys() {
    for (auto it = m_unlockedKeys.begin(); it != m_unlockedKeys.end(); ++it) {
        it.value().fill(QChar(0));
    }
    m_unlockedKeys.clear();
}

bool SynapseDataController::checkVaultConfigured() {
    checkKeychainState();
    return m_isVaultConfigured;
}

void SynapseDataController::setAutoLockMinutes(int minutes) {
    if (m_autoLockMinutes == minutes) return;
    m_autoLockMinutes = qBound(0, minutes, 120);
    emit autoLockMinutesChanged();
    if (m_isVaultUnlocked && m_autoLockMinutes > 0) {
        m_autoLockTimer->start(m_autoLockMinutes * 60 * 1000);
    } else {
        m_autoLockTimer->stop();
    }
}

void SynapseDataController::resetAutoLockTimer() {
    if (m_isVaultUnlocked && m_autoLockMinutes > 0) {
        m_autoLockTimer->start(m_autoLockMinutes * 60 * 1000);
    }
}

QString SynapseDataController::encryptContent(const QString &keyHex, const QString &plaintext) {
    if (plaintext.isEmpty()) return QStringLiteral("");
    if (keyHex.trimmed().isEmpty()) return QString();
    QByteArray keyBytes = keyHex.toUtf8();
    QByteArray plaintextBytes = plaintext.toUtf8();
    ByteArrayWiper keyWiper{keyBytes};
    ByteArrayWiper plaintextWiper{plaintextBytes};
    char *cEnc = synapse_crypto_encrypt(keyBytes.constData(), plaintextBytes.constData());
    if (!cEnc) return QString();
    QString result = QString::fromUtf8(cEnc);
    synapse_free_string(cEnc);
    return result;
}

QString SynapseDataController::decryptContent(const QString &keyHex, const QString &ciphertext) {
    if (ciphertext.isEmpty()) return QStringLiteral("");
    if (keyHex.trimmed().isEmpty()) return QString();
    QByteArray keyBytes = keyHex.toUtf8();
    QByteArray ciphertextBytes = ciphertext.toUtf8();
    ByteArrayWiper keyWiper{keyBytes};
    ByteArrayWiper ciphertextWiper{ciphertextBytes};
    char *cDec = synapse_crypto_decrypt(keyBytes.constData(), ciphertextBytes.constData());
    if (!cDec) return QString();
    QString result = QString::fromUtf8(cDec);
    synapse_free_secret_string(cDec);
    return result;
}

QVariantList SynapseDataController::getDiagrams() {
    QString sql = "SELECT id, title, icon, updated_at, created_at FROM diagrams "
                  "WHERE deleted_at IS NULL ORDER BY updated_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantMap SynapseDataController::getDiagram(const QString &diagramId) {
    const QJsonArray arr = executeQueryPrepared(
        "SELECT id, title, icon, content, encrypted_content, updated_at FROM diagrams "
        "WHERE id = ?1 AND deleted_at IS NULL", {diagramId});
    if (arr.isEmpty()) return QVariantMap();
    QJsonObject obj = arr[0].toObject();
    QString enc = obj.value("encrypted_content").toString();
    if (!enc.isEmpty()) {
        const QString notesKey = m_unlockedKeys.value("notes");
        if (m_isVaultConfigured && !m_isVaultUnlocked) {
            obj["content"] = "🔒 [Diagrama Criptografado - Desbloqueie o Cofre]";
        } else if (notesKey.isEmpty()) {
            obj["content"] = QString();
            obj["decryption_error"] = true;
        } else {
            const QString decrypted = decryptContent(notesKey, enc);
            if (decrypted.isNull()) {
                obj["content"] = QString();
                obj["decryption_error"] = true;
            } else {
                obj["content"] = decrypted;
            }
        }
    }
    return obj.toVariantMap();
}

bool SynapseDataController::saveDiagram(const QString &diagramId, const QString &title, const QString &content, const QString &icon) {
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;
    QString ts = currentTimestamp();
    QString enc;
    if (m_isVaultConfigured) {
        const QString notesKey = m_unlockedKeys.value("notes");
        if (notesKey.isEmpty()) return false;
        enc = encryptContent(notesKey, content);
        if (enc.isNull()) return false;
    }
    if (m_isVaultConfigured) {
        return executeSqlPrepared(
            "UPDATE diagrams SET title = ?1, content = '', encrypted_content = ?2, icon = ?3, updated_at = ?4 "
            "WHERE id = ?5", {title, enc, icon, ts, diagramId}) == 1;
    }
    return executeSqlPrepared(
        "UPDATE diagrams SET title = ?1, content = ?2, encrypted_content = NULL, icon = ?3, updated_at = ?4 "
        "WHERE id = ?5", {title, content, icon, ts, diagramId}) == 1;
}

QString SynapseDataController::createDiagram(const QString &title, const QString &icon) {
    if (m_isVaultConfigured && !m_isVaultUnlocked) return QString();
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString content = QStringLiteral("[]");
    QString encrypted;
    if (m_isVaultConfigured) {
        const QString notesKey = m_unlockedKeys.value("notes");
        if (notesKey.isEmpty()) return QString();
        encrypted = encryptContent(notesKey, content);
        if (encrypted.isNull()) return QString();
        content.clear();
    }
    const int inserted = m_isVaultConfigured
        ? executeSqlPrepared(
              "INSERT INTO diagrams (id, title, content, encrypted_content, icon, created_at, updated_at) "
              "VALUES (?1, ?2, '', ?3, ?4, ?5, ?5)", {id, title, encrypted, icon, ts})
        : executeSqlPrepared(
              "INSERT INTO diagrams (id, title, content, encrypted_content, icon, created_at, updated_at) "
              "VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?5)", {id, title, content, icon, ts});
    if (inserted == 1) return id;
    return "";
}

bool SynapseDataController::deleteDiagram(const QString &diagramId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE diagrams SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(diagramId));
    return executeSql(sql);
}
