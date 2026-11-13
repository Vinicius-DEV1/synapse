#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QSysInfo>

// Native soft-delete restoration and cleanup.

QVariantList SynapseDataController::getTrashItems() {
    const QString sql =
        "SELECT id, title, deleted_at, 'page' as item_type FROM pages WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, name as title, deleted_at, 'anki_deck' as item_type FROM anki_decks WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, front as title, deleted_at, 'anki_card' as item_type FROM anki_cards WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'book' as item_type FROM library_books WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, label as title, deleted_at, 'vault' as item_type FROM vault_items WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, description as title, deleted_at, 'finance' as item_type FROM transactions WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'wishlist' as item_type FROM wishlist WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'calendar' as item_type FROM calendar_events WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, name as title, deleted_at, 'file' as item_type FROM files WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'culture' as item_type FROM culture_items WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'habit' as item_type FROM habits WHERE deleted_at IS NOT NULL "
        "UNION ALL "
        "SELECT id, title as title, deleted_at, 'lofi' as item_type FROM lofis WHERE deleted_at IS NOT NULL "
        "ORDER BY deleted_at DESC LIMIT 150";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::restoreTrashItem(const QString &id, const QString &itemType) {
    if (id.trimmed().isEmpty() || itemType.trimmed().isEmpty()) return false;

    QString table;
    if (itemType == "page") table = "pages";
    else if (itemType == "anki_deck") table = "anki_decks";
    else if (itemType == "anki_card") table = "anki_cards";
    else if (itemType == "book") table = "library_books";
    else if (itemType == "vault") table = "vault_items";
    else if (itemType == "finance") table = "transactions";
    else if (itemType == "wishlist") table = "wishlist";
    else if (itemType == "calendar") table = "calendar_events";
    else if (itemType == "file") table = "files";
    else if (itemType == "culture") table = "culture_items";
    else if (itemType == "habit") table = "habits";
    else if (itemType == "lofi") table = "lofis";
    else return false;

    const QString now = currentTimestamp();
    const bool ok = executeSqlPrepared(
        QString("UPDATE %1 SET deleted_at = NULL, updated_at = ? WHERE id = ?").arg(table),
        {now, id.trimmed()}
    );
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteTrashItemPermanently(const QString &id, const QString &itemType) {
    if (id.trimmed().isEmpty() || itemType.trimmed().isEmpty()) return false;

    QString table;
    if (itemType == "page") table = "pages";
    else if (itemType == "anki_deck") table = "anki_decks";
    else if (itemType == "anki_card") table = "anki_cards";
    else if (itemType == "book") table = "library_books";
    else if (itemType == "vault") table = "vault_items";
    else if (itemType == "finance") table = "transactions";
    else if (itemType == "wishlist") table = "wishlist";
    else if (itemType == "calendar") table = "calendar_events";
    else if (itemType == "file") table = "files";
    else if (itemType == "culture") table = "culture_items";
    else if (itemType == "habit") table = "habits";
    else if (itemType == "lofi") table = "lofis";
    else return false;

    const bool ok = executeSqlPrepared(
        QString("DELETE FROM %1 WHERE id = ?").arg(table),
        {id.trimmed()}
    );
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::emptyTrash() {
    const QStringList tables = {
        "pages", "anki_decks", "anki_cards", "library_books",
        "vault_items", "vault_groups", "transactions", "wishlist",
        "calendar_events", "culture_items", "habits", "lofis", "files",
        "focus_sessions", "notifications"
    };
    for (const QString &tbl : tables) {
        executeSql(QString("DELETE FROM %1 WHERE deleted_at IS NOT NULL").arg(tbl));
    }
    refreshStats();
    return true;
}

