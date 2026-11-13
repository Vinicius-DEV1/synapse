#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeCalendarTest final : public QObject {
    Q_OBJECT

private slots:
    void eventsCanBeEditedWithoutChangingTheirStatusOrType() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-calendar.sqlite")));
        QVERIFY(controller.createCalendarEvent("Exam", "Review chapters", "2026-11-12T09:00:00",
                                              "2026-11-12T09:00:00", "event", "#3b82f6"));
        const QVariantMap initialEvent = controller.getCalendarEvents().first().toMap();
        const QString eventId = initialEvent.value("id").toString();

        QVERIFY(controller.updateCalendarEvent(eventId, "Final exam", "Bring student ID",
                                               "2026-11-13T10:30:00", "2026-11-13T10:30:00", "#10b981"));
        const QVariantMap updatedEvent = controller.getCalendarEvents().first().toMap();
        QCOMPARE(updatedEvent.value("title").toString(), QString("Final exam"));
        QCOMPARE(updatedEvent.value("description").toString(), QString("Bring student ID"));
        QCOMPARE(updatedEvent.value("start_date").toString(), QString("2026-11-13T10:30:00"));
        QCOMPARE(updatedEvent.value("end_date").toString(), QString("2026-11-13T10:30:00"));
        QCOMPARE(updatedEvent.value("color").toString(), QString("#10b981"));
        QCOMPARE(updatedEvent.value("status").toString(), QString("pending"));
        QCOMPARE(updatedEvent.value("type").toString(), QString("event"));

        QVERIFY(!controller.updateCalendarEvent(eventId, "Invalid color", "", "2026-11-13", "2026-11-13", "blue"));
        QVERIFY(!controller.updateCalendarEvent("missing", "Missing", "", "2026-11-13", "2026-11-13", "#10b981"));
    }

    void eventLifecycleWithTypesAndStatusToggle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-calendar-lifecycle.sqlite")));

        // Create a task and a reminder with a linked page
        QVERIFY(controller.createCalendarEvent("Submit assignment", "Upload PDF", "2026-11-15T14:00:00",
                                               "2026-11-15T14:00:00", "task", "#10b981"));
        QVERIFY(controller.createCalendarEvent("Doctor checkup", "Bring exam results", "2026-11-16T10:00:00",
                                               "2026-11-16T10:00:00", "reminder", "#f59e0b", "page-doc-123"));

        QVariantList events = controller.getCalendarEvents();
        QCOMPARE(events.size(), 2);

        const QVariantMap taskEv = events.at(0).toMap();
        const QString taskId = taskEv.value("id").toString();
        QCOMPARE(taskEv.value("title").toString(), QString("Submit assignment"));
        QCOMPARE(taskEv.value("type").toString(), QString("task"));
        QCOMPARE(taskEv.value("status").toString(), QString("pending"));

        const QVariantMap reminderEv = events.at(1).toMap();
        const QString reminderId = reminderEv.value("id").toString();
        QCOMPARE(reminderEv.value("title").toString(), QString("Doctor checkup"));
        QCOMPARE(reminderEv.value("type").toString(), QString("reminder"));
        QCOMPARE(reminderEv.value("page_id").toString(), QString("page-doc-123"));

        // Toggle task status
        QVERIFY(controller.toggleEventStatus(taskId));
        events = controller.getCalendarEvents();
        QCOMPARE(events.at(0).toMap().value("status").toString(), QString("completed"));

        // Toggle back to pending
        QVERIFY(controller.toggleEventStatus(taskId));
        events = controller.getCalendarEvents();
        QCOMPARE(events.at(0).toMap().value("status").toString(), QString("pending"));

        // Update reminder: change type to event and update page_id
        QVERIFY(controller.updateCalendarEvent(reminderId, "Doctor appointment", "Clinic 4B",
                                               "2026-11-16T11:00:00", "2026-11-16T11:00:00",
                                               "#3b82f6", "event", "page-doc-updated"));
        events = controller.getCalendarEvents();
        const QVariantMap updatedReminder = events.at(1).toMap();
        QCOMPARE(updatedReminder.value("title").toString(), QString("Doctor appointment"));
        QCOMPARE(updatedReminder.value("type").toString(), QString("event"));
        QCOMPARE(updatedReminder.value("page_id").toString(), QString("page-doc-updated"));
        QCOMPARE(updatedReminder.value("color").toString(), QString("#3b82f6"));

        // Delete task
        QVERIFY(controller.deleteCalendarEvent(taskId));
        events = controller.getCalendarEvents();
        QCOMPARE(events.size(), 1);
        QCOMPARE(events.at(0).toMap().value("id").toString(), reminderId);
    }
};

int runNativeCalendarTest(int argc, char **argv) {
    NativeCalendarTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_calendar_test.moc"
