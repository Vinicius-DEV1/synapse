#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native culture catalog, progress, and episode persistence delegated to synapse_culture_* domain APIs.

QVariantList SynapseDataController::getCultureItems(const QString &statusFilter) {
    if (!m_db) return {};
    const QByteArray statusBytes = statusFilter.trimmed().toUtf8();
    const char *statusPtr = statusBytes.isEmpty() ? nullptr : statusBytes.constData();

    char *jsonStr = synapse_culture_get_items(m_db, statusPtr);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::incrementCultureProgress(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const int ret = synapse_culture_increment_progress(m_db, itemId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCultureProgress(const QString &itemId, int progress) {
    if (!m_db || itemId.trimmed().isEmpty() || progress < 0) return false;
    const int ret = synapse_culture_update_progress(m_db, itemId.trimmed().toUtf8().constData(), progress);
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateCultureStatus(const QString &itemId, const QString &status) {
    if (!m_db || itemId.trimmed().isEmpty() || status.trimmed().isEmpty()) return false;
    const int ret = synapse_culture_update_status(
        m_db,
        itemId.trimmed().toUtf8().constData(),
        status.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::createCultureItem(const QString &title, const QString &type,
                                              const QString &synopsis, int totalEpisodes,
                                              const QString &coverImage, const QString &goalNote,
                                              const QString &accessLink) {
    if (!m_db || title.trimmed().isEmpty()) return false;

    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray synBytes = synopsis.trimmed().toUtf8();
    const QByteArray coverBytes = coverImage.trimmed().toUtf8();
    const QByteArray goalBytes = goalNote.trimmed().toUtf8();
    const QByteArray linkBytes = accessLink.trimmed().toUtf8();

    const int ret = synapse_culture_create_item(
        m_db,
        title.trimmed().toUtf8().constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        synBytes.isEmpty() ? nullptr : synBytes.constData(),
        totalEpisodes,
        coverBytes.isEmpty() ? nullptr : coverBytes.constData(),
        goalBytes.isEmpty() ? nullptr : goalBytes.constData(),
        linkBytes.isEmpty() ? nullptr : linkBytes.constData()
    );

    if (ret == 1) {
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
    if (!m_db || itemId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;

    const QByteArray typeBytes = type.trimmed().toUtf8();
    const QByteArray synBytes = synopsis.trimmed().toUtf8();
    const QByteArray coverBytes = coverImage.trimmed().toUtf8();
    const QByteArray statusBytes = status.trimmed().toUtf8();
    const QByteArray goalBytes = goalNote.trimmed().toUtf8();
    const QByteArray linkBytes = accessLink.trimmed().toUtf8();

    const int ret = synapse_culture_update_item(
        m_db,
        itemId.trimmed().toUtf8().constData(),
        title.trimmed().toUtf8().constData(),
        typeBytes.isEmpty() ? nullptr : typeBytes.constData(),
        synBytes.isEmpty() ? nullptr : synBytes.constData(),
        totalEpisodes,
        coverBytes.isEmpty() ? nullptr : coverBytes.constData(),
        statusBytes.isEmpty() ? nullptr : statusBytes.constData(),
        goalBytes.isEmpty() ? nullptr : goalBytes.constData(),
        linkBytes.isEmpty() ? nullptr : linkBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::setCultureGoal(const QString &itemId, bool isGoal, const QString &goalNote) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const QByteArray noteBytes = goalNote.trimmed().toUtf8();
    const int ret = synapse_culture_set_goal(
        m_db,
        itemId.trimmed().toUtf8().constData(),
        isGoal ? 1 : 0,
        noteBytes.isEmpty() ? nullptr : noteBytes.constData()
    );
    return ret == 1;
}

bool SynapseDataController::deleteCultureItem(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const int ret = synapse_culture_delete_item(m_db, itemId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getCultureEpisodes(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return {};
    char *jsonStr = synapse_culture_get_episodes(m_db, itemId.trimmed().toUtf8().constData());
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::addCultureEpisode(const QString &itemId, int episodeNumber,
                                             const QString &title, const QString &synopsis,
                                             int seasonNumber, int episodeInSeason,
                                             const QString &airedAt) {
    if (!m_db || itemId.trimmed().isEmpty() || episodeNumber <= 0) return false;

    const QByteArray titleBytes = title.trimmed().toUtf8();
    const QByteArray synBytes = synopsis.trimmed().toUtf8();
    const QByteArray airedBytes = airedAt.trimmed().toUtf8();

    const int ret = synapse_culture_add_episode(
        m_db,
        itemId.trimmed().toUtf8().constData(),
        episodeNumber,
        titleBytes.isEmpty() ? nullptr : titleBytes.constData(),
        synBytes.isEmpty() ? nullptr : synBytes.constData(),
        seasonNumber,
        episodeInSeason,
        airedBytes.isEmpty() ? nullptr : airedBytes.constData()
    );

    return ret == 1;
}

bool SynapseDataController::toggleEpisodeWatched(const QString &episodeId, const QString &itemId) {
    if (!m_db || episodeId.trimmed().isEmpty() || itemId.trimmed().isEmpty()) return false;
    const int ret = synapse_culture_toggle_episode_watched(
        m_db,
        episodeId.trimmed().toUtf8().constData(),
        itemId.trimmed().toUtf8().constData()
    );
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::bulkCreateEpisodes(const QString &itemId, int count) {
    if (!m_db || itemId.trimmed().isEmpty() || count <= 0) return false;
    const int ret = synapse_culture_bulk_create_episodes(
        m_db,
        itemId.trimmed().toUtf8().constData(),
        count
    );
    return ret == 1;
}

bool SynapseDataController::deleteCultureEpisode(const QString &episodeId) {
    if (!m_db || episodeId.trimmed().isEmpty()) return false;
    const int ret = synapse_culture_delete_episode(m_db, episodeId.trimmed().toUtf8().constData());
    return ret == 1;
}
