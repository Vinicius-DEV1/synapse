#include "synapse_controller.h"

QVariantList SynapseDataController::getVideos(const QString &collectionFilter) {
    QString sql = "SELECT id, title, original_name, duration, file_path, progress, is_local, "
                  "collection_id, collection_name, drive_file_id, drive_web_file_id, drive_subtitle_id, "
                  "local_subtitle_path, subtitles_json, audio_tracks_json, youtube_url, youtube_description "
                  "FROM videos WHERE deleted_at IS NULL ";
    const QString selectedCollection = collectionFilter.trimmed();
    if (!selectedCollection.isEmpty() && selectedCollection != "Todos" && selectedCollection != "__all__") {
        if (selectedCollection.startsWith("legacy:")) {
            sql += QString("AND collection_id IS NULL AND collection_name = '%1' ")
                       .arg(escapeSql(selectedCollection.mid(7)));
        } else {
            const QString escapedId = escapeSql(selectedCollection);
            sql += QString("AND (collection_id = '%1' OR (collection_id IS NULL AND collection_name = '%1')) ")
                       .arg(escapedId);
        }
    }
    sql += "ORDER BY updated_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getVideoCollections() {
    const QString sql = "SELECT DISTINCT collection_id, collection_name FROM videos "
                        "WHERE deleted_at IS NULL AND collection_name IS NOT NULL AND collection_name != '' "
                        "ORDER BY collection_name ASC";
    return executeQuery(sql).toVariantList();
}
