#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_table_cell_formatting.h"
#include "controllers/notes/notes_rich_tables.h"

#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextTable>
#include <QtTest/QtTest>

class NativeNotesRichTablesTest final : public QObject {
    Q_OBJECT

private slots:
    void sourceValidationKeepsOnlyUniformPlainTables() {
        const QString supported = QStringLiteral(
            "<table><tbody><tr><th><p>Name</p></th><th><p>Value</p></th></tr>"
            "<tr><td><p>Alpha</p></td><td><p><em>42</em></p></td></tr></tbody></table>");
        QVERIFY(NotesRichDocument::supportsSource(supported));
        QVERIFY(NotesRichDocument::supportsSource(
            "<p>Before</p>" + supported + "<p>After</p>"));
        QVERIFY(NotesRichDocument::supportsSource(
            "<table><tbody><tr><th colspan=\"1\"><p>A</p></th><th rowspan=\"1\"><p>B</p></th></tr>"
            "<tr><td><p>C</p></td><td><p>D</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tr><th><p>A</p></th></tr><tr><td><p>B</p></td><td><p>C</p></td></tr></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tr><th colspan=\"2\"><p>Merged</p></th></tr></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tr><th data-column-type=\"number\"><p>Number</p></th></tr></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tr><td style=\"width:120px\"><p>Resized</p></td></tr></table>"));
        QVERIFY(NotesRichDocument::supportsSource(
            "<table><tbody><tr><td data-bg-color=\"rgba(239, 68, 68, 0.2)\" "
            "style=\"background-color: rgba(239, 68, 68, 0.2) !important;\"><p>Colored</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tbody><tr><td data-bg-color=\"#fff000\"><p>Colored</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tr><td data-bg-color=\"rgba(239, 68, 68, 0.2)\" "
            "style=\"background-color: rgba(34, 197, 94, 0.2) !important;\"><p>Mismatch</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tbody><tr><td data-bg-color=\"rgba(239, 68, 68, 0.2)\" style=\"width:120px\"><p>Unsafe</p></td></tr></tbody></table>"));
    }

    void tableSerializationPreservesCellsMarksAndSurroundingParagraphs() {
        const QString source = QStringLiteral(
            "<p>Before</p><table><tbody><tr><th><p>Heading <strong>emphasis</strong></p></th>"
            "<th><p>Count</p></th></tr><tr><td><p>Alpha</p></td><td><p><em>42</em></p></td></tr>"
            "</tbody></table><h2>After</h2>");
        QVERIFY(NotesRichDocument::supportsSource(source));
        QTextDocument document;
        document.setHtml(source);
        NotesRichDocument::prepareHeadingStyles(document, source);
        const QString html = NotesRichDocument::serialize(document);
        QVERIFY2(!html.isNull(), qPrintable(html));
        QVERIFY2(html.contains("<th><p>Heading <strong>emphasis</strong></p></th>"), qPrintable(html));
        QVERIFY(html.contains("<td><p><em>42</em></p></td>"));
        QVERIFY(html.endsWith("<h2>After</h2>"));
        QVERIFY(NotesRichDocument::supportsSource(html));
        QTextDocument roundTrip;
        roundTrip.setHtml(html);
        NotesRichDocument::prepareHeadingStyles(roundTrip, html);
        QCOMPARE(roundTrip.toPlainText(), document.toPlainText());
        QCOMPARE(NotesRichDocument::serialize(roundTrip), html);
    }

