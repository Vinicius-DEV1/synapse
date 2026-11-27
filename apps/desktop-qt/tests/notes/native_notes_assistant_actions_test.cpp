#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeNotesAssistantActionsTest final : public QObject {
    Q_OBJECT

private slots:
    void duplicatePromptErrorReturnsThroughControllerWithoutPartialInsert() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-assistant-actions.sqlite")));
        QVERIFY(controller.createQuizBattery("Notes assistant", ""));
        const QString batteryId = controller.getQuizBatteries().first()
                                      .toMap()
                                      .value(QStringLiteral("id"))
                                      .toString();
        QVERIFY(!batteryId.isEmpty());

        const QVariantMap originalQuestion = {
            {QStringLiteral("actionType"), QStringLiteral("create")},
            {QStringLiteral("type"), QStringLiteral("open")},
            {QStringLiteral("question"), QStringLiteral("Explain spaced repetition")},
            {QStringLiteral("expectedAnswer"), QStringLiteral("Review at increasing intervals.")},
        };
        const QVariantMap inserted = controller.applyQuizAssistantActions(
            batteryId,
            {originalQuestion});
        QVERIFY2(inserted.value(QStringLiteral("success")).toBool(),
                 qPrintable(inserted.value(QStringLiteral("error")).toString()));

        const QVariantMap duplicateQuestion = {
            {QStringLiteral("actionType"), QStringLiteral("create")},
            {QStringLiteral("type"), QStringLiteral("open")},
            {QStringLiteral("question"), QStringLiteral("  EXPLAIN spaced repetition  ")},
            {QStringLiteral("expectedAnswer"), QStringLiteral("The duplicate response.")},
        };
        const QVariantMap rejected = controller.applyQuizAssistantActions(
            batteryId,
            {duplicateQuestion});

        QVERIFY(!rejected.value(QStringLiteral("success")).toBool());
        QVERIFY(rejected.value(QStringLiteral("error")).toString()
                    .contains(QStringLiteral("same wording already exists")));
        const QVariantList questions = controller.getBatteryQuestions(batteryId);
        QCOMPARE(questions.size(), 1);
        QCOMPARE(questions.first().toMap().value(QStringLiteral("question")).toString(),
                 QStringLiteral("Explain spaced repetition"));
    }
};

int runNativeNotesAssistantActionsTest(int argc, char **argv) {
    NativeNotesAssistantActionsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_assistant_actions_test.moc"
