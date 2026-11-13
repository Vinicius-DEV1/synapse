#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeFocusTest final : public QObject {
    Q_OBJECT

private slots:
    void focusSessionLifecycle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-focus-sessions.sqlite")));

        // Record sessions
        QVERIFY(controller.recordFocusSession("Estudo", 25, "completed", "Math study finished", "Algebra chapters"));
        QVERIFY(controller.recordFocusSession("Código", 50, "completed", "Refactored module", "Focus controller"));

        QVariantList sessions = controller.getFocusSessions();
        QCOMPARE(sessions.size(), 2);

        const QVariantMap first = sessions.at(0).toMap();
        QCOMPARE(first.value("tag").toString(), QString("Código"));
        QCOMPARE(first.value("target_time_minutes").toInt(), 50);
        QCOMPARE(first.value("status").toString(), QString("completed"));
        QCOMPARE(first.value("summary").toString(), QString("Refactored module"));

        const QVariantMap second = sessions.at(1).toMap();
        const QString secondId = second.value("id").toString();
        QCOMPARE(second.value("tag").toString(), QString("Estudo"));
        QCOMPARE(second.value("target_time_minutes").toInt(), 25);

        // Delete session
        QVERIFY(controller.deleteFocusSession(secondId));
        sessions = controller.getFocusSessions();
        QCOMPARE(sessions.size(), 1);
        QCOMPARE(sessions.first().toMap().value("id").toString(), first.value("id").toString());
    }

    void lofiTrackLifecycle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-focus-lofi.sqlite")));

        QVERIFY(controller.addLofiTrack("Chill Beats", "/path/to/chill.mp3", 185.5));
        QVERIFY(controller.addLofiTrack("Rain Ambient", "/path/to/rain.mp3", 300.0));

        QVariantList lofis = controller.getLofis();
        QCOMPARE(lofis.size(), 2);

        const QVariantMap track1 = lofis.at(0).toMap();
        const QString track1Id = track1.value("id").toString();
        QCOMPARE(track1.value("title").toString(), QString("Chill Beats"));
        QCOMPARE(track1.value("file_path").toString(), QString("/path/to/chill.mp3"));

        // Delete track
        QVERIFY(controller.deleteLofi(track1Id));
        lofis = controller.getLofis();
        QCOMPARE(lofis.size(), 1);
        QCOMPARE(lofis.first().toMap().value("title").toString(), QString("Rain Ambient"));
    }

    void alarmLifecycle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-focus-alarms.sqlite")));

        // Create alarms
        QVERIFY(controller.createAlarm("07:30", "Morning Pomodoro", "bell", true, "[\"mon\",\"tue\",\"wed\"]"));
        QVERIFY(controller.createAlarm("14:00", "Afternoon Sprint", "chime", false, "[\"fri\"]"));

        QVariantList alarms = controller.getAlarms();
        QCOMPARE(alarms.size(), 2);

        const QVariantMap alarm1 = alarms.at(0).toMap();
        const QString alarm1Id = alarm1.value("id").toString();
        QCOMPARE(alarm1.value("time").toString(), QString("07:30"));
        QCOMPARE(alarm1.value("label").toString(), QString("Morning Pomodoro"));
        QCOMPARE(alarm1.value("sound").toString(), QString("bell"));
        QCOMPARE(alarm1.value("enabled").toInt(), 1);

        const QVariantMap alarm2 = alarms.at(1).toMap();
        const QString alarm2Id = alarm2.value("id").toString();
        QCOMPARE(alarm2.value("time").toString(), QString("14:00"));
        QCOMPARE(alarm2.value("enabled").toInt(), 0);

        // Toggle alarm 2
        QVERIFY(controller.toggleAlarm(alarm2Id));
        alarms = controller.getAlarms();
        QCOMPARE(alarms.at(1).toMap().value("enabled").toInt(), 1);

        // Update alarm 1
        QVERIFY(controller.updateAlarm(alarm1Id, "08:00", "Late Morning", "gong", true, "[\"mon\"]"));
        alarms = controller.getAlarms();
        const QVariantMap updatedAlarm = alarms.at(0).toMap();
        QCOMPARE(updatedAlarm.value("time").toString(), QString("08:00"));
        QCOMPARE(updatedAlarm.value("label").toString(), QString("Late Morning"));
        QCOMPARE(updatedAlarm.value("sound").toString(), QString("gong"));

        // Delete alarm 2
        QVERIFY(controller.deleteAlarm(alarm2Id));
        alarms = controller.getAlarms();
        QCOMPARE(alarms.size(), 1);
        QCOMPARE(alarms.first().toMap().value("id").toString(), alarm1Id);
    }
};

int runNativeFocusTest(int argc, char **argv) {
    NativeFocusTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_focus_test.moc"

