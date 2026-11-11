#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeQuestionsTest final : public QObject {
    Q_OBJECT

private slots:
    void questionAttemptsPersistAndErrorNotebookUsesLatestAnswer() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-questions.sqlite")));
        QVERIFY(controller.createQuizBattery("Native Questions", "Persisted native quiz flow"));

        const QVariantList batteries = controller.getQuizBatteries();
        QCOMPARE(batteries.size(), 1);
        const QString batteryId = batteries.first().toMap().value("id").toString();
        QVERIFY(!batteryId.isEmpty());
        QVERIFY(controller.createQuizQuestion(
            batteryId, "Select B", "[\"A\",\"B\"]", 1, "B is correct.", "[\"networks\",\"tcp\"]"));

        const QVariantList questions = controller.getBatteryQuestions(batteryId);
        QCOMPARE(questions.size(), 1);
        const QVariantMap question = questions.first().toMap();
        const QString questionId = question.value("id").toString();
        QCOMPARE(question.value("question").toString(), QString("Select B"));
        QCOMPARE(question.value("correct_index").toInt(), 1);
        QCOMPARE(question.value("options").toString(), QString("[\"A\",\"B\"]"));
        QCOMPARE(question.value("tags").toString(), QString("[\"networks\",\"tcp\"]"));
        QCOMPARE(controller.getAllQuizTags().size(), 2);
        QCOMPARE(controller.getFilteredQuizQuestions({"networks"}, "all", 10, false).size(), 1);
        QCOMPARE(controller.getFilteredQuizQuestions({"missing"}, "all", 10, false).size(), 0);
        QCOMPARE(controller.getFilteredQuizQuestions({}, "unanswered", 10, false).size(), 1);
        QCOMPARE(controller.getFilteredQuizQuestions({}, "incorrect", 10, false).size(), 0);

        QVERIFY(controller.recordQuizAttempt(batteryId, questionId, 0, false));
        QCOMPARE(controller.getErrorNotebookQuestions().size(), 1);
        QCOMPARE(controller.getFilteredQuizQuestions({}, "incorrect", 10, false).size(), 1);
        QCOMPARE(controller.getQuizStats().value("incorrect_questions").toInt(), 1);
        QCOMPARE(controller.getQuizStats().value("reviewable_incorrect_questions").toInt(), 1);

        QVERIFY(controller.recordQuizAttempt(batteryId, questionId, 1, true));
        QVERIFY(controller.getErrorNotebookQuestions().isEmpty());
        QCOMPARE(controller.getFilteredQuizQuestions({}, "incorrect", 10, false).size(), 0);
        QCOMPARE(controller.getFilteredQuizQuestions({}, "unanswered", 10, false).size(), 0);
        const QVariantMap stats = controller.getQuizStats();
        QCOMPARE(stats.value("incorrect_questions").toInt(), 0);
        QCOMPARE(stats.value("reviewable_incorrect_questions").toInt(), 0);
        QCOMPARE(stats.value("answered_questions").toInt(), 1);
        QCOMPARE(stats.value("total_attempts").toInt(), 2);
        QCOMPARE(controller.getRandomSimulationQuestions(10).size(), 1);

        QVERIFY(!controller.recordQuizAttempt(batteryId, questionId, 4, false));
        QVERIFY(!controller.createQuizQuestion(batteryId, "Invalid", "not-json", 0, ""));
    }
};

int runNativeQuestionsTest(int argc, char **argv) {
    NativeQuestionsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_questions_test.moc"
