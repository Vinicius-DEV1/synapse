#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesShortcutsTest final : public QObject {
    Q_OBJECT

private slots:
    void notesShortcutsDispatchThroughVisibleQuickWindow() {
        QQmlEngine engine;
        QQmlComponent focusModalComponent(
            &engine,
            QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                + QStringLiteral("/qml/questions/QuizSequentialFocusModal.qml")));
        QVERIFY2(focusModalComponent.isReady(), qPrintable(focusModalComponent.errorString()));
        QObject *focusModalObject = focusModalComponent.create();
        QVERIFY2(focusModalObject != nullptr, qPrintable(focusModalComponent.errorString()));

        auto *focusModal = qobject_cast<QQuickItem *>(focusModalObject);
        QVERIFY(focusModal != nullptr);

        QQuickWindow window;
        window.resize(960, 720);
        focusModal->setParentItem(window.contentItem());
        focusModal->setWidth(window.width());
        focusModal->setHeight(window.height());
        focusModalObject->setProperty("enableNotesOpenAnswerEvaluation", true);

        const QVariantMap firstQuestion = {
            {QStringLiteral("id"), QStringLiteral("open-1")},
            {QStringLiteral("type"), QStringLiteral("open")},
            {QStringLiteral("prompt"), QStringLiteral("Explain the first idea")},
            {QStringLiteral("expectedAnswer"), QStringLiteral("A complete reference answer")},
            {QStringLiteral("explanation"), QStringLiteral("First explanation")},
            {QStringLiteral("options"), QVariantList{}},
        };
        const QVariantMap secondQuestion = {
            {QStringLiteral("id"), QStringLiteral("open-2")},
            {QStringLiteral("type"), QStringLiteral("open")},
            {QStringLiteral("prompt"), QStringLiteral("Explain the second idea")},
            {QStringLiteral("expectedAnswer"), QStringLiteral("Another complete answer")},
            {QStringLiteral("explanation"), QStringLiteral("Second explanation")},
            {QStringLiteral("options"), QVariantList{}},
        };
        const QVariantList questions = {firstQuestion, secondQuestion};
        QVERIFY(QMetaObject::invokeMethod(
            focusModalObject,
            "startQuiz",
            Q_ARG(QVariant, QVariant(QStringLiteral("notes-battery"))),
            Q_ARG(QVariant, QVariant(QStringLiteral("Notes keyboard session"))),
            Q_ARG(QVariant, QVariant(questions))));

        window.show();
        window.requestActivate();
        QCoreApplication::processEvents();
        QVERIFY(window.isVisible());

        auto *answerInput = focusModalObject->findChild<QQuickItem *>(
            QStringLiteral("notesOpenAnswerInput"));
        QVERIFY(answerInput != nullptr);
        answerInput->forceActiveFocus();
        QTRY_VERIFY(focusModalObject->property("openAnswerInputFocused").toBool());
        QTest::keyClick(&window, Qt::Key_G);
        QCOMPARE(focusModalObject->property("openAnswer").toString(), QStringLiteral("g"));
        QVERIFY(!focusModalObject->property("showExplanation").toBool());
        answerInput->setProperty("text", QStringLiteral("Draft through the active field"));

        QTest::keyClick(&window, Qt::Key_G, Qt::ControlModifier);
        QTRY_VERIFY(focusModalObject->property("showExplanation").toBool());
        QTest::keyClick(&window, Qt::Key_G, Qt::AltModifier);
        QTRY_VERIFY(!focusModalObject->property("showExplanation").toBool());
        QTest::keyClick(&window, Qt::Key_G, Qt::ControlModifier);
        QTRY_VERIFY(focusModalObject->property("showExplanation").toBool());
        QTest::keyClick(&window, Qt::Key_Space);
        QCOMPARE(focusModalObject->property("currentIndex").toInt(), 0);
        answerInput->setProperty("text", QStringLiteral("Draft through the active field"));
        QTest::keyClick(&window, Qt::Key_Right, Qt::AltModifier);
        QTRY_COMPARE(focusModalObject->property("currentIndex").toInt(), 1);
        QCOMPARE(focusModalObject->property("openAnswer").toString(), QString());

        QTest::keyClick(&window, Qt::Key_Left, Qt::AltModifier);
        QTRY_COMPARE(focusModalObject->property("currentIndex").toInt(), 0);
        QCOMPARE(focusModalObject->property("openAnswer").toString(),
                 QStringLiteral("Draft through the active field"));
        QVERIFY(!focusModalObject->property("showExplanation").toBool());

        focusModal->forceActiveFocus();
        QTRY_VERIFY(!focusModalObject->property("openAnswerInputFocused").toBool());
        QTest::keyClick(&window, Qt::Key_G);
        QTRY_VERIFY(focusModalObject->property("showExplanation").toBool());
        QTest::keyClick(&window, Qt::Key_Space);
        QCOMPARE(focusModalObject->property("currentIndex").toInt(), 0);
        QVERIFY(focusModalObject->property("showExplanation").toBool());

        focusModalObject->setProperty("answeredQuestions", QVariantList{true, false});
        focusModalObject->setProperty("isConfirmed", true);
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_COMPARE(focusModalObject->property("currentIndex").toInt(), 1);
        focusModalObject->setProperty("requireFinishConfirmation", true);
        focusModalObject->setProperty("isConfirmed", true);
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_VERIFY(focusModalObject->property("showFinishConfirmation").toBool());

        const QVariantMap multipleChoiceQuestion = {
            {QStringLiteral("id"), QStringLiteral("choice-1")},
            {QStringLiteral("type"), QStringLiteral("multiple_choice")},
            {QStringLiteral("prompt"), QStringLiteral("Choose one of seven options")},
            {QStringLiteral("options"), QVariantList{
                 QStringLiteral("A"), QStringLiteral("B"), QStringLiteral("C"),
                 QStringLiteral("D"), QStringLiteral("E"), QStringLiteral("F"),
                 QStringLiteral("G")}},
            {QStringLiteral("correctIndex"), 0},
            {QStringLiteral("explanation"), QStringLiteral("Choice explanation")},
        };
        QVERIFY(QMetaObject::invokeMethod(
            focusModalObject,
            "startQuiz",
            Q_ARG(QVariant, QVariant(QStringLiteral("notes-battery"))),
            Q_ARG(QVariant, QVariant(QStringLiteral("Notes keyboard choices"))),
            Q_ARG(QVariant, QVariant(QVariantList{multipleChoiceQuestion}))));
        focusModal->forceActiveFocus();
        QCoreApplication::processEvents();
        QVERIFY(focusModal->hasActiveFocus());
        QVERIFY(focusModalObject->property("notesOptionShortcutsEnabled").toBool());
        QVariant gOptionIndex;
        QVERIFY(QMetaObject::invokeMethod(
            focusModalObject,
            "notesOptionIndexForKey",
            Q_RETURN_ARG(QVariant, gOptionIndex),
            Q_ARG(QVariant, QVariant(static_cast<int>(Qt::Key_G)))));
        QCOMPARE(gOptionIndex.toInt(), 6);
        QTest::keyClick(&window, Qt::Key_G);
        QTRY_COMPARE(focusModalObject->property("selectedOption").toInt(), 6);
        QVERIFY(!focusModalObject->property("showExplanation").toBool());
        focusModalObject->setProperty("selectedOption", -1);
        QTest::keyClick(&window, Qt::Key_7);
        QTRY_COMPARE(focusModalObject->property("selectedOption").toInt(), 6);

        delete focusModalObject;
        window.hide();
    }

};

int runNativeNotesShortcutsTest(int argc, char **argv) {
    NativeNotesShortcutsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_shortcuts_test.moc"