    void cellBackgroundsRoundTripAndRemainUndoable() {
        const QString red = QStringLiteral("rgba(239, 68, 68, 0.2)");
        const QString blue = QStringLiteral("rgba(59, 130, 246, 0.2)");
        const QString source = QStringLiteral(
            "<table><tbody><tr><th data-bg-color=\"%1\" style=\"background-color: %1 !important;\"><p>Header</p></th></tr>"
            "<tr><td data-bg-color=\"%2\" style=\"background-color: %2 !important;\"><p>Body</p></td></tr>"
            "<tr><td><p>Plain</p></td></tr></tbody></table>").arg(red, blue);
        QVERIFY(NotesRichDocument::supportsSource(source));
        const QString editorSource = NotesRichTableCellFormatting::editorMarkup(source);
        QVERIFY(editorSource.contains("style=\"background-color: rgba(239, 68, 68, 0.200)\""));
        QVERIFY(!editorSource.contains("data-bg-color"));

        QTextDocument document;
        document.setHtml(editorSource);
        NotesRichDocument::prepareHeadingStyles(document, source);
        QString saved = NotesRichDocument::serialize(document);
        QVERIFY2(!saved.isNull(), qPrintable(saved));
        QVERIFY(saved.contains("<th data-bg-color=\"rgba(239, 68, 68, 0.200)\""));
        QVERIFY(saved.contains("<td data-bg-color=\"rgba(59, 130, 246, 0.200)\""));
        QVERIFY(NotesRichDocument::supportsSource(saved));
        const QString original = saved;

        QTextTable *table = qobject_cast<QTextTable *>(document.rootFrame()->childFrames().value(0));
        QVERIFY(table);
        const int position = table->cellAt(2, 0).firstCursorPosition().position();
        QVERIFY(NotesRichTableCellFormatting::setBackground(document, position, red));
        saved = NotesRichDocument::serialize(document);
        QVERIFY2(!saved.isNull(), qPrintable(saved));
        QVERIFY(saved.contains("<td data-bg-color=\"rgba(239, 68, 68, 0.200)\""));
        QVERIFY(saved.contains("<td data-bg-color=\"rgba(59, 130, 246, 0.200)\""));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTableCellFormatting::setBackground(document, position, red));
        QVERIFY(NotesRichTableCellFormatting::setBackground(document, position, QString()));
        QCOMPARE(NotesRichDocument::serialize(document), original);
        document.undo();
        saved = NotesRichDocument::serialize(document);
        QVERIFY(saved.contains("<td data-bg-color=\"rgba(239, 68, 68, 0.200)\""));
        QVERIFY(!NotesRichTableCellFormatting::setBackground(document, position, QStringLiteral("#ffffff")));
    }

    void customCellBackgroundSurvivesStructuralEditsAndUndo() {
        const QString color = QStringLiteral("rgba(34, 197, 94, 0.2)");
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header</p></th></tr>"
            "<tr><td data-bg-color=\"%1\" style=\"background-color: %1 !important;\"><p>Body</p></td></tr>"
            "</tbody></table>").arg(color);
        QTextDocument document;
        document.setHtml(NotesRichTableCellFormatting::editorMarkup(source));
        NotesRichDocument::prepareHeadingStyles(document, source);
        const QString original = NotesRichDocument::serialize(document);
        auto *table = qobject_cast<QTextTable *>(document.rootFrame()->childFrames().value(0));
        QVERIFY(table);
        const int position = table->cellAt(1, 0).firstCursorPosition().position();
        QVERIFY(NotesRichTables::applyStructureAction(document, position, QStringLiteral("rowAfter")));
        const QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.contains("data-bg-color=\"rgba(34, 197, 94, 0.200)\""));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void insertedTableIsUndoableAndKeepsExistingText() {
        QTextDocument document;
        document.setPlainText("BeforeAfter");
        const QString originalText = document.toPlainText();
        const int cursorPosition = NotesRichTables::insertSimpleTable(document, 6, 6);
        QVERIFY(cursorPosition >= 0);
        QCOMPARE(document.rootFrame()->childFrames().size(), 1);
        auto *table = qobject_cast<QTextTable *>(document.rootFrame()->childFrames().constFirst());
        QVERIFY(table);
        QCOMPARE(table->rows(), 3);
        QCOMPARE(table->columns(), 3);
        QCOMPARE(table->format().cellSpacing(), 0.0);
        QCOMPARE(table->format().width().type(), QTextLength::PercentageLength);
        QCOMPARE(table->cellAt(0, 0).format().property(QTextFormat::TableCellLeftPadding).toDouble(), 12.0);
        QCOMPARE(table->cellAt(0, 0).format().background().color().alpha(), 13);
        QVERIFY(!table->cellAt(1, 0).format().hasProperty(QTextFormat::BackgroundBrush));
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        QTextCursor cell = table->cellAt(1, 1).firstCursorPosition();
        cell.insertText("Editable");
        const QString saved = NotesRichDocument::serialize(document);
        QVERIFY2(!saved.isNull(), qPrintable(saved));
        QVERIFY(saved.contains("<td><p>Editable</p></td>"));
        document.undo();
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(document.toPlainText(), originalText);
    }

    void structuralTableActionsPreserveHeaderAndUndo() {
        const QString source = QStringLiteral(
            "<p>Before</p><table><tbody><tr><th><p>Heading <strong>emphasis</strong></p></th>"
            "<th><p>Count</p></th></tr><tr><td><p>Alpha</p></td><td><p>42</p></td></tr>"
            "<tr><td><p>Beta</p></td><td><p>84</p></td></tr></tbody></table><p>After</p>");
        QTextDocument document;
        document.setHtml(source);
        NotesRichDocument::prepareHeadingStyles(document, source);
        const QString original = NotesRichDocument::serialize(document);
        QVERIFY(!original.isNull());
        auto table = [&document]() {
            return qobject_cast<QTextTable *>(document.rootFrame()->childFrames().value(0));
        };
        auto cellPosition = [&table](int row, int column) {
            QTextTable *current = table();
            return current ? current->cellAt(row, column).firstCursorPosition().position() : -1;
        };

        QVERIFY(NotesRichTables::isCellAt(document, cellPosition(0, 0)));
        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(0, 0), "rowBefore"));
        QCOMPARE(table()->rows(), 4);
        QVERIFY(table()->cellAt(0, 0).format().fontWeight() >= QFont::Bold);
        QVERIFY(table()->cellAt(1, 0).format().fontWeight() < QFont::Bold);
        QString html = NotesRichDocument::serialize(document);
        QVERIFY2(!html.isNull(), qPrintable(html));
        QVERIFY(html.contains("<td><p>Heading <strong>emphasis</strong></p></td>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(1, 0), "rowAfter"));
        QCOMPARE(table()->rows(), 4);
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(1, 0), "deleteRow"));
        QCOMPARE(table()->rows(), 2);
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(0, 1), "columnBefore"));
        QCOMPARE(table()->columns(), 3);
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(1, 0), "columnAfter"));
        QCOMPARE(table()->columns(), 3);
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(1, 0), "deleteColumn"));
        QCOMPARE(table()->columns(), 1);
        QVERIFY(!NotesRichDocument::serialize(document).isNull());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::canApplyStructureAction(document, cellPosition(1, 0), "moveRowDown"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(1, 0), "moveRowUp"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(0, 0), "moveRowDown"));
        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(1, 0), "moveRowDown"));
        html = NotesRichDocument::serialize(document);
        QVERIFY2(!html.isNull(), qPrintable(html));
        QVERIFY(html.indexOf("Beta") < html.indexOf("Alpha"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::canApplyStructureAction(document, cellPosition(0, 1), "moveColumnLeft"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(0, 0), "moveColumnLeft"));
        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(0, 1), "moveColumnLeft"));
        html = NotesRichDocument::serialize(document);
        QVERIFY2(!html.isNull(), qPrintable(html));
        QVERIFY(html.indexOf("<th><p>Count</p></th>") < html.indexOf("<th><p>Heading"));
        QVERIFY(html.contains("<td><p>42</p></td><td><p>Alpha</p></td>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(0, 0), "moveColumnRight"));
        html = NotesRichDocument::serialize(document);
        QVERIFY2(!html.isNull(), qPrintable(html));
        QVERIFY(html.indexOf("<th><p>Count</p></th>") < html.indexOf("<th><p>Heading"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void deletingTableRemovesOnlyThatFrameAndCanUndo() {
        const QString source = QStringLiteral(
            "<p>Before</p><table><tbody><tr><th><p>A</p></th></tr>"
            "<tr><td><p>B</p></td></tr></tbody></table><p>After</p>");
        QTextDocument document;
        document.setHtml(source);
        NotesRichDocument::prepareHeadingStyles(document, source);
        const QString original = NotesRichDocument::serialize(document);
        auto *table = qobject_cast<QTextTable *>(document.rootFrame()->childFrames().value(0));
        QVERIFY(table);
        const int position = table->cellAt(1, 0).firstCursorPosition().position();

        QVERIFY(NotesRichTables::applyStructureAction(document, position, "deleteTable"));
        QVERIFY(document.rootFrame()->childFrames().isEmpty());
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral("<p>Before</p><p>After</p>"));
        document.undo();
        QVERIFY(qobject_cast<QTextTable *>(document.rootFrame()->childFrames().value(0)));
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }
};

int runNativeNotesRichTablesTest(int argc, char **argv) {
    NativeNotesRichTablesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_tables_test.moc"
