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

class NativeNotesTableCellSelectionQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void accessibleSelectionActionsDriveFormattingScopes() {
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
        QObject *selectionActions = root->findChild<QObject *>("notesTableSelectionActions");
        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(tableActions);
        QVERIFY(selectionActions);
        QVERIFY(toolbar);

        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td><td><p>Body C</p></td></tr>"
            "<tr><td><p>Body D</p></td><td><p>Body E</p></td><td><p>Body F</p></td></tr></tbody></table>");
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
        const int activePosition = table->cellAt(1, 1).firstCursorPosition().position();
        textEdit->setProperty("cursorPosition", activePosition);
        QTRY_VERIFY(tableActions->property("isInsideTable").toBool());
        QTRY_VERIFY(selectionActions->property("visible").toBool());
        QObject *rowButton = root->findChild<QObject *>("notesTableSelectRow");
        QObject *columnButton = root->findChild<QObject *>("notesTableSelectColumn");
        QObject *tableButton = root->findChild<QObject *>("notesTableSelectTable");
        QVERIFY(rowButton);
        QVERIFY(columnButton);
        QVERIFY(tableButton);
        auto *rowAccessible = QAccessible::queryAccessibleInterface(rowButton);
        QVERIFY(rowAccessible);
        QCOMPARE(rowAccessible->text(QAccessible::Name), QStringLiteral("Select current row"));

        QVERIFY(QMetaObject::invokeMethod(rowButton, "click"));
        QTRY_COMPARE(tableActions->property("selectionScope").toString(), QStringLiteral("row"));
        QVERIFY(rowButton->property("checked").toBool());
        QVERIFY(tableActions->property("canColorSelectedCells").toBool());
        auto *quickDocumentObject = quickDocument->textDocument();
        int firstRow = -1;
        int rowCount = 0;
        int firstColumn = -1;
        int columnCount = 0;
        QTextCursor selection(quickDocumentObject);
        selection.setPosition(textEdit->property("selectionStart").toInt());
        selection.setPosition(textEdit->property("selectionEnd").toInt(), QTextCursor::KeepAnchor);
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 1);
        QCOMPARE(rowCount, 1);
        QCOMPARE(firstColumn, 0);
        QCOMPARE(columnCount, 3);

        QVariant edited;
        QVERIFY(QMetaObject::invokeMethod(tableActions, "setCellBackground", Q_RETURN_ARG(QVariant, edited),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("rgba(59, 130, 246, 0.2)"))),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("selection")))));
        QVERIFY(edited.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, edited)));
        QVERIFY(edited.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 3);
        QVERIFY(NotesRichDocument::supportsSource(html));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, edited)));
        QVERIFY(edited.toBool());
        QVERIFY(!richEditor->property("sourceHtml").toString().contains("data-bg-color="));

        QVERIFY(QMetaObject::invokeMethod(columnButton, "click"));
        QTRY_COMPARE(tableActions->property("selectionScope").toString(), QStringLiteral("column"));
        QVERIFY(columnButton->property("checked").toBool());
        QVERIFY(tableActions->property("canColorSelectedCells").toBool());
        selection.setPosition(textEdit->property("selectionStart").toInt());
        selection.setPosition(textEdit->property("selectionEnd").toInt(), QTextCursor::KeepAnchor);
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstColumn, 0);

        QVERIFY(QMetaObject::invokeMethod(tableButton, "click"));
        QTRY_COMPARE(tableActions->property("selectionScope").toString(), QStringLiteral("table"));
        QVERIFY(tableButton->property("checked").toBool());
        QVERIFY(tableActions->property("canColorSelectedCells").toBool());
    }
};

int runNativeNotesTableCellSelectionQmlTest(int argc, char **argv) {
    NativeNotesTableCellSelectionQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_cell_selection_qml_test.moc"
