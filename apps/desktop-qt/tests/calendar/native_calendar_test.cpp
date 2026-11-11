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
};

int runNativeCalendarTest(int argc, char **argv) {
    NativeCalendarTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_calendar_test.moc"
