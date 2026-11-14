#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_table_cell_formatting.h"
#include "controllers/notes/notes_rich_table_cell_selection.h"
#include "controllers/notes/notes_rich_tables.h"

#include <QtCore/QVariantMap>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtTest/QtTest>

namespace {
const QString mergedTableSource = QStringLiteral(
    "<table><tbody><tr><th><p>H0</p></th><th><p>H1</p></th><th><p>H2</p></th></tr>"
    "<tr><td rowspan=\"2\" data-bg-color=\"rgba(34, 197, 94, 0.2)\" "
    "style=\"background-color: rgba(34, 197, 94, 0.2) !important;\"><p>Vertical</p></td>"
    "<td colspan=\"2\" data-bg-color=\"rgba(59, 130, 246, 0.2)\" "
    "style=\"background-color: rgba(59, 130, 246, 0.2) !important;\"><p>Horizontal</p></td></tr>"
    "<tr><td><p>Right A</p></td><td><p>Right B</p></td></tr>"
    "<tr><td><p>Footer A</p></td><td><p>Footer B</p></td><td><p>Footer C</p></td></tr></tbody></table>");

QTextTable *tableIn(QTextDocument &document) {
    for (QTextFrame *frame : document.rootFrame()->childFrames())
        if (auto *table = qobject_cast<QTextTable *>(frame)) return table;
    return nullptr;
}

int cellPosition(QTextTable *table, int row, int column) {
    return table ? table->cellAt(row, column).firstCursorPosition().position() : -1;
}

bool prepareDocument(QTextDocument &document, const QString &source) {
    if (!NotesRichDocument::supportsSource(source)) return false;
    document.setHtml(NotesRichTableCellFormatting::editorMarkup(source));
    return NotesRichDocument::prepareHeadingStyles(document, source);
}
}

