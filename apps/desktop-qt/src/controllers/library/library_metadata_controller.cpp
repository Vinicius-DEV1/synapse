#include "synapse_controller.h"
#include "library_metadata_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QStringList>
#include <QtCore/QTimer>
#include <QtCore/QUrl>
#include <QtCore/QUrlQuery>
#include <QtNetwork/QNetworkAccessManager>
#include <QtNetwork/QNetworkReply>
#include <QtNetwork/QNetworkRequest>

namespace {

constexpr qsizetype MaximumOpenLibraryResponseBytes = 1024 * 1024;
constexpr int OpenLibraryTimeoutMs = 6000;

QString cleanBookQuery(QString query) {
    query = query.trimmed();
    query.remove(QRegularExpression(QStringLiteral("\\.(epub|pdf|mobi|azw3)$"), QRegularExpression::CaseInsensitiveOption));
    query.remove(QRegularExpression(QStringLiteral("\\[[^\\]]+\\]")));
    query.remove(QRegularExpression(QStringLiteral("\\([^)]*(\\b\\d{4}\\b|edition|livro|epub|pdf)[^)]*\\)"),
                                          QRegularExpression::CaseInsensitiveOption));
    query.replace('_', ' ');
    query.replace(QRegularExpression(QStringLiteral("\\s+")), QStringLiteral(" "));
    return query.trimmed().left(256);
}

QVariantMap searchFailure(const QString &bookId, const QString &message) {
    return {{"bookId", bookId}, {"success", false}, {"error", message}};
}

QString preferredLanguage(const QJsonArray &languages) {
    const auto hasLanguage = [&languages](const QString &code) {
        for (const QJsonValue &value : languages) {
            if (value.toString() == code) return true;
        }
        return false;
    };
    if (hasLanguage(QStringLiteral("por"))) return QStringLiteral("pt");
    if (hasLanguage(QStringLiteral("eng"))) return QStringLiteral("en");
    if (hasLanguage(QStringLiteral("spa"))) return QStringLiteral("es");
    return {};
}

}

QVariantMap parseOpenLibraryMetadata(const QByteArray &responseBytes) {
    if (responseBytes.isEmpty() || responseBytes.size() > MaximumOpenLibraryResponseBytes) {
        return {{"success", false}, {"error", "Open Library returned an empty or oversized response."}};
    }

    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(responseBytes, &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
        return {{"success", false}, {"error", "Open Library returned invalid metadata."}};
    }

    const QJsonArray documents = document.object().value(QStringLiteral("docs")).toArray();
    if (documents.isEmpty()) return {{"success", true}, {"found", false}};

    QJsonObject selected;
    for (const QJsonValue &value : documents) {
        if (!value.isObject()) continue;
        const QJsonObject candidate = value.toObject();
        if (!candidate.value(QStringLiteral("author_name")).toArray().isEmpty() ||
            candidate.value(QStringLiteral("cover_i")).isDouble()) {
            selected = candidate;
            break;
        }
    }
    if (selected.isEmpty()) selected = documents.first().toObject();

    QVariantMap metadata;
    const QString title = selected.value(QStringLiteral("title")).toString().trimmed().left(512);
    if (!title.isEmpty()) metadata.insert(QStringLiteral("title"), title);

    QStringList authors;
    for (const QJsonValue &authorValue : selected.value(QStringLiteral("author_name")).toArray()) {
        const QString author = authorValue.toString().trimmed();
        if (!author.isEmpty()) authors.append(author.left(256));
        if (authors.size() == 16) break;
    }
    if (!authors.isEmpty()) metadata.insert(QStringLiteral("author"), authors.join(QStringLiteral(", ")));

    const QJsonArray publishers = selected.value(QStringLiteral("publisher")).toArray();
    const QString publisher = publishers.isEmpty() ? QString()
        : publishers.at(0).toString().trimmed();
    if (!publisher.isEmpty()) metadata.insert(QStringLiteral("publisher"), publisher.left(256));

    const QJsonValue yearValue = selected.value(QStringLiteral("first_publish_year"));
    const int year = yearValue.toInt(-1);
    if (year >= 0 && year <= 9999) metadata.insert(QStringLiteral("publishedYear"), year);

    const QString language = preferredLanguage(selected.value(QStringLiteral("language")).toArray());
    if (!language.isEmpty()) metadata.insert(QStringLiteral("language"), language);

    const int coverId = selected.value(QStringLiteral("cover_i")).toInt(-1);
    if (coverId > 0) {
        metadata.insert(QStringLiteral("coverImage"),
                         QStringLiteral("https://covers.openlibrary.org/b/id/%1-L.jpg").arg(coverId));
    }

    return {{"success", true}, {"found", !metadata.isEmpty()}, {"metadata", metadata}};
}

