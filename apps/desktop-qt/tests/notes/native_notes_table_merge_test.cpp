#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_table_merging.h"
#include "controllers/notes/notes_rich_tables.h"

#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtTest/QtTest>

namespace {
QTextTable *firstTable(QTextDocument &document) {
    for (QTextFrame *frame : document.rootFrame()->childFrames())
        if (auto *table = qobject_cast<QTextTable *>(frame)) return table;
    return nullptr;
}
}

class NativeNotesTableMergeTest final : public QObject {
    Q_OBJECT
private slots:
    void rectangularMergeAndSplitRoundTripWithUndo() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th></tr>"
            "<tr><td data-bg-color=\"rgba(239, 68, 68, 0.2)\" "
            "style=\"background-color: rgba(239, 68, 68, 0.2) !important;\"><p>Cell A</p></td>"
            "<td><p>Cell B</p></td></tr><tr><td><p>Cell C</p></td><td><p>Cell D</p></td></tr>"
            "</tbody></table>");
        QVERIFY(NotesRichDocument::supportsSource(source));

        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QTextTable *table = firstTable(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);
        QVERIFY(!original.isNull());

        QTextCursor selection(&document);
        selection.setPosition(table->cellAt(1, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(2, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        int firstRow = -1;
        int rowCount = 0;
        int firstColumn = -1;
        int columnCount = 0;
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 1);
        QCOMPARE(rowCount, 2);
        QCOMPARE(firstColumn, 0);
        QCOMPARE(columnCount, 2);
        QVERIFY(NotesRichTableMerging::canMergeOrSplit(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()));
        QVERIFY(NotesRichTableMerging::mergeOrSplit(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()));

        const QTextTableCell mergedCell = table->cellAt(1, 0);
        QCOMPARE(mergedCell.rowSpan(), 2);
        QCOMPARE(mergedCell.columnSpan(), 2);
        QString merged = NotesRichDocument::serialize(document);
        QVERIFY2(!merged.isNull(), qPrintable(merged));
        QVERIFY(merged.contains("<td colspan=\"2\" rowspan=\"2\" data-bg-color="));
        QVERIFY(merged.contains("Cell A"));
        QVERIFY(merged.contains("Cell B"));
        QVERIFY(merged.contains("Cell C"));
        QVERIFY(merged.contains("Cell D"));
        QVERIFY(NotesRichDocument::supportsSource(merged));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
        document.redo();
        QCOMPARE(NotesRichDocument::serialize(document), merged);

        table = firstTable(document);
        QVERIFY(table);
        const int cursorPosition = table->cellAt(1, 0).firstCursorPosition().position();
        QVERIFY(NotesRichTableMerging::canMergeOrSplit(document, cursorPosition,
                                                        cursorPosition, cursorPosition));
        QVERIFY(NotesRichTableMerging::mergeOrSplit(document, cursorPosition,
                                                     cursorPosition, cursorPosition));
        table = firstTable(document);
        QVERIFY(table);
        QCOMPARE(table->cellAt(1, 0).rowSpan(), 1);
        QCOMPARE(table->cellAt(1, 0).columnSpan(), 1);
        const QString split = NotesRichDocument::serialize(document);
        QVERIFY2(!split.isNull(), qPrintable(split));
        QVERIFY(NotesRichDocument::supportsSource(split));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), merged);
    }

    void headerBoundaryAndMalformedSpansAreRejected() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td></tr></tbody></table>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QTextTable *table = firstTable(document);
        QVERIFY(table);
        QTextCursor selection(&document);
        selection.setPosition(table->cellAt(0, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(1, 0).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(!NotesRichTableMerging::canMergeOrSplit(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tbody><tr><td colspan=\"65\"><p>Too wide</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tbody><tr><th rowspan=\"2\"><p>Header</p></th><th><p>Value</p></th></tr>"
            "<tr><td><p>Body</p></td></tr></tbody></table>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<table><tbody><tr><td colspan=\"2\"><p>Wide</p></td></tr>"
            "<tr><td><p>A</p></td><td><p>B</p></td><td><p>Extra</p></td></tr></tbody></table>"));
    }

    void crossTableSelectionDoesNotSplitActiveMergedCell() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><td><p>First table</p></td></tr></tbody></table>"
            "<table><tbody><tr><td colspan=\"2\"><p>Merged cell</p></td></tr></tbody></table>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QTextTable *first = firstTable(document);
        QVERIFY(first);
        QTextTable *second = qobject_cast<QTextTable *>(document.rootFrame()->childFrames().last());
        QVERIFY(second);

        QTextCursor selection(&document);
        selection.setPosition(first->cellAt(0, 0).firstCursorPosition().position());
        selection.setPosition(second->cellAt(0, 0).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(!NotesRichTableMerging::canMergeOrSplit(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()));
        QVERIFY(!NotesRichTableMerging::mergeOrSplit(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()));
        QVERIFY(second->cellAt(0, 0).columnSpan() == 2);
    }
};

int runNativeNotesTableMergeTest(int argc, char **argv) {
    NativeNotesTableMergeTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_merge_test.moc"
