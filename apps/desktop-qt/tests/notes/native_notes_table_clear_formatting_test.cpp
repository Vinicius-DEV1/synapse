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

class NativeNotesTableClearFormattingTest final : public QObject {
    Q_OBJECT
private slots:
    void clearsSelectedCellMarksPreservingTableAttributesAndUndo() {
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p><strong>Header A</strong></p></th><th><p>Header B</p></th><th><p>Header C</p></th></tr>"
            "<tr><td colspan=\"2\" data-bg-color=\"rgba(59, 130, 246, 0.2)\" "
            "style=\"background-color: rgba(59, 130, 246, 0.2) !important\"><p>"
            "<strong><em><u><s><code>Marked</code></s></u></em></strong> "
            "<a href=\"https://example.com\">linked</a></p></td><td><p>Outside A</p></td></tr>"
            "<tr><td><p><span style=\"color: #A855F7\">colored</span> "
            "<mark style=\"background-color: #EAB308\">highlight</mark> "
            "<span data-type=\"spoiler\" class=\"caderno-spoiler\">secret</span></p></td>"
            "<td><p>Body D</p></td><td><p>Outside B</p></td></tr></tbody></table>");
        QTextDocument document;
        document.setHtml(NotesRichTableCellFormatting::editorMarkup(source));
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QVERIFY(NotesRichDocument::prepareSpoilerStyles(document));
        QTextTable *table = firstTable(document);
        QVERIFY(table);
        const int pageReferencePosition = table->cellAt(2, 1).lastCursorPosition().position();
        QVERIFY(NotesRichDocument::insertPageReference(document, pageReferencePosition,
                                                        QStringLiteral("target-page"),
                                                        QStringLiteral("Linked page")) > pageReferencePosition);
        const QString original = NotesRichDocument::serialize(document);
        QVERIFY(!original.isNull());

        QTextCursor selection(&document);
        selection.setPosition(table->cellAt(1, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(2, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(NotesRichTableCellFormatting::canSetBackgroundOnSelection(
            document, selection.selectionStart(), selection.selectionEnd()));

        QVERIFY(NotesRichTableCellFormatting::clearFormattingOnSelection(
            document, selection.selectionStart(), selection.selectionEnd()));
        const QString cleared = NotesRichDocument::serialize(document);
        QVERIFY2(NotesRichDocument::supportsSource(cleared), qPrintable(cleared));
        QVERIFY(cleared.contains("<strong>Header A</strong>") && cleared.contains("<th>"));
        QVERIFY(cleared.contains("Marked") && cleared.contains("linked"));
        QVERIFY(cleared.contains("data-page-id=\"target-page\""));
        QVERIFY(cleared.contains("Outside A") && cleared.contains("Outside B"));
        QVERIFY2(cleared.contains("data-bg-color=\"rgba(59, 130, 246, 0.200)\""), qPrintable(cleared));
        QVERIFY(cleared.contains("<p>Marked linked</p>"));
        QVERIFY(!cleared.contains("<strong><em><u><s><code>") && !cleared.contains("<em>") &&
                !cleared.contains("<u>") && !cleared.contains("<s>") && !cleared.contains("<code>") &&
                !cleared.contains("<a href=") && !cleared.contains("<mark") &&
                !cleared.contains("data-type=\"spoiler\"") && !cleared.contains("color:#A855F7"));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        selection.setPosition(table->cellAt(0, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(0, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(NotesRichTableCellFormatting::clearFormattingOnSelection(
            document, selection.selectionStart(), selection.selectionEnd()));
        const QString clearedHeader = NotesRichDocument::serialize(document);
        QVERIFY(clearedHeader.contains("<th><p>Header A</p></th>"));
        QVERIFY(clearedHeader.contains("<code>Marked</code>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void rejectsInlineAndCrossTableRangesWithoutChangingContent() {
        QTextDocument document;
        document.setHtml(QStringLiteral(
            "<table><tbody><tr><td><p><strong>First</strong></p></td><td><p>End</p></td></tr></tbody></table>"
            "<p>Between</p><table><tbody><tr><td><p><em>Second</em></p></td><td><p>End</p></td></tr></tbody></table>"));
        const QString original = NotesRichDocument::serialize(document);
        const auto frames = document.rootFrame()->childFrames();
        QCOMPARE(frames.size(), 2);
        auto *first = qobject_cast<QTextTable *>(frames.first());
        auto *last = qobject_cast<QTextTable *>(frames.last());
        QVERIFY(first && last);

        const int inlineStart = first->cellAt(0, 0).firstCursorPosition().position();
        const int inlineEnd = first->cellAt(0, 0).lastCursorPosition().position();
        QVERIFY(!NotesRichTableCellFormatting::clearFormattingOnSelection(document, inlineStart, inlineEnd));
        const int crossStart = first->cellAt(0, 0).firstCursorPosition().position();
        const int crossEnd = last->cellAt(0, 1).lastCursorPosition().position();
        QVERIFY(!NotesRichTableCellFormatting::clearFormattingOnSelection(document, crossStart, crossEnd));
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }
};

int runNativeNotesTableClearFormattingTest(int argc, char **argv) {
    NativeNotesTableClearFormattingTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_clear_formatting_test.moc"