void SynapseDataController::searchLibraryBookMetadata(const QString &bookId, const QString &query) {
    const QString normalizedBookId = bookId.trimmed();
    if (normalizedBookId.isEmpty()) {
        emit libraryBookMetadataSearchFinished(searchFailure({}, "Choose a book before searching for metadata."));
        return;
    }
    if (m_isVaultConfigured && !m_isVaultUnlocked) {
        emit libraryBookMetadataSearchFinished(searchFailure(normalizedBookId, "Unlock the vault before searching for book metadata."));
        return;
    }

    const QString normalizedQuery = cleanBookQuery(query);
    if (normalizedQuery.isEmpty()) {
        emit libraryBookMetadataSearchFinished(searchFailure(normalizedBookId, "Enter a title or author to search."));
        return;
    }

    QUrl url(QStringLiteral("https://openlibrary.org/search.json"));
    QUrlQuery urlQuery;
    urlQuery.addQueryItem(QStringLiteral("q"), normalizedQuery);
    urlQuery.addQueryItem(QStringLiteral("fields"),
                          QStringLiteral("title,author_name,publisher,first_publish_year,cover_i,language"));
    urlQuery.addQueryItem(QStringLiteral("limit"), QStringLiteral("3"));
    url.setQuery(urlQuery);

    auto *manager = new QNetworkAccessManager(this);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::UserAgentHeader, QStringLiteral("Synapse-Desktop/1.0"));
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    QNetworkReply *reply = manager->get(request);
    m_libraryMetadataReplies.insert(reply);
    auto *timeout = new QTimer(reply);
    timeout->setSingleShot(true);
    connect(timeout, &QTimer::timeout, reply, &QNetworkReply::abort);
    timeout->start(OpenLibraryTimeoutMs);

    connect(reply, &QNetworkReply::finished, this, [this, reply, manager, timeout, normalizedBookId]() {
        timeout->stop();
        const bool wasPending = m_libraryMetadataReplies.remove(reply);
        if (!wasPending || (m_isVaultConfigured && !m_isVaultUnlocked)) {
            reply->deleteLater();
            manager->deleteLater();
            return;
        }
        if (reply->error() != QNetworkReply::NoError) {
            emit libraryBookMetadataSearchFinished(
                searchFailure(normalizedBookId, "Open Library could not be reached. Check the connection and try again."));
            reply->deleteLater();
            manager->deleteLater();
            return;
        }

        const int statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        const QByteArray responseBytes = reply->read(MaximumOpenLibraryResponseBytes + 1);
        if (statusCode < 200 || statusCode >= 300) {
            emit libraryBookMetadataSearchFinished(
                searchFailure(normalizedBookId, QStringLiteral("Open Library returned HTTP %1.").arg(statusCode)));
        } else {
            QVariantMap result = parseOpenLibraryMetadata(responseBytes);
            result.insert(QStringLiteral("bookId"), normalizedBookId);
            emit libraryBookMetadataSearchFinished(result);
        }
        reply->deleteLater();
        manager->deleteLater();
    });
}

void SynapseDataController::cancelLibraryMetadataRequests() {
    const auto pendingReplies = m_libraryMetadataReplies;
    m_libraryMetadataReplies.clear();
    for (QNetworkReply *reply : pendingReplies) {
        if (reply) reply->abort();
    }
}
