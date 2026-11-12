#include "controllers/notes/notes_rich_divider_editing.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextBlock>
#include <QtQuick/QQuickTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesDividerDragQmlTest final : public QObject {
    Q_OBJECT

private slots:
    void dividerDropSignalMovesAndUndoesThroughTheEditor() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *dividerActions = root->findChild<QObject *>("notesDividerActions");
        QVERIFY(toolbar);
        QVERIFY(richEditor);
        QVERIFY(dividerActions);

        const QString source = QStringLiteral(
            "<p>First</p><hr/><p>Middle <strong>bold</strong></p><h2>Last</h2>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", source);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        QObject *textEdit = richEditor->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(textEdit);
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextBlock dividerBlock;
        int targetPosition = -1;
        for (QTextBlock block = quickDocument->textDocument()->begin(); block.isValid(); block = block.next()) {
            if (NotesRichDividerEditing::isDividerAt(*quickDocument->textDocument(), block.position()))
                dividerBlock = block;
            if (block.text() == QStringLiteral("Last")) targetPosition = block.position();
        }
        QVERIFY(dividerBlock.isValid());
        QVERIFY(targetPosition >= 0);
        textEdit->setProperty("cursorPosition", dividerBlock.position());
        QCoreApplication::processEvents();
        QVERIFY(dividerActions->property("visible").toBool());
        const QVariantList actions = dividerActions->property("actions").toList();
        bool hasDragAction = false;
        for (const QVariant &action : actions)
            hasDragAction = hasDragAction || action.toMap().value("value").toString() == QStringLiteral("drag");
        QVERIFY(hasDragAction);

        QVERIFY(QMetaObject::invokeMethod(dividerActions, "dropRequested",
                                          Q_ARG(int, targetPosition), Q_ARG(bool, false)));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<p>First</p><p>Middle <strong>bold</strong></p><hr/><h2>Last</h2>"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);
    }
};

int runNativeNotesDividerDragQmlTest(int argc, char **argv) {
    NativeNotesDividerDragQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_divider_drag_qml_test.moc"
