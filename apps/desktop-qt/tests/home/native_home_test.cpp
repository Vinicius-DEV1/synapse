#include "synapse_controller.h"

#include <QtCore/QDate>
#include <QtCore/QDateTime>
#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeHomeTest final : public QObject {
    Q_OBJECT

private slots:
    void homeDashboardDataAggregation() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-home.sqlite");
        QVERIFY(controller.openDatabase(dbPath));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        const QString today = QDate::currentDate().toString("yyyy-MM-dd");
        const QString tomorrow = QDate::currentDate().addDays(1).toString("yyyy-MM-dd");
        const QString ts = QDateTime::currentDateTimeUtc().toString(Qt::ISODate);

        // 1. Insert today's calendar event
        QVERIFY(controller.createCalendarEvent("Daily Standup", "Team sync", today + "T09:00:00",
                                               today + "T09:30:00", "#10b981", "event", ""));

        // 2. Insert tomorrow's calendar event
        QVERIFY(controller.createCalendarEvent("Sprint Planning", "Backlog grooming", tomorrow + "T14:00:00",
                                               tomorrow + "T15:00:00", "#3b82f6", "event", ""));

        // 3. Insert past calendar event (should not appear in today or tomorrow)
        QVERIFY(controller.createCalendarEvent("Archive Retrospective", "Old retrospective", "2020-01-01T10:00:00",
                                               "2020-01-01T11:00:00", "#6b7280", "event", ""));

        // 4. Insert pages: one unpinned, one pinned
        const QString page1Id = controller.createSubPage("", "Regular Study Note", "📚");
        QVERIFY(!page1Id.isEmpty());

        const QString page2Id = controller.createSubPage("", "Pinned Roadmap", "📌");
        QVERIFY(!page2Id.isEmpty());
        QVERIFY(controller.togglePinPage(page2Id));

        // Fetch home dashboard data
        const QVariantMap data = controller.getHomeDashboardData();

        // Validate today_events
        const QVariantList todayEvents = data.value("today_events").toList();
        QVERIFY(todayEvents.size() >= 1);
        bool foundToday = false;
        for (const QVariant &evVar : todayEvents) {
            const QVariantMap ev = evVar.toMap();
            if (ev.value("title").toString() == "Daily Standup") {
                foundToday = true;
                QVERIFY(ev.value("start_date").toString().startsWith(today));
            }
            QVERIFY(ev.value("title").toString() != "Sprint Planning");
            QVERIFY(ev.value("title").toString() != "Archive Retrospective");
        }
        QVERIFY(foundToday);

        // Validate tomorrow_events
        const QVariantList tomorrowEvents = data.value("tomorrow_events").toList();
        QVERIFY(tomorrowEvents.size() >= 1);
        bool foundTomorrow = false;
        for (const QVariant &evVar : tomorrowEvents) {
            const QVariantMap ev = evVar.toMap();
            if (ev.value("title").toString() == "Sprint Planning") {
                foundTomorrow = true;
                QVERIFY(ev.value("start_date").toString().startsWith(tomorrow));
            }
            QVERIFY(ev.value("title").toString() != "Daily Standup");
            QVERIFY(ev.value("title").toString() != "Archive Retrospective");
        }
        QVERIFY(foundTomorrow);

        // Validate recent_pages
        const QVariantList recentPages = data.value("recent_pages").toList();
        QVERIFY(recentPages.size() >= 2);

        // Validate pinned_pages
        const QVariantList pinnedPages = data.value("pinned_pages").toList();
        QVERIFY(pinnedPages.size() >= 1);
        bool foundPinned = false;
        for (const QVariant &pVar : pinnedPages) {
            if (pVar.toMap().value("id").toString() == page2Id) {
                foundPinned = true;
            }
        }
        QVERIFY(foundPinned);

        // Validate due_cards_count
        QVERIFY(data.contains("due_cards_count"));
        QVERIFY(data.value("due_cards_count").toInt() >= 0);
    }
};

int runNativeHomeTest(int argc, char **argv) {
    NativeHomeTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_home_test.moc"
