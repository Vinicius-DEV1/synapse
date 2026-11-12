#include "synapse_controller.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <atomic>
#include <cstring>

namespace {

struct SecureSearchKey {
    QByteArray bytes;

    ~SecureSearchKey() {
        if (!bytes.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(bytes.data()),
                                       static_cast<size_t>(bytes.size()));
        }
    }
};

struct ByteArrayWiper {
    QByteArray &bytes;

    ~ByteArrayWiper() {
        if (!bytes.isEmpty()) {
            synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(bytes.data()),
                                       static_cast<size_t>(bytes.size()));
        }
    }
};

QVariantMap searchFailure(const QString &message) {
    return {{"success", false}, {"pages", QVariantList{}}, {"error", message}};
}

bool queryRows(Database *database, const QByteArray &sql, QJsonArray &rows) {
    if (!database) return false;
    char *raw = synapse_db_query_json(database, sql.constData());
    if (!raw) return false;
    QByteArray json(raw);
    ByteArrayWiper jsonWiper{json};
    const QJsonDocument document = QJsonDocument::fromJson(json);
    synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(raw), std::strlen(raw));
    synapse_free_string(raw);
    if (!document.isArray()) return false;
    rows = document.array();
    return true;
}

bool queryPageBody(Database *database, const QString &pageId, QString &content, QString &encryptedContent) {
    QJsonArray parameters;
    parameters.append(pageId);
    const QByteArray parameterJson = QJsonDocument(parameters).toJson(QJsonDocument::Compact);
    const QByteArray sql = QByteArrayLiteral(
        "SELECT content, encrypted_content FROM pages WHERE id = ?1 AND deleted_at IS NULL");
    char *raw = synapse_db_query_json_params(database, sql.constData(), parameterJson.constData());
    if (!raw) return false;
    QByteArray json(raw);
    ByteArrayWiper jsonWiper{json};
    const QJsonDocument document = QJsonDocument::fromJson(json);
    synapse_crypto_wipe_memory(reinterpret_cast<uint8_t *>(raw), std::strlen(raw));
    synapse_free_string(raw);
    if (!document.isArray()) return false;
    const QJsonArray rows = document.array();
    if (rows.isEmpty()) return true;
    const QJsonObject page = rows.first().toObject();
    content = page.value(QStringLiteral("content")).toString();
    encryptedContent = page.value(QStringLiteral("encrypted_content")).toString();
    return true;
}

bool decryptPageBody(const QByteArray &key, QString &encryptedContent, QString &content) {
    QByteArray ciphertext = encryptedContent.toUtf8();
    ByteArrayWiper ciphertextWiper{ciphertext};
    char *raw = synapse_crypto_decrypt(key.constData(), ciphertext.constData());
    if (!raw) return false;
    content = QString::fromUtf8(raw);
    synapse_free_secret_string(raw);
    return true;
}

QString plainTextForSearch(QString content) {
    static const QRegularExpression htmlTag(QStringLiteral("<[^>]+>"));
    static const QRegularExpression whitespace(QStringLiteral("\\s+"));
    content.replace(htmlTag, QStringLiteral(" "));
    content.replace(QStringLiteral("&nbsp;"), QStringLiteral(" "), Qt::CaseInsensitive);
    content.replace(whitespace, QStringLiteral(" "));
    content = content.trimmed();
    return content;
}