class NativeNotesTableStructureTest final : public QObject {
    Q_OBJECT
private slots:
    void insertionAroundMergedCellsKeepsSpansAndUndo() {
        QTextDocument document;
        QVERIFY(prepareDocument(document, mergedTableSource));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);
        const int rowPosition = cellPosition(table, 2, 1);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, rowPosition, "rowBefore"));
        QVERIFY(NotesRichTables::applyStructureAction(document, rowPosition, "rowBefore"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 5);
        QCOMPARE(table->cellAt(1, 0).rowSpan(), 3);
        QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.contains("rowspan=\"3\""));
        QVERIFY(edited.contains("Vertical"));
        QVERIFY(edited.contains("data-bg-color=\"rgba(34, 197, 94, 0.200)\""));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int rowAfterPosition = cellPosition(table, 1, 0);
        QVERIFY(NotesRichTables::applyStructureAction(document, rowAfterPosition, "rowAfter"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 5);
        QCOMPARE(table->cellAt(1, 0).rowSpan(), 2);
        QVERIFY(NotesRichDocument::serialize(document).contains("Footer A"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int columnAfterPosition = cellPosition(table, 1, 1);
        QVERIFY(NotesRichTables::applyStructureAction(document, columnAfterPosition, "columnAfter"));
        table = tableIn(document);
        QCOMPARE(table->columns(), 4);
        QCOMPARE(table->cellAt(1, 1).columnSpan(), 2);
        QVERIFY(NotesRichDocument::serialize(document).contains("Footer C"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int columnPosition = cellPosition(table, 2, 2);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, columnPosition, "columnBefore"));
        QVERIFY(NotesRichTables::applyStructureAction(document, columnPosition, "columnBefore"));
        table = tableIn(document);
        QCOMPARE(table->columns(), 4);
        QCOMPARE(table->cellAt(1, 1).columnSpan(), 3);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.contains("colspan=\"3\""));
        QVERIFY(edited.contains("Horizontal"));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void deletingSelectedMergedCellRemovesItsCoveredAxisAndUndo() {
        QTextDocument document;
        QVERIFY(prepareDocument(document, mergedTableSource));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);

        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(table, 1, 0), "deleteRow"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 2);
        QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(!edited.contains("Vertical"));
        QVERIFY(edited.contains("Footer A"));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        QVERIFY(NotesRichTables::applyStructureAction(document, cellPosition(table, 1, 1), "deleteColumn"));
        table = tableIn(document);
        QCOMPARE(table->columns(), 1);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(!edited.contains("Horizontal"));
        QVERIFY(edited.contains("Vertical"));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void deletionThroughMergedCellsShrinksSpansAndPreservesContent() {
        QTextDocument document;
        QVERIFY(prepareDocument(document, mergedTableSource));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);
        const int rowPosition = cellPosition(table, 2, 1);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, rowPosition, "deleteRow"));
        QVERIFY(NotesRichTables::applyStructureAction(document, rowPosition, "deleteRow"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 3);
        QCOMPARE(table->cellAt(1, 0).rowSpan(), 1);
        QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.contains("Vertical"));
        QVERIFY(!edited.contains("Right A"));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int columnPosition = cellPosition(table, 2, 2);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, columnPosition, "deleteColumn"));
        QVERIFY(NotesRichTables::applyStructureAction(document, columnPosition, "deleteColumn"));
        table = tableIn(document);
        QCOMPARE(table->columns(), 2);
        QCOMPARE(table->cellAt(1, 1).columnSpan(), 1);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.contains("Horizontal"));
        QVERIFY(!edited.contains("Right B"));
        QVERIFY(NotesRichDocument::supportsSource(edited));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void structuralActionsHonorSelectedRowsAndProtectFinalAxis() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th></tr>"
            "<tr><td><p>Remove A</p></td><td><p>Remove B</p></td></tr>"
            "<tr><td><p>Keep A</p></td><td><p>Keep B</p></td></tr></tbody></table>");
        QTextDocument document;
        QVERIFY(prepareDocument(document, source));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);
        const int position = cellPosition(table, 1, 0);
        const QVariantMap rowRange = NotesRichTableCellSelection::selectionRange(
            document, position, QStringLiteral("row"));
        QVERIFY(!rowRange.isEmpty());
        const int start = rowRange.value(QStringLiteral("start")).toInt();
        const int end = rowRange.value(QStringLiteral("end")).toInt();
        QVERIFY(NotesRichTables::canApplyStructureAction(document, position, "deleteRow", start, end));
        QVERIFY(NotesRichTables::applyStructureAction(document, position, "deleteRow", start, end));
        table = tableIn(document);
        QCOMPARE(table->rows(), 2);
        const QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(!edited.contains("Remove A"));
        QVERIFY(edited.contains("Keep A"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int columnPosition = cellPosition(table, 1, 1);
        const QVariantMap columnRange = NotesRichTableCellSelection::selectionRange(
            document, columnPosition, QStringLiteral("column"));
        QVERIFY(!columnRange.isEmpty());
        const int columnStart = columnRange.value(QStringLiteral("start")).toInt();
        const int columnEnd = columnRange.value(QStringLiteral("end")).toInt();
        QVERIFY(NotesRichTables::applyStructureAction(
            document, columnPosition, "deleteColumn", columnStart, columnEnd));
        table = tableIn(document);
        QCOMPARE(table->columns(), 1);
        const QString afterColumnDeletion = NotesRichDocument::serialize(document);
        QVERIFY2(!afterColumnDeletion.isNull(), qPrintable(afterColumnDeletion));
        QVERIFY(!afterColumnDeletion.contains("Remove B"));
        QVERIFY(afterColumnDeletion.contains("Keep A"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        const QVariantMap fullRange = NotesRichTableCellSelection::selectionRange(
            document, position, QStringLiteral("table"));
        QVERIFY(!fullRange.isEmpty());
        QVERIFY(!NotesRichTables::canApplyStructureAction(
            document, position, "deleteRow", fullRange.value("start").toInt(), fullRange.value("end").toInt()));
        QVERIFY(!NotesRichTables::canApplyStructureAction(
            document, position, "deleteColumn", fullRange.value("start").toInt(), fullRange.value("end").toInt()));
    }

    void moveRowsAcrossMergedCellsPreservesSpansBackgroundsAndUndo() {
        QTextDocument document;
        QVERIFY(prepareDocument(document, mergedTableSource));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);

        const int verticalPos = cellPosition(table, 1, 0);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, verticalPos, "moveRowDown"));
        QVERIFY(NotesRichTables::applyStructureAction(document, verticalPos, "moveRowDown"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 4);
        QCOMPARE(table->columns(), 3);
        QCOMPARE(table->cellAt(2, 0).rowSpan(), 2);
        QCOMPARE(table->cellAt(2, 1).columnSpan(), 2);
        QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.indexOf("Footer A") < edited.indexOf("Vertical"));
        QVERIFY(edited.indexOf("Vertical") < edited.indexOf("Right A"));
        QVERIFY(edited.contains("rowspan=\"2\""));
        QVERIFY(edited.contains("colspan=\"2\""));
        QVERIFY(edited.contains("data-bg-color=\"rgba(34, 197, 94, 0.200)\""));
        QVERIFY(NotesRichDocument::supportsSource(edited));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int headerPos = cellPosition(table, 0, 0);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, headerPos, "moveRowDown"));
        QVERIFY(NotesRichTables::applyStructureAction(document, headerPos, "moveRowDown"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 4);
        QCOMPARE(table->cellAt(0, 0).rowSpan(), 2);
        QCOMPARE(table->cellAt(0, 1).columnSpan(), 2);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.indexOf("Vertical") < edited.indexOf("H0"));
        QVERIFY(edited.indexOf("H0") < edited.indexOf("Footer A"));
        QVERIFY(edited.contains("<tr><th><p>H0</p></th><th><p>H1</p></th><th><p>H2</p></th></tr>"));
        QVERIFY(NotesRichDocument::supportsSource(edited));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int footerPos = cellPosition(table, 3, 1);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, footerPos, "moveRowUp"));
        QVERIFY(NotesRichTables::applyStructureAction(document, footerPos, "moveRowUp"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 4);
        QCOMPARE(table->cellAt(2, 0).rowSpan(), 2);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.indexOf("Footer B") < edited.indexOf("Vertical"));
        QVERIFY(NotesRichDocument::supportsSource(edited));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void moveColumnsAcrossMergedCellsPreservesSpansBackgroundsAndUndo() {
        QTextDocument document;
        QVERIFY(prepareDocument(document, mergedTableSource));
        auto *table = tableIn(document);
        QVERIFY(table);
        const QString original = NotesRichDocument::serialize(document);

        const int verticalPos = cellPosition(table, 1, 0);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, verticalPos, "moveColumnRight"));
        QVERIFY(NotesRichTables::applyStructureAction(document, verticalPos, "moveColumnRight"));
        table = tableIn(document);
        QCOMPARE(table->rows(), 4);
        QCOMPARE(table->columns(), 3);
        QCOMPARE(table->cellAt(1, 0).columnSpan(), 2);
        QCOMPARE(table->cellAt(1, 2).rowSpan(), 2);
        QString edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.indexOf("Horizontal") < edited.indexOf("Vertical"));
        QVERIFY(edited.contains("colspan=\"2\""));
        QVERIFY(edited.contains("rowspan=\"2\""));
        QVERIFY(edited.contains("data-bg-color=\"rgba(59, 130, 246, 0.200)\""));
        QVERIFY(NotesRichDocument::supportsSource(edited));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        const int rightPos = cellPosition(table, 2, 2);
        QVERIFY(NotesRichTables::canApplyStructureAction(document, rightPos, "moveColumnLeft"));
        QVERIFY(NotesRichTables::applyStructureAction(document, rightPos, "moveColumnLeft"));
        table = tableIn(document);
        QCOMPARE(table->columns(), 3);
        QCOMPARE(table->cellAt(1, 0).columnSpan(), 2);
        QCOMPARE(table->cellAt(1, 2).rowSpan(), 2);
        edited = NotesRichDocument::serialize(document);
        QVERIFY2(!edited.isNull(), qPrintable(edited));
        QVERIFY(edited.indexOf("Horizontal") < edited.indexOf("Vertical"));
        QVERIFY(NotesRichDocument::supportsSource(edited));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        table = tableIn(document);
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(table, 0, 0), "moveRowUp"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(table, 0, 0), "moveColumnLeft"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(table, 3, 0), "moveRowDown"));
        QVERIFY(!NotesRichTables::canApplyStructureAction(document, cellPosition(table, 3, 2), "moveColumnRight"));
    }

    void tableTemplatesInsertionAndStructure() {
        // 1. Weekly table template (4 rows, 7 cols)
        {
            QTextDocument doc;
            doc.setHtml("<p></p>");
            const int pos = NotesRichTables::insertTemplateTable(doc, 0, 0, "table-week");
            QVERIFY(pos >= 0);
            auto *table = tableIn(doc);
            QVERIFY(table);
            QCOMPARE(table->rows(), 4);
            QCOMPARE(table->columns(), 7);
            const QString serialized = NotesRichDocument::serialize(doc);
            QVERIFY(!serialized.isNull());
            QVERIFY(serialized.contains("<th><p>Seg</p></th>"));
            QVERIFY(serialized.contains("<th><p>Dom</p></th>"));
            QVERIFY(NotesRichDocument::supportsSource(serialized));

            doc.undo();
            QVERIFY(tableIn(doc) == nullptr);
        }

        // 2. Daily schedule table template (8 rows, 2 cols)
        {
            QTextDocument doc;
            doc.setHtml("<p></p>");
            const int pos = NotesRichTables::insertTemplateTable(doc, 0, 0, "table-day");
            QVERIFY(pos >= 0);
            auto *table = tableIn(doc);
            QVERIFY(table);
            QCOMPARE(table->rows(), 8);
            QCOMPARE(table->columns(), 2);
            const QString serialized = NotesRichDocument::serialize(doc);
            QVERIFY(!serialized.isNull());
            QVERIFY(serialized.contains("<th><p>Horário</p></th>"));
            QVERIFY(serialized.contains("<th><p>Atividade</p></th>"));
            QVERIFY(NotesRichDocument::supportsSource(serialized));
        }

        // 3. Habit matrix table template (5 rows, 8 cols)
        {
            QTextDocument doc;
            doc.setHtml("<p></p>");
            const int pos = NotesRichTables::insertTemplateTable(doc, 0, 0, "table-habit");
            QVERIFY(pos >= 0);
            auto *table = tableIn(doc);
            QVERIFY(table);
            QCOMPARE(table->rows(), 5);
            QCOMPARE(table->columns(), 8);
            const QString serialized = NotesRichDocument::serialize(doc);
            QVERIFY(!serialized.isNull());
            QVERIFY(serialized.contains("<th><p>Hábito</p></th>"));
            QVERIFY(serialized.contains("<th><p>Seg</p></th>"));
            QVERIFY(serialized.contains("<th><p>Dom</p></th>"));
            QVERIFY(NotesRichDocument::supportsSource(serialized));
        }
    }
};

int runNativeNotesTableStructureTest(int argc, char **argv) {
    NativeNotesTableStructureTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_structure_test.moc"
