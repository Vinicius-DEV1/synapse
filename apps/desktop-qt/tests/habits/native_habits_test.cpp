#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeHabitsTest final : public QObject {
    Q_OBJECT

private slots:
    void habitLifecycleAndCheckinToggle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-habits.sqlite")));

        // Initially no habits
        QCOMPARE(controller.getHabits().size(), 0);

        // Create habit
        QVERIFY(controller.createHabit("Daily Reading", "#10b981", "📚", 5));
        QVERIFY(!controller.createHabit("")); // Empty title rejected

        QVariantList habits = controller.getHabits();
        QCOMPARE(habits.size(), 1);
        const QVariantMap habit = habits.first().toMap();
        const QString habitId = habit.value("id").toString();
        QVERIFY(!habitId.isEmpty());
        QCOMPARE(habit.value("title").toString(), QString("Daily Reading"));
        QCOMPARE(habit.value("color").toString(), QString("#10b981"));
        QCOMPARE(habit.value("icon").toString(), QString("📚"));
        QCOMPARE(habit.value("target_days_per_week").toInt(), 5);

        // Update habit
        QVERIFY(controller.updateHabit(habitId, "Deep Reading", "#3b82f6", "📖", 6));
        QVERIFY(!controller.updateHabit(habitId, "")); // Empty title rejected
        QVERIFY(!controller.updateHabit("", "Title")); // Empty id rejected

        habits = controller.getHabits();
        QCOMPARE(habits.size(), 1);
        const QVariantMap updatedHabit = habits.first().toMap();
        QCOMPARE(updatedHabit.value("title").toString(), QString("Deep Reading"));
        QCOMPARE(updatedHabit.value("color").toString(), QString("#3b82f6"));
        QCOMPARE(updatedHabit.value("icon").toString(), QString("📖"));
        QCOMPARE(updatedHabit.value("target_days_per_week").toInt(), 6);

        // Toggle check-in ON
        QCOMPARE(controller.getHabitLogs("2026-11-12").size(), 0);
        QVERIFY(controller.toggleHabitCheckin(habitId, "2026-11-12"));
        QCOMPARE(controller.getHabitLogs("2026-11-12").size(), 1);

        // Range query
        QVariantList rangeLogs = controller.getHabitLogsRange("2026-11-01", "2026-11-15");
        QCOMPARE(rangeLogs.size(), 1);
        QCOMPARE(rangeLogs.first().toMap().value("habit_id").toString(), habitId);
        QCOMPARE(rangeLogs.first().toMap().value("date").toString(), QString("2026-11-12"));

        // Toggle check-in OFF
        QVERIFY(controller.toggleHabitCheckin(habitId, "2026-11-12"));
        QCOMPARE(controller.getHabitLogs("2026-11-12").size(), 0);
        QCOMPARE(controller.getHabitLogsRange("2026-11-01", "2026-11-15").size(), 0);

        // Delete habit
        QVERIFY(controller.deleteHabit(habitId));
        QCOMPARE(controller.getHabits().size(), 0);
        QVERIFY(!controller.deleteHabit(""));
    }
};

int runNativeHabitsTest(int argc, char **argv) {
    NativeHabitsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_habits_test.moc"

