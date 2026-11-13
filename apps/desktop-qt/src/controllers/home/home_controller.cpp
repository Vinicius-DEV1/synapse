#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QSysInfo>

// Native dashboard aggregation.

QVariantMap SynapseDataController::getHomeDashboardData() {
    QVariantMap res;
    const QString today = QDate::currentDate().toString("yyyy-MM-dd");
    const QString tomorrow = QDate::currentDate().addDays(1).toString("yyyy-MM-dd");

    // Today's events
    const QString todayPattern = today + "%";
    const QString todaySql =
        "SELECT id, title, description, start_date, color, status, type "
        "FROM calendar_events WHERE deleted_at IS NULL AND (start_date LIKE ? OR start_date IS NULL) "
        "ORDER BY start_date ASC LIMIT 10";
    res["today_events"] = executeQueryPrepared(todaySql, {todayPattern}).toVariantList();

    // Tomorrow's events
    const QString tomorrowPattern = tomorrow + "%";
    const QString tomorrowSql =
        "SELECT id, title, description, start_date, color, status, type "
        "FROM calendar_events WHERE deleted_at IS NULL AND start_date LIKE ? "
        "ORDER BY start_date ASC LIMIT 10";
    res["tomorrow_events"] = executeQueryPrepared(tomorrowSql, {tomorrowPattern}).toVariantList();

    // Recent pages (last 5 edited)
    const QString pagesSql = "SELECT id, title, icon, updated_at FROM pages "
                             "WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5";
    res["recent_pages"] = executeQuery(pagesSql).toVariantList();

    // Pinned pages
    res["pinned_pages"] = getPinnedPages();

    // Financial summary
    res["financial_summary"] = getFinancialSummary();

    // Active habits
    res["habits"] = getHabits();

    // Due flashcards count
    const QString dueSql =
        "SELECT count(*) as count FROM anki_cards c "
        "LEFT JOIN anki_srs_state s ON c.id = s.id "
        "WHERE c.deleted_at IS NULL AND (s.due_date IS NULL OR s.due_date <= datetime('now'))";
    const QJsonArray dueArr = executeQuery(dueSql);
    res["due_cards_count"] = (!dueArr.isEmpty()) ? dueArr[0].toObject().value("count").toInt() : 0;

    return res;
}

