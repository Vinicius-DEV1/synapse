#include "controllers/notes/notes_rich_table_cell_selection.h"

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

QTextCursor selectRange(QTextDocument &document, const QVariantMap &range) {
    QTextCursor selection(&document);
    selection.setPosition(range.value(QStringLiteral("start")).toInt());
    selection.setPosition(range.value(QStringLiteral("end")).toInt(), QTextCursor::KeepAnchor);
    return selection;
}
}

class NativeNotesTableCellSelectionTest final : public QObject {
    Q_OBJECT
private slots:
    void selectsCurrentRowColumnAndEntireTable() {
        QTextDocument document;
        document.setHtml(QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td><td><p>Body C</p></td></tr>"
            "<tr><td><p>Body D</p></td><td><p>Body E</p></td><td><p>Body F</p></td></tr></tbody></table>"));
        QTextTable *table = firstTable(document);
        QVERIFY(table);
        const int activePosition = table->cellAt(1, 1).firstCursorPosition().position();

        const QVariantMap row = NotesRichTableCellSelection::selectionRange(document, activePosition,
                                                                             QStringLiteral("row"));
        QVERIFY(!row.isEmpty());
        QTextCursor selection = selectRange(document, row);
        int firstRow = -1;
        int rowCount = 0;
        int firstColumn = -1;
        int columnCount = 0;
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 1);
        QCOMPARE(rowCount, 1);
        QCOMPARE(firstColumn, 0);
        QCOMPARE(columnCount, 3);
        QCOMPARE(NotesRichTableCellSelection::selectionScope(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()),
            QStringLiteral("row"));

        const QVariantMap column = NotesRichTableCellSelection::selectionRange(document, activePosition,
                                                                                QStringLiteral("column"));
        selection = selectRange(document, column);
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 0);
        QCOMPARE(rowCount, 3);
        QCOMPARE(firstColumn, 1);
        QCOMPARE(columnCount, 1);
        QCOMPARE(NotesRichTableCellSelection::selectionScope(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()),
            QStringLiteral("column"));

        const QVariantMap wholeTable = NotesRichTableCellSelection::selectionRange(
            document, activePosition, QStringLiteral("table"));
        selection = selectRange(document, wholeTable);
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 0);
        QCOMPARE(rowCount, 3);
        QCOMPARE(firstColumn, 0);
        QCOMPARE(columnCount, 3);
        QCOMPARE(NotesRichTableCellSelection::selectionScope(
            document, selection.position(), selection.selectionStart(), selection.selectionEnd()),
            QStringLiteral("table"));
    }

    void mergedCellSelectionExpandsToCompleteCellBoundaries() {
        QTextDocument document;
        document.setHtml(QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td rowspan=\"2\"><p>Vertical merge</p></td><td><p>Row A</p></td><td><p>Row B</p></td></tr>"
            "<tr><td colspan=\"2\"><p>Wide row</p></td></tr></tbody></table>"));
        QTextTable *table = firstTable(document);
        QVERIFY(table);

        const int rowPosition = table->cellAt(2, 1).firstCursorPosition().position();
        const QVariantMap row = NotesRichTableCellSelection::selectionRange(
            document, rowPosition, QStringLiteral("row"));
        QVERIFY(!row.isEmpty());
        QTextCursor selection = selectRange(document, row);
        int firstRow = -1;
        int rowCount = 0;
        int firstColumn = -1;
        int columnCount = 0;
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 1);
        QCOMPARE(rowCount, 2);
        QCOMPARE(firstColumn, 0);
        QCOMPARE(columnCount, 3);
        for (int rowIndex = firstRow; rowIndex < firstRow + rowCount; ++rowIndex) {
            for (int columnIndex = firstColumn; columnIndex < firstColumn + columnCount; ++columnIndex) {
                const QTextTableCell cell = table->cellAt(rowIndex, columnIndex);
                QVERIFY(cell.row() >= firstRow);
                QVERIFY(cell.row() + cell.rowSpan() <= firstRow + rowCount);
                QVERIFY(cell.column() >= firstColumn);
                QVERIFY(cell.column() + cell.columnSpan() <= firstColumn + columnCount);
            }
        }

        const int mergedColumnPosition = table->cellAt(2, 2).firstCursorPosition().position();
        const QVariantMap column = NotesRichTableCellSelection::selectionRange(
            document, mergedColumnPosition, QStringLiteral("column"));
        QVERIFY(!column.isEmpty());
        selection = selectRange(document, column);
        selection.selectedTableCells(&firstRow, &rowCount, &firstColumn, &columnCount);
        QCOMPARE(firstRow, 0);
        QCOMPARE(rowCount, 3);
        QCOMPARE(firstColumn, 1);
        QCOMPARE(columnCount, 2);
    }

    void rejectsInvalidScopeAndPositionsOutsideTables() {
        QTextDocument document;
        document.setHtml(QStringLiteral("<p>Outside</p><table><tbody><tr><td><p>Inside</p></td></tr></tbody></table>"));
        QTextTable *table = firstTable(document);
        QVERIFY(table);
        QVERIFY(NotesRichTableCellSelection::selectionRange(document, 0, QStringLiteral("row")).isEmpty());
        QVERIFY(NotesRichTableCellSelection::selectionRange(
            document, table->cellAt(0, 0).firstCursorPosition().position(), QStringLiteral("diagonal")).isEmpty());
        QCOMPARE(NotesRichTableCellSelection::selectionScope(document, 1, 0, 0), QStringLiteral("none"));
    }
};

int runNativeNotesTableCellSelectionTest(int argc, char **argv) {
    NativeNotesTableCellSelectionTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_cell_selection_test.moc"
