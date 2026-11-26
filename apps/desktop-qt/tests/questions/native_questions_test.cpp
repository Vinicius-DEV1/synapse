#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeQuestionsTest final : public QObject {
    Q_OBJECT

private slots:
    void noteBatteryCreationReturnsPersistedCoreIdentityAndRejectsMissingPage() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-question-battery.sqlite")));
        const QString pageId = controller.createSubPage(QString(), "Question notes page");
        QVERIFY(!pageId.isEmpty());

        const QString batteryId = controller.createNoteQuizBattery(
            "Notes question battery", QString(), pageId);
        QVERIFY(!batteryId.isEmpty());
        const QVariantList batteries = controller.getQuizBatteries();
        QCOMPARE(batteries.size(), 1);
        QCOMPARE(batteries.first().toMap().value("id").toString(), batteryId);
        QCOMPARE(batteries.first().toMap().value("title").toString(),
                 QString("Notes question battery"));
        QCOMPARE(controller.getQuizBattery(batteryId).value("id").toString(), batteryId);
        QVERIFY(controller.createNoteQuizBattery(
            "Orphan battery", QString(), "missing-notes-page").isEmpty());
        QCOMPARE(controller.getQuizBatteries().size(), 1);
    }

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
        QCOMPARE(controller.getQuizQuestion(questionId).value("id").toString(), questionId);
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

    void batteryAndQuestionLifecycleWithUpdatesAndDeletion() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-questions-edit.sqlite")));
        QVERIFY(controller.createQuizBattery("Initial Battery", "Initial Description"));

        QVariantList batteries = controller.getQuizBatteries();
        QCOMPARE(batteries.size(), 1);
        const QString batteryId = batteries.first().toMap().value("id").toString();
        QVERIFY(!batteryId.isEmpty());

        // Test updating battery
        QVERIFY(controller.updateQuizBattery(batteryId, "Updated Battery", "Updated Description"));
        batteries = controller.getQuizBatteries();
        QCOMPARE(batteries.size(), 1);
        QCOMPARE(batteries.first().toMap().value("title").toString(), QString("Updated Battery"));
        QCOMPARE(batteries.first().toMap().value("description").toString(), QString("Updated Description"));

        // Create question
        QVERIFY(controller.createQuizQuestion(
            batteryId, "Original prompt?", "[\"Opt1\",\"Opt2\",\"Opt3\",\"Opt4\"]", 0, "Original expl", "[\"tag1\"]"));

        QVariantList questions = controller.getBatteryQuestions(batteryId);
        QCOMPARE(questions.size(), 1);
        const QString questionId = questions.first().toMap().value("id").toString();
        QVERIFY(!questionId.isEmpty());

        // Test updating question
        QVERIFY(controller.updateQuizQuestion(
            questionId, "Edited prompt?", "[\"A\",\"B\",\"C\",\"D\"]", 2, "Edited explanation", "[\"tag2\",\"tag3\"]"));

        questions = controller.getBatteryQuestions(batteryId);
        QCOMPARE(questions.size(), 1);
        const QVariantMap updatedQ = questions.first().toMap();
        QCOMPARE(updatedQ.value("question").toString(), QString("Edited prompt?"));
        QCOMPARE(updatedQ.value("options").toString(), QString("[\"A\",\"B\",\"C\",\"D\"]"));
        QCOMPARE(updatedQ.value("correct_index").toInt(), 2);
        QCOMPARE(updatedQ.value("explanation").toString(), QString("Edited explanation"));
        QCOMPARE(updatedQ.value("tags").toString(), QString("[\"tag2\",\"tag3\"]"));

        // Test invalid updates
        QVERIFY(!controller.updateQuizBattery("", "Title", "Desc"));
        QVERIFY(!controller.updateQuizQuestion("", "Prompt", "[\"A\",\"B\"]", 0, "", "[]"));
        QVERIFY(!controller.updateQuizQuestion(questionId, "Prompt", "invalid-json", 0, "", "[]"));
        QVERIFY(!controller.updateQuizQuestion(questionId, "Prompt", "[\"A\",\"B\"]", 3, "", "[]")); // index out of bounds

        // Test deleting question
        QVERIFY(controller.deleteQuizQuestion(questionId));
        questions = controller.getBatteryQuestions(batteryId);
        QCOMPARE(questions.size(), 0);
        QCOMPARE(controller.getAllQuizQuestions().size(), 0);

        // Deleting non-existent question returns false
        QVERIFY(!controller.deleteQuizQuestion("non-existent-id"));
    }
};

int runNativeQuestionsTest(int argc, char **argv) {
    NativeQuestionsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_questions_test.moc"
