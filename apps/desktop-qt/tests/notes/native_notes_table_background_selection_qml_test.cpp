#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtQuick/QQuickTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesTableBackgroundSelectionQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void paletteColorsExactlyTheSelectedRectangleAndRejectsCrossTableRanges() {
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
        QObject *palette = root->findChild<QObject *>("notesTableCellBackgroundPalette");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(tableActions);
        QVERIFY(palette);

        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td><td><p>Outside A</p></td></tr>"
            "<tr><td><p>Body C</p></td><td><p>Body D</p></td><td><p>Outside B</p></td></tr></tbody></table>");
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
        QVERIFY(palette->property("selectionAvailable").toBool());

        QVariant scopeSelected;
        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("selection")))));
        QVERIFY(scopeSelected.toBool());
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected",
            Q_ARG(QString, QStringLiteral("rgba(59, 130, 246, 0.2)")),
            Q_ARG(QString, QStringLiteral("selection"))));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 4);
        QVERIFY(html.contains("Body A") && html.contains("Body B") && html.contains("Body C") && html.contains("Body D"));
        QVERIFY(html.contains("Outside A") && html.contains("Outside B"));
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(!html.contains("data-bg-color="));
        QVERIFY(NotesRichDocument::supportsSource(html));

        const QString tablesSource = QStringLiteral(
            "<table><tbody><tr><td><p>First table</p></td><td><p>First end</p></td></tr></tbody></table>"
            "<p>Between</p><table><tbody><tr><td><p>Second table</p></td><td><p>Second end</p></td></tr></tbody></table>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", tablesSource);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        table = nullptr;
        QTextTable *lastTable = nullptr;
        const auto frames = quickDocument->textDocument()->rootFrame()->childFrames();
        for (QTextFrame *frame : frames) {
            if (auto *candidate = qobject_cast<QTextTable *>(frame)) {
                if (!table) table = candidate;
                else lastTable = candidate;
            }
        }
        QVERIFY(table);
        QVERIFY(lastTable);
        selection = QTextCursor(quickDocument->textDocument());
        selection.setPosition(table->cellAt(0, 0).firstCursorPosition().position());
        selection.setPosition(lastTable->cellAt(0, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, selection.selectionStart()),
                                          Q_ARG(int, selection.selectionEnd())));
        QTRY_VERIFY(!tableActions->property("canColorSelectedCells").toBool());
        QVERIFY(!palette->property("selectionAvailable").toBool());
        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("selection")))));
        QVERIFY(!scopeSelected.toBool());
    }
};

int runNativeNotesTableBackgroundSelectionQmlTest(int argc, char **argv) {
    NativeNotesTableBackgroundSelectionQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_background_selection_qml_test.moc"
