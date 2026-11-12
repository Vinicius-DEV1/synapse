#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QAccessible>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtQuick/QQuickTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesTableClearFormattingQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void accessibleToolbarActionClearsSelectionAndUndoesAsOneStep() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *tableActions = root->findChild<QObject *>("notesRichTableEditorActions");
        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QObject *clearAction = root->findChild<QObject *>("notesClearTableSelectionFormatting");
        QVERIFY(richEditor && textEdit && tableActions && toolbar && clearAction);

        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td><p><strong><em>Body A</em></strong></p></td><td><p><a href=\"https://example.com\">Body B</a></p></td>"
            "<td><p>Outside A</p></td></tr><tr><td><p><mark style=\"background-color: #EAB308\">Body C</mark></p></td>"
            "<td><p><code>Body D</code></p></td><td><p>Outside B</p></td></tr></tbody></table>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", source);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextTable *table = nullptr;
        for (QTextFrame *frame : quickDocument->textDocument()->rootFrame()->childFrames())
            if (auto *candidate = qobject_cast<QTextTable *>(frame)) table = candidate;
        QVERIFY(table);

        QTextCursor selection(quickDocument->textDocument());
        selection.setPosition(table->cellAt(1, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(2, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, selection.selectionStart()),
                                          Q_ARG(int, selection.selectionEnd())));
        QTRY_VERIFY(tableActions->property("canColorSelectedCells").toBool());
        QVERIFY(clearAction->property("visible").toBool());
        auto *accessible = QAccessible::queryAccessibleInterface(clearAction);
        QVERIFY(accessible);
        QCOMPARE(accessible->text(QAccessible::Name), QStringLiteral("Clear formatting in selected cells"));

        QVERIFY(QMetaObject::invokeMethod(clearAction, "click"));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QVERIFY2(NotesRichDocument::supportsSource(html), qPrintable(html));
        QVERIFY(html.contains("Header A") && html.contains("Outside A") && html.contains("Outside B"));
        QVERIFY(!html.contains("<strong>") && !html.contains("<em>") && !html.contains("<a href=") &&
                !html.contains("<mark") && !html.contains("<code>"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(html.contains("<strong>") && html.contains("<em>") && html.contains("<a href=") &&
                html.contains("<mark") && html.contains("<code>"));
    }
};

int runNativeNotesTableClearFormattingQmlTest(int argc, char **argv) {
    NativeNotesTableClearFormattingQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_clear_formatting_qml_test.moc"
