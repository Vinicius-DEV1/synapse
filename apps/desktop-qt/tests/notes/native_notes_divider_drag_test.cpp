#include "controllers/notes/notes_rich_divider_editing.h"
#include "controllers/notes/notes_rich_document.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtTest/QtTest>

class NativeNotesDividerDragTest final : public QObject {
    Q_OBJECT

private slots:
    void movingToAnArbitraryCompatibleBlockPreservesFormattingAndUndo() {
        const QString source = QStringLiteral(
            "<p>First <strong>bold</strong></p><hr/><p>Middle</p><h2>Last</h2>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));

        int dividerPosition = -1;
        int targetPosition = -1;
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (NotesRichDividerEditing::isDividerAt(document, block.position())) dividerPosition = block.position();
            if (block.text() == QStringLiteral("Last")) targetPosition = block.position();
        }
        QVERIFY(dividerPosition >= 0);
        QVERIFY(targetPosition >= 0);

        const int movedPosition = NotesRichDividerEditing::moveTo(document, dividerPosition, targetPosition, false);
        QVERIFY(movedPosition >= 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>First <strong>bold</strong></p><p>Middle</p><hr/><h2>Last</h2>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        dividerPosition = document.begin().next().position();
        const int middlePosition = document.begin().next().next().position();
        QVERIFY(NotesRichDividerEditing::moveTo(document, dividerPosition, middlePosition, true) >= 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>First <strong>bold</strong></p><p>Middle</p><hr/><h2>Last</h2>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        dividerPosition = document.begin().next().position();
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (block.text() == QStringLiteral("Last")) targetPosition = block.position();
        }
        QVERIFY(NotesRichDividerEditing::moveTo(document, dividerPosition, targetPosition, true) >= 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>First <strong>bold</strong></p><p>Middle</p><h2>Last</h2><hr/>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        dividerPosition = document.begin().next().position();
        const int firstPosition = document.begin().position();
        QVERIFY(NotesRichDividerEditing::moveTo(document, dividerPosition, firstPosition, false) >= 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<hr/><p>First <strong>bold</strong></p><p>Middle</p><h2>Last</h2>"));
    }

    void unsupportedBoundariesRejectTheWholeMove() {
        const QString source = QStringLiteral(
            "<p>First</p><hr/><p>Middle</p><ul><li><p>List item</p></li></ul>");
        QTextDocument document;
        document.setHtml(source);
        const QString listHtmlBefore = document.toHtml();
        int dividerPosition = -1;
        int targetPosition = -1;
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (NotesRichDividerEditing::isDividerAt(document, block.position())) dividerPosition = block.position();
            if (block.text() == QStringLiteral("List item")) targetPosition = block.position();
        }
        QVERIFY(dividerPosition >= 0);
        QVERIFY(targetPosition >= 0);
        QCOMPARE(NotesRichDividerEditing::moveTo(document, dividerPosition, targetPosition, false), -1);
        QCOMPARE(document.toHtml(), listHtmlBefore);

        const QString tableSource = QStringLiteral(
            "<p>First</p><hr/><table><tbody><tr><td><p>Cell</p></td></tr></tbody></table>");
        document.setHtml(tableSource);
        const QString tableHtmlBefore = document.toHtml();
        dividerPosition = -1;
        targetPosition = -1;
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (NotesRichDividerEditing::isDividerAt(document, block.position())) dividerPosition = block.position();
            if (block.text() == QStringLiteral("Cell")) targetPosition = block.position();
        }
        QVERIFY(dividerPosition >= 0);
        QVERIFY(targetPosition >= 0);
        QCOMPARE(NotesRichDividerEditing::moveTo(document, dividerPosition, targetPosition, false), -1);
        QCOMPARE(document.toHtml(), tableHtmlBefore);
    }
};

int runNativeNotesDividerDragTest(int argc, char **argv) {
    NativeNotesDividerDragTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_divider_drag_test.moc"
