#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_table_cell_formatting.h"

#include <QtGui/QTextCursor>
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

class NativeNotesTableBackgroundSelectionTest final : public QObject {
    Q_OBJECT
private slots:
    void rectangularSelectionColorsMergedAndUnmergedCellsWithUndo() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td colspan=\"2\"><p>Merged A</p></td><td><p>Outside A</p></td></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td><td><p>Outside B</p></td></tr>"
            "<tr><td><p>Other A</p></td><td><p>Other B</p></td><td><p>Other C</p></td></tr></tbody></table>");
        QTextDocument document;
        document.setHtml(NotesRichTableCellFormatting::editorMarkup(source));
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        const QString original = NotesRichDocument::serialize(document);
        QVERIFY(!original.isNull());
        QTextTable *table = firstTable(document);
        QVERIFY(table);

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
        QVERIFY(NotesRichTableCellFormatting::canSetBackgroundOnSelection(
            document, selection.selectionStart(), selection.selectionEnd()));

        const QString red = QStringLiteral("rgba(239, 68, 68, 0.2)");
        const QColor expectedRed(239, 68, 68, 51);
        QVERIFY(NotesRichTableCellFormatting::setBackground(document, selection.selectionStart(), red,
            QStringLiteral("selection"), selection.selectionStart(), selection.selectionEnd()));
        QCOMPARE(table->cellAt(1, 0).format().background().color(), expectedRed);
        QCOMPARE(table->cellAt(1, 1).format().background().color(), expectedRed);
        QCOMPARE(table->cellAt(2, 0).format().background().color(), expectedRed);
        QCOMPARE(table->cellAt(2, 1).format().background().color(), expectedRed);
        QVERIFY(!NotesRichTableCellFormatting::isSupportedBackground(table->cellAt(1, 2).format().background()));
        QVERIFY(!NotesRichTableCellFormatting::isSupportedBackground(table->cellAt(2, 2).format().background()));
        QVERIFY(!NotesRichTableCellFormatting::isSupportedBackground(table->cellAt(3, 0).format().background()));
        const QString colored = NotesRichDocument::serialize(document);
        QCOMPARE(colored.count("data-bg-color="), 3);
        QVERIFY(NotesRichDocument::supportsSource(colored));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QVERIFY(NotesRichTableCellFormatting::setBackground(document, selection.selectionStart(), red,
            QStringLiteral("selection"), selection.selectionStart(), selection.selectionEnd()));
        QVERIFY(NotesRichTableCellFormatting::setBackground(document, selection.selectionStart(), QString(),
            QStringLiteral("selection"), selection.selectionStart(), selection.selectionEnd()));
        QCOMPARE(NotesRichDocument::serialize(document), original);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), colored);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void backgroundSelectionRejectsInlineAndCrossTableRanges() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><td><p>First</p></td><td><p>Cell</p></td></tr></tbody></table>"
            "<p>Between</p><table><tbody><tr><td><p>Second</p></td><td><p>Table</p></td></tr></tbody></table>");
        QTextDocument document;
        document.setHtml(source);
        QTextTable *first = firstTable(document);
        QVERIFY(first);
        const int inlineStart = first->cellAt(0, 0).firstCursorPosition().position();
        const int inlineEnd = first->cellAt(0, 0).lastCursorPosition().position();
        QVERIFY(!NotesRichTableCellFormatting::canSetBackgroundOnSelection(document, inlineStart, inlineEnd));

        const auto frames = document.rootFrame()->childFrames();
        QVERIFY(frames.size() >= 2);
        QTextTable *last = qobject_cast<QTextTable *>(frames.last());
        QVERIFY(last);
        const int crossStart = first->cellAt(0, 0).firstCursorPosition().position();
        const int crossEnd = last->cellAt(0, 1).lastCursorPosition().position();
        QVERIFY(!NotesRichTableCellFormatting::canSetBackgroundOnSelection(document, crossStart, crossEnd));
        QVERIFY(!NotesRichTableCellFormatting::setBackground(document, crossStart,
            QStringLiteral("rgba(239, 68, 68, 0.2)"), QStringLiteral("selection"), crossStart, crossEnd));
    }
};

int runNativeNotesTableBackgroundSelectionTest(int argc, char **argv) {
    NativeNotesTableBackgroundSelectionTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_background_selection_test.moc"
