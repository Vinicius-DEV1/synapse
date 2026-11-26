#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeNotesOpenAnswerControllerTest final : public QObject {
    Q_OBJECT

private slots:
    void latestAttemptSurvivesNotesControllerReopen() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString databasePath = sandbox.filePath("notes-open-answer.sqlite");
        QString batteryId;
        QString questionId;
        QString attemptId;

        {
            SynapseDataController controller(nullptr, false);
            QVERIFY(controller.openDatabase(databasePath));

            const QString pageId = controller.createSubPage("", "Open answer note", "📄");
            QVERIFY(!pageId.isEmpty());
            batteryId = controller.createNoteQuizBattery("Notes open answer", "", pageId);
            QVERIFY(!batteryId.isEmpty());

            const QVariantMap createQuestionAction = {
                {QStringLiteral("actionType"), QStringLiteral("create")},
                {QStringLiteral("type"), QStringLiteral("open")},
                {QStringLiteral("question"), QStringLiteral("Explain the concept")},
                {QStringLiteral("options"), QVariantList{}},
                {QStringLiteral("expectedAnswer"), QStringLiteral("A complete reference answer")},
                {QStringLiteral("explanation"), QStringLiteral("The core principle is conservation.")},
                {QStringLiteral("tags"), QVariantList{}},
            };
            const QVariantMap createResult = controller.applyQuizAssistantActions(
                batteryId,
                {createQuestionAction});
            QVERIFY2(createResult.value(QStringLiteral("success")).toBool(),
                     qPrintable(createResult.value(QStringLiteral("error")).toString()));

            const QVariantList createdQuestions = createResult.value(QStringLiteral("questions")).toList();
            QCOMPARE(createdQuestions.size(), 1);
            questionId = createdQuestions.first().toMap().value(QStringLiteral("id")).toString();
            QVERIFY(!questionId.isEmpty());

            const QVariantMap saved = controller.recordOpenQuizAttempt(
                batteryId,
                questionId,
                "My typed response",
                "Parcial",
                "Add one supporting detail.",
                "gemini-flash-latest");
            QVERIFY(!saved.isEmpty());
            attemptId = saved.value(QStringLiteral("id")).toString();
            QVERIFY(!attemptId.isEmpty());
            QCOMPARE(saved.value(QStringLiteral("user_typed_answer")).toString(),
                     QStringLiteral("My typed response"));
            QCOMPARE(saved.value(QStringLiteral("ai_feedback")).toMap()
                         .value(QStringLiteral("verdict")).toString(),
                     QStringLiteral("Parcial"));
        }

        {
            SynapseDataController reopenedController(nullptr, false);
            QVERIFY(reopenedController.openDatabase(databasePath));
            const QVariantMap latestByQuestion = reopenedController.getLatestQuizAttempts(
                batteryId,
                questionId);
            QVERIFY(latestByQuestion.contains(questionId));

            const QVariantMap restored = latestByQuestion.value(questionId).toMap();
            QCOMPARE(restored.value(QStringLiteral("id")).toString(), attemptId);
            QCOMPARE(restored.value(QStringLiteral("battery_id")).toString(), batteryId);
            QCOMPARE(restored.value(QStringLiteral("question_id")).toString(), questionId);
            QCOMPARE(restored.value(QStringLiteral("type_")).toString(), QStringLiteral("open"));
            QCOMPARE(restored.value(QStringLiteral("user_typed_answer")).toString(),
                     QStringLiteral("My typed response"));
            QCOMPARE(restored.value(QStringLiteral("ai_feedback")).toMap()
                         .value(QStringLiteral("feedback")).toString(),
                     QStringLiteral("Add one supporting detail."));
        }
    }
};

int runNativeNotesOpenAnswerControllerTest(int argc, char **argv) {
    NativeNotesOpenAnswerControllerTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_open_answer_controller_test.moc"
