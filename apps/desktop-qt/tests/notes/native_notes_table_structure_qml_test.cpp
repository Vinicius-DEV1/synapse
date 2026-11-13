#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtQuick/QQuickTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesTableStructureQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void toolbarEditsMergedRowsAndColumnsWithUndo() {
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
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(tableActions);
        QVERIFY(toolbar);

        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>H0</p></th><th><p>H1</p></th><th><p>H2</p></th></tr>"
            "<tr><td rowspan=\"2\"><p>Vertical</p></td><td colspan=\"2\"><p>Horizontal</p></td></tr>"
            "<tr><td><p>Right A</p></td><td><p>Right B</p></td></tr>"
            "<tr><td><p>Footer A</p></td><td><p>Footer B</p></td><td><p>Footer C</p></td></tr></tbody></table>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", source);
        richEditor->setProperty("active", true);
        QVariant result;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        auto *table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        QVERIFY(table);

        textEdit->setProperty("cursorPosition", table->cellAt(2, 1).firstCursorPosition().position());
        QTRY_VERIFY(tableActions->property("isInsideTable").toBool());
        QVERIFY(QMetaObject::invokeMethod(tableActions, "canEditTable", Q_RETURN_ARG(QVariant, result),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("rowBefore")))));
        QVERIFY(result.toBool());
        QVERIFY(QMetaObject::invokeMethod(tableActions, "canEditTable", Q_RETURN_ARG(QVariant, result),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("moveRowUp")))));
        QVERIFY(result.toBool());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveRowUp"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        QVERIFY(table);
        QCOMPARE(table->rows(), 4);
        QCOMPARE(table->cellAt(0, 0).rowSpan(), 2);
        QVERIFY(NotesRichDocument::supportsSource(richEditor->property("sourceHtml").toString()));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);

        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        textEdit->setProperty("cursorPosition", table->cellAt(2, 1).firstCursorPosition().position());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("rowBefore"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        QVERIFY(table);
        QCOMPARE(table->rows(), 5);
        QCOMPARE(table->cellAt(1, 0).rowSpan(), 3);
        QVERIFY(NotesRichDocument::supportsSource(richEditor->property("sourceHtml").toString()));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);

        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        textEdit->setProperty("cursorPosition", table->cellAt(2, 2).firstCursorPosition().position());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("columnBefore"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        QCOMPARE(table->columns(), 4);
        QCOMPARE(table->cellAt(1, 1).columnSpan(), 3);
        QVERIFY(NotesRichDocument::supportsSource(richEditor->property("sourceHtml").toString()));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);

        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        textEdit->setProperty("cursorPosition", table->cellAt(3, 0).firstCursorPosition().position());
        QVERIFY(QMetaObject::invokeMethod(tableActions, "selectCells", Q_RETURN_ARG(QVariant, result),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("row")))));
        QVERIFY(result.toBool());
        QCOMPARE(tableActions->property("selectionScope").toString(), QStringLiteral("row"));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("deleteRow"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        table = qobject_cast<QTextTable *>(quickDocument->textDocument()->rootFrame()->childFrames().value(0));
        QVERIFY(table);
        QCOMPARE(table->rows(), 3);
        QVERIFY(!richEditor->property("sourceHtml").toString().contains("Footer A"));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, result)));
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);
    }
};

int runNativeNotesTableStructureQmlTest(int argc, char **argv) {
    NativeNotesTableStructureQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_structure_qml_test.moc"