QVariantMap searchPageReferencesInDatabase(Database *database, const QString &query,
                                           const QByteArray &key, bool vaultLocked,
                                           std::atomic_bool *cancelled) {
    if (!database) return searchFailure(QStringLiteral("The page database is unavailable."));
    QJsonArray pages;
    if (!queryRows(database,
                   QByteArrayLiteral("SELECT id, title, icon FROM pages WHERE deleted_at IS NULL "
                                     "ORDER BY sort_order ASC, updated_at DESC"), pages)) {
        return searchFailure(QStringLiteral("Page search could not read the active page list."));
    }

    QVariantList matches;
    QString warning;
    for (const QJsonValue &value : pages) {
        if (cancelled->load(std::memory_order_relaxed)) return searchFailure(QStringLiteral("Search cancelled."));
        const QJsonObject page = value.toObject();
        const QString pageId = page.value(QStringLiteral("id")).toString();
        const QString title = page.value(QStringLiteral("title")).toString();
        const QString icon = page.value(QStringLiteral("icon")).toString();
        bool matched = title.contains(query, Qt::CaseInsensitive);
        if (!matched) {
            QString storedContent;
            QString encryptedContent;
            if (!queryPageBody(database, pageId, storedContent, encryptedContent)) {
                return searchFailure(QStringLiteral("Page search could not read a page body."));
            }
            if (!encryptedContent.isEmpty()) {
                if (key.isEmpty()) {
                    storedContent.fill(QChar(0));
                    encryptedContent.fill(QChar(0));
                    if (vaultLocked) {
                        warning = QStringLiteral("Unlock the vault to search encrypted page contents.");
                        continue;
                    }
                    return searchFailure(QStringLiteral("The Notes vault key is unavailable."));
                }
                if (!decryptPageBody(key, encryptedContent, storedContent)) {
                    storedContent.fill(QChar(0));
                    encryptedContent.fill(QChar(0));
                    return searchFailure(QStringLiteral("Encrypted page content could not be searched safely."));
                }
            }
            QString plainText = plainTextForSearch(storedContent);
            matched = plainText.contains(query, Qt::CaseInsensitive);
            plainText.fill(QChar(0));
            storedContent.fill(QChar(0));
            encryptedContent.fill(QChar(0));
        }
        if (matched) {
            matches.append(QVariantMap{{"id", pageId}, {"title", title}, {"icon", icon}});
        }
    }
    return {{"success", true}, {"pages", matches}, {"warning", warning}};
}

}

void SynapseDataController::searchPageReferences(const QString &query, int requestId) {
    cancelPageReferenceSearchTasks(false);
    m_latestPageReferenceSearchRequestId = requestId;
    const QString normalizedQuery = query.simplified();
    if (normalizedQuery.isEmpty()) {
        emit pageReferenceSearchReady({{"success", true}, {"requestId", requestId}, {"pages", QVariantList{}}});
        return;
    }
    if (!m_db) {
        QVariantMap result = searchFailure(QStringLiteral("The page database is unavailable."));
        result.insert(QStringLiteral("requestId"), requestId);
        emit pageReferenceSearchReady(result);
        return;
    }
    auto cancellation = std::make_shared<std::atomic_bool>(false);
    auto searchKey = std::make_shared<SecureSearchKey>();
    const bool vaultLocked = m_isVaultConfigured && !m_isVaultUnlocked;
    if (m_isVaultConfigured && m_isVaultUnlocked) {
        searchKey->bytes = m_unlockedKeys.value(QStringLiteral("notes")).toUtf8();
        if (searchKey->bytes.isEmpty()) {
            QVariantMap result = searchFailure(QStringLiteral("The Notes vault key is unavailable."));
            result.insert(QStringLiteral("requestId"), requestId);
            emit pageReferenceSearchReady(result);
            return;
        }
    }
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_pageReferenceSearchTasks.insert(watcher, {requestId, cancellation});
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, requestId, cancellation]() {
        const QVariantMap result = watcher->result();
        const bool currentRequest = m_latestPageReferenceSearchRequestId == requestId;
        m_pageReferenceSearchTasks.remove(watcher);
        watcher->deleteLater();
        if (cancellation->load(std::memory_order_relaxed) || !currentRequest) return;
        QVariantMap response = result;
        response.insert(QStringLiteral("requestId"), requestId);
        emit pageReferenceSearchReady(response);
    });
    Database *database = m_db;
    watcher->setFuture(QtConcurrent::run([database, normalizedQuery, searchKey, vaultLocked, cancellation]() {
        return searchPageReferencesInDatabase(database, normalizedQuery, searchKey->bytes,
                                              vaultLocked, cancellation.get());
    }));
    resetAutoLockTimer();
}

void SynapseDataController::cancelPageReferenceSearch(int requestId) {
    for (auto it = m_pageReferenceSearchTasks.begin(); it != m_pageReferenceSearchTasks.end(); ++it) {
        if (it.value().requestId == requestId && it.value().cancellation) {
            it.value().cancellation->store(true, std::memory_order_relaxed);
        }
    }
    if (m_latestPageReferenceSearchRequestId == requestId) m_latestPageReferenceSearchRequestId = 0;
}

void SynapseDataController::cancelPageReferenceSearchTasks(bool waitForFinish) {
    m_latestPageReferenceSearchRequestId = 0;
    const auto watchers = m_pageReferenceSearchTasks.keys();
    for (auto it = m_pageReferenceSearchTasks.begin(); it != m_pageReferenceSearchTasks.end(); ++it) {
        if (it.value().cancellation) it.value().cancellation->store(true, std::memory_order_relaxed);
    }
    if (waitForFinish) {
        for (QFutureWatcher<QVariantMap> *watcher : watchers) {
            if (watcher) watcher->waitForFinished();
        }
    }
}
