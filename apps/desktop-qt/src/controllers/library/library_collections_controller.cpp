#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QStringList>
#include <QtCore/QUuid>

namespace {

bool isValidCollection(const QString &name, const QString &color) {
    static const QRegularExpression hexColor(QStringLiteral("^#[0-9A-Fa-f]{6}$"));
    return !name.trimmed().isEmpty() && name.trimmed().size() <= 60 && hexColor.match(color).hasMatch();
}

}

QVariantList SynapseDataController::getLibraryCollections() {
    return executeQueryPrepared(
        "SELECT id, name, color FROM library_collections WHERE deleted_at IS NULL "
        "ORDER BY name COLLATE NOCASE ASC", {}).toVariantList();
}

QString SynapseDataController::createLibraryCollection(const QString &name, const QString &color) {
    const QString normalizedName = name.trimmed();
    const QString normalizedColor = color.trimmed();
    if (!isValidCollection(normalizedName, normalizedColor)) return QString();

    const QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    const int inserted = executeSqlPrepared(
        "INSERT INTO library_collections (id, name, color, created_at, updated_at) "
        "VALUES (?1, ?2, ?3, ?4, ?4)",
        {id, normalizedName, normalizedColor, currentTimestamp()});
    return inserted == 1 ? id : QString();
}

bool SynapseDataController::updateLibraryCollection(const QString &collectionId, const QString &name,
                                                    const QString &color) {
    const QString normalizedId = collectionId.trimmed();
    const QString normalizedName = name.trimmed();
    const QString normalizedColor = color.trimmed();
    if (normalizedId.isEmpty() || !isValidCollection(normalizedName, normalizedColor)) return false;
    return executeSqlPrepared(
        "UPDATE library_collections SET name = ?1, color = ?2, updated_at = ?3 "
        "WHERE id = ?4 AND deleted_at IS NULL",
        {normalizedName, normalizedColor, currentTimestamp(), normalizedId}) == 1;
}

bool SynapseDataController::deleteLibraryCollection(const QString &collectionId) {
    const QString normalizedId = collectionId.trimmed();
    if (normalizedId.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    return executeSqlPrepared(
        "UPDATE library_collections SET deleted_at = ?1, updated_at = ?1 "
        "WHERE id = ?2 AND deleted_at IS NULL", {timestamp, normalizedId}) == 1;
}

bool SynapseDataController::setBookCollections(const QString &bookId, const QVariantList &collectionIds) {
    const QString normalizedBookId = bookId.trimmed();
    if (normalizedBookId.isEmpty() || !executeSql("BEGIN IMMEDIATE;")) return false;
    if (executeQueryPrepared(
            "SELECT id FROM library_books WHERE id = ?1 AND deleted_at IS NULL", {normalizedBookId}).isEmpty()) {
        executeSql("ROLLBACK;");
        return false;
    }

    QSet<QString> activeCollectionIds;
    const QJsonArray activeCollectionRows = executeQueryPrepared(
        "SELECT id FROM library_collections WHERE deleted_at IS NULL", {});
    for (const QJsonValue &value : activeCollectionRows) {
        activeCollectionIds.insert(value.toObject().value(QStringLiteral("id")).toString());
    }

    QSet<QString> uniqueIds;
    QStringList orderedIds;
    for (const QVariant &value : collectionIds) {
        const QString id = value.toString().trimmed();
        if (id.isEmpty() || !activeCollectionIds.contains(id)) {
            executeSql("ROLLBACK;");
            return false;
        }
        if (!uniqueIds.contains(id)) {
            uniqueIds.insert(id);
            orderedIds.append(id);
        }
    }

    const QString timestamp = currentTimestamp();
    bool success = executeSqlPrepared(
        "UPDATE library_book_collections SET deleted_at = ?1, updated_at = ?1 "
        "WHERE book_id = ?2 AND deleted_at IS NULL", {timestamp, normalizedBookId}) >= 0;
    for (const QString &collectionId : orderedIds) {
        if (!success) break;
        const QString relationId = QUuid::createUuid().toString(QUuid::WithoutBraces);
        success = executeSqlPrepared(
            "INSERT INTO library_book_collections (id, book_id, collection_id, created_at, updated_at) "
            "VALUES (?1, ?2, ?3, ?4, ?4)",
            {relationId, normalizedBookId, collectionId, timestamp}) == 1;
    }

    if (success && executeSql("COMMIT;")) return true;
    executeSql("ROLLBACK;");
    return false;
}
