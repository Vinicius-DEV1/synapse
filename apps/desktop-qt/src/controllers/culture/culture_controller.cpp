#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>

// Native culture catalog, progress, and episode persistence using prepared statements.

QVariantList SynapseDataController::getCultureItems(const QString &statusFilter) {
    if (statusFilter.trimmed().isEmpty()) {
        return executeQueryPrepared(
            "SELECT id, title, type, synopsis, cover_image, status, progress, total_episodes, "
            "is_goal, goal_note, access_link, created_at, updated_at "
            "FROM culture_items WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 300",
            {}
        ).toVariantList();
    }

    return executeQueryPrepared(
        "SELECT id, title, type, synopsis, cover_image, status, progress, total_episodes, "
        "is_goal, goal_note, access_link, created_at, updated_at "
        "FROM culture_items WHERE deleted_at IS NULL AND status = ? ORDER BY updated_at DESC LIMIT 300",
        {statusFilter.trimmed()}
    ).toVariantList();
}

bool SynapseDataController::incrementCultureProgress(const QString &itemId) {
    if (itemId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET progress = progress + 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, itemId.trimmed()}
    );
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCultureProgress(const QString &itemId, int progress) {
    if (itemId.trimmed().isEmpty() || progress < 0) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET progress = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {progress, ts, itemId.trimmed()}
    );
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCultureStatus(const QString &itemId, const QString &status) {
    if (itemId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {status.trimmed(), ts, itemId.trimmed()}
    );
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::createCultureItem(const QString &title, const QString &type,
                                              const QString &synopsis, int totalEpisodes,
                                              const QString &coverImage, const QString &goalNote,
                                              const QString &accessLink) {
    if (title.trimmed().isEmpty()) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedType = type.trimmed().isEmpty() ? QStringLiteral("anime") : type.trimmed();
    const int resolvedEpisodes = qMax(0, totalEpisodes);

    const int rows = executeSqlPrepared(
        "INSERT INTO culture_items (id, title, type, synopsis, total_episodes, progress, status, cover_image, goal_note, access_link, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, 0, 'backlog', ?, ?, ?, ?, ?)",
        {id, title.trimmed(), resolvedType, synopsis.trimmed(), resolvedEpisodes,
         coverImage.trimmed(), goalNote.trimmed(), accessLink.trimmed(), ts, ts}
    );

    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCultureItem(const QString &itemId, const QString &title,
                                              const QString &type, const QString &synopsis,
                                              int totalEpisodes, const QString &coverImage,
                                              const QString &status, const QString &goalNote,
                                              const QString &accessLink) {
    if (itemId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;

    const QString ts = currentTimestamp();
    const QString resolvedType = type.trimmed().isEmpty() ? QStringLiteral("anime") : type.trimmed();
    const QString resolvedStatus = status.trimmed().isEmpty() ? QStringLiteral("backlog") : status.trimmed();
    const int resolvedEpisodes = qMax(0, totalEpisodes);

    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET title = ?, type = ?, synopsis = ?, total_episodes = ?, "
        "cover_image = ?, status = ?, goal_note = ?, access_link = ?, updated_at = ? "
        "WHERE id = ? AND deleted_at IS NULL",
        {title.trimmed(), resolvedType, synopsis.trimmed(), resolvedEpisodes,
         coverImage.trimmed(), resolvedStatus, goalNote.trimmed(), accessLink.trimmed(), ts, itemId.trimmed()}
    );

    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::setCultureGoal(const QString &itemId, bool isGoal, const QString &goalNote) {
    if (itemId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET is_goal = ?, goal_note = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {isGoal ? 1 : 0, goalNote.trimmed(), ts, itemId.trimmed()}
    );
    return rows == 1;
}

bool SynapseDataController::deleteCultureItem(const QString &itemId) {
    if (itemId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "UPDATE culture_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, itemId.trimmed()}
    );
    if (rows == 1) {
        executeSqlPrepared(
            "UPDATE culture_episodes SET deleted_at = ?, updated_at = ? WHERE item_id = ? AND deleted_at IS NULL",
            {ts, ts, itemId.trimmed()}
        );
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getCultureEpisodes(const QString &itemId) {
    if (itemId.trimmed().isEmpty()) return {};

    return executeQueryPrepared(
        "SELECT id, item_id, episode_number, title, synopsis, is_watched, watched_at, season_number, episode_in_season, aired_at "
        "FROM culture_episodes WHERE item_id = ? AND deleted_at IS NULL ORDER BY episode_number ASC",
        {itemId.trimmed()}
    ).toVariantList();
}

bool SynapseDataController::addCultureEpisode(const QString &itemId, int episodeNumber,
                                             const QString &title, const QString &synopsis,
                                             int seasonNumber, int episodeInSeason,
                                             const QString &airedAt) {
    if (itemId.trimmed().isEmpty() || episodeNumber <= 0) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString epTitle = title.trimmed().isEmpty()
        ? QStringLiteral("Episódio %1").arg(episodeNumber)
        : title.trimmed();

    const int rows = executeSqlPrepared(
        "INSERT INTO culture_episodes (id, item_id, episode_number, title, synopsis, is_watched, season_number, episode_in_season, aired_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)",
        {id, itemId.trimmed(), episodeNumber, epTitle, synopsis.trimmed(),
         qMax(1, seasonNumber), qMax(1, episodeInSeason), airedAt.trimmed(), ts}
    );

    return rows == 1;
}

bool SynapseDataController::toggleEpisodeWatched(const QString &episodeId, const QString &itemId) {
    if (episodeId.trimmed().isEmpty() || itemId.trimmed().isEmpty()) return false;

    const QJsonArray current = executeQueryPrepared(
        "SELECT is_watched FROM culture_episodes WHERE id = ? AND deleted_at IS NULL",
        {episodeId.trimmed()}
    );
    if (current.isEmpty()) return false;

    const bool currentlyWatched = current.at(0).toObject().value(QStringLiteral("is_watched")).toInt() != 0;
    const bool newWatched = !currentlyWatched;
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "UPDATE culture_episodes SET is_watched = ?, watched_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {newWatched ? 1 : 0, newWatched ? ts : QVariant(), ts, episodeId.trimmed()}
    );
    if (rows != 1) return false;

    // Recalculate total watched episodes for this item
    const QJsonArray countArr = executeQueryPrepared(
        "SELECT COUNT(*) AS watched_count FROM culture_episodes WHERE item_id = ? AND is_watched = 1 AND deleted_at IS NULL",
        {itemId.trimmed()}
    );
    const int watchedCount = countArr.isEmpty() ? 0 : countArr.at(0).toObject().value(QStringLiteral("watched_count")).toInt();

    executeSqlPrepared(
        "UPDATE culture_items SET progress = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {watchedCount, ts, itemId.trimmed()}
    );

    // If watchedCount reaches total_episodes and item was in backlog/watching, optionally mark finished
    const QJsonArray itemArr = executeQueryPrepared(
        "SELECT total_episodes, status FROM culture_items WHERE id = ? AND deleted_at IS NULL",
        {itemId.trimmed()}
    );
    if (!itemArr.isEmpty()) {
        const int totalEps = itemArr.at(0).toObject().value(QStringLiteral("total_episodes")).toInt();
        const QString status = itemArr.at(0).toObject().value(QStringLiteral("status")).toString();
        if (totalEps > 0 && watchedCount >= totalEps && status != QStringLiteral("finished")) {
            executeSqlPrepared(
                "UPDATE culture_items SET status = 'finished', updated_at = ? WHERE id = ? AND deleted_at IS NULL",
                {ts, itemId.trimmed()}
            );
        }
    }

    refreshStats();
    return true;
}

bool SynapseDataController::bulkCreateEpisodes(const QString &itemId, int count) {
    if (itemId.trimmed().isEmpty() || count <= 0) return false;

    const QJsonArray existing = executeQueryPrepared(
        "SELECT COUNT(*) AS ep_count FROM culture_episodes WHERE item_id = ? AND deleted_at IS NULL",
        {itemId.trimmed()}
    );
    const int existingCount = existing.isEmpty() ? 0 : existing.at(0).toObject().value(QStringLiteral("ep_count")).toInt();
    if (existingCount >= count) return true;

    for (int i = existingCount + 1; i <= count; ++i) {
        addCultureEpisode(itemId, i, QStringLiteral("Episódio %1").arg(i), QString(), 1, i, QString());
    }

    return true;
}

bool SynapseDataController::deleteCultureEpisode(const QString &episodeId) {
    if (episodeId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE culture_episodes SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, episodeId.trimmed()}
    );
    return rows == 1;
}
