#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QSysInfo>

// Native dashboard aggregation.

QVariantMap SynapseDataController::getHomeDashboardData() {
    QVariantMap res;
    QString today = QDate::currentDate().toString("yyyy-MM-dd");
    QString tomorrow = QDate::currentDate().addDays(1).toString("yyyy-MM-dd");

    // Today's events
    QString todaySql = QString("SELECT id, title, description, start_date, color, status "
                               "FROM calendar_events WHERE deleted_at IS NULL AND (start_date LIKE '%%1%' OR start_date IS NULL) "
                               "ORDER BY start_date ASC LIMIT 10").arg(today);
    res["today_events"] = executeQuery(todaySql).toVariantList();

    // Tomorrow's events
    QString tomorrowSql = QString("SELECT id, title, description, start_date, color, status "
                                  "FROM calendar_events WHERE deleted_at IS NULL AND start_date LIKE '%%1%' "
                                  "ORDER BY start_date ASC LIMIT 10").arg(tomorrow);
    res["tomorrow_events"] = executeQuery(tomorrowSql).toVariantList();

    // Recent pages (last 5 edited)
    QString pagesSql = "SELECT id, title, icon, updated_at FROM pages "
                       "WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5";
    res["recent_pages"] = executeQuery(pagesSql).toVariantList();

    // Pinned pages
    res["pinned_pages"] = getPinnedPages();

    // Financial summary
    res["financial_summary"] = getFinancialSummary();

    // Active habits
    res["habits"] = getHabits();

    return res;
}

