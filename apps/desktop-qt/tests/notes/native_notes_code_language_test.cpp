#include "controllers/notes/notes_rich_code_blocks.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_format.h"
#include "controllers/notes/notes_rich_format.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextBlockFormat>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextTable>
#include <QtGui/QTextTableCell>
#include <QtGui/QTextFormat>
#include <QtTest/QtTest>

class NativeNotesCodeLanguageTest final : public QObject {
    Q_OBJECT

private slots:
    void languageMetadataRoundTripsAndUndoesAsOneEdit() {
        const QString source = QStringLiteral(
            "<pre><code class=\"language-typescript\">const value = 1;\nreturn value;</code></pre><p>After</p>");
        QVERIFY(NotesRichDocument::supportsSource(source));

        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichCodeBlocks::prepare(document, source));
        QTextBlock codeBlock;
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (NotesRichCodeBlocks::isAt(document, block.position())) {
                codeBlock = block;
                break;
            }
        }
        QVERIFY(codeBlock.isValid());
        QCOMPARE(NotesRichCodeBlocks::languageAt(document, codeBlock.position()), QStringLiteral("typescript"));
        QCOMPARE(NotesRichDocument::serialize(document), source);

        QVERIFY(NotesRichCodeBlocks::setLanguage(document, codeBlock.position(), QStringLiteral("python")));
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<pre><code class=\"language-python\">const value = 1;\nreturn value;</code></pre><p>After</p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        QVERIFY(NotesRichCodeBlocks::setLanguage(document, codeBlock.position(), QString()));
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<pre><code>const value = 1;\nreturn value;</code></pre><p>After</p>"));
    }

    void safeLanguageIdentifiersAreAcceptedAndUnsupportedMarkupStaysSourceOnly() {
        QVERIFY(NotesRichDocument::supportsSource(
            "<pre><code class=\"language-c++\">int main() {}</code></pre>"));
        QVERIFY(NotesRichDocument::supportsSource(
            "<pre><code class=\"language-vendor_2.experimental\">code</code></pre>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<pre><code class=\"language-cpp other\">code</code></pre>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<pre><code class=\"language-cpp\" onclick=\"run()\">code</code></pre>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<pre><code class=\"language-cpp\"><span class=\"hljs-keyword\">const</span></code></pre>"));

        QTextDocument document;
        document.setHtml(QStringLiteral("<p>plain</p>"));
        QVERIFY(!NotesRichCodeBlocks::setLanguage(document, 0, QStringLiteral("javascript")));
        QVERIFY(!NotesRichCodeBlocks::supportsLanguage(QStringLiteral("javascript\" onclick=\"x")));
    }

    void adjacentCodeBlocksKeepTheirLanguageBoundaries() {
        const QString source = QStringLiteral(
            "<pre><code class=\"language-javascript\">first</code></pre>"
            "<pre><code class=\"language-python\">second</code></pre>");
        QVERIFY(NotesRichDocument::supportsSource(source));
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichCodeBlocks::prepare(document, source));
        QCOMPARE(NotesRichDocument::serialize(document), source);

        const QTextBlock first = document.begin();
        QVERIFY(NotesRichCodeBlocks::setLanguage(document, first.position(), QStringLiteral("rust")));
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<pre><code class=\"language-rust\">first</code></pre>"
            "<pre><code class=\"language-python\">second</code></pre>"));
    }

    void paragraphInsertionAfterMultilineCodePreservesNextBlockAndUndoes() {
        const QString source = QStringLiteral(
            "<pre><code class=\"language-rust\">fn main() {\n    run();\n}</code></pre><h2>Following heading</h2>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichCodeBlocks::prepare(document, source));
        const QString originalSerialized = NotesRichDocument::serialize(document);
        const QTextBlock firstCodeBlock = document.begin();
        const QTextBlock secondCodeBlock = firstCodeBlock.next();
        QVERIFY(NotesRichCodeBlocks::isAt(document, secondCodeBlock.position()));

        const int paragraphPosition = NotesRichCodeBlocks::insertParagraphBelow(document, secondCodeBlock.position());
        QVERIFY(paragraphPosition >= 0);
        const QTextBlock paragraph = document.findBlock(paragraphPosition);
        QVERIFY(paragraph.isValid());
        QVERIFY(paragraph.text().isEmpty());
        QVERIFY(!NotesRichCodeBlocks::isAt(document, paragraphPosition));
        QCOMPARE(paragraph.blockFormat().headingLevel(), 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<pre><code class=\"language-rust\">fn main() {\n    run();\n}</code></pre>"
            "<p><br/></p><h2><strong>Following heading</strong></h2>"));
        QCOMPARE(paragraph.next().blockFormat().headingLevel(), 2);
        QCOMPARE(paragraph.next().text(), QStringLiteral("Following heading"));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), originalSerialized);
    }

    void deleteRemovesTheWholeCodeGroupWithoutChangingNeighborBlocks() {
        const QString source = QStringLiteral(
            "<p>Before</p><pre><code class=\"language-rust\">fn main() {\n    run();\n}</code></pre><h2>After</h2>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichCodeBlocks::prepare(document, source));
        const QString originalSerialized = NotesRichDocument::serialize(document);
        QTextBlock selectedCode;
        for (QTextBlock block = document.begin(); block.isValid(); block = block.next()) {
            if (NotesRichCodeBlocks::isAt(document, block.position())) selectedCode = block;
        }
        QVERIFY(selectedCode.isValid());

        const int caretPosition = NotesRichCodeBlocks::remove(document, selectedCode.position());
        QVERIFY(caretPosition >= 0);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>Before</p><h2><strong>After</strong></h2>"));
        QVERIFY(!NotesRichCodeBlocks::isAt(document, caretPosition));

        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), originalSerialized);
    }

    void deletingOnlyCodeLeavesAnUndoableEditableParagraph() {
        const QString source = QStringLiteral("<pre><code class=\"language-python\">one\ntwo</code></pre>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichCodeBlocks::prepare(document, source));
        const QString originalSerialized = NotesRichDocument::serialize(document);

        const int caretPosition = NotesRichCodeBlocks::remove(document, 0);
        QVERIFY(caretPosition >= 0);
        QVERIFY(!NotesRichCodeBlocks::isAt(document, caretPosition));
        QVERIFY(document.findBlock(caretPosition).text().isEmpty());
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral("<p><br/></p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), originalSerialized);
    }

    void deletingCodeInOneTableCellDoesNotAffectAnotherCell() {
        QTextDocument document;
        QTextCursor tableCursor(&document);
        QTextTable *table = tableCursor.insertTable(1, 2);
        QTextTableCell codeCell = table->cellAt(0, 0);
        QTextCursor codeCursor = codeCell.firstCursorPosition();
        codeCursor.insertText(QStringLiteral("first"));
        codeCursor.insertBlock();
        codeCursor.insertText(QStringLiteral("second"));
        const QTextBlock firstCode = codeCell.firstCursorPosition().block();
        const QTextBlock lastCode = codeCursor.block();
        for (QTextBlock block = firstCode; block.isValid(); block = block.next()) {
            QTextBlockFormat format = block.blockFormat();
            format.setNonBreakableLines(true);
            format.setProperty(NotesRichFormat::CodeBlockGroup, 77);
            QTextCursor blockCursor(block);
            blockCursor.setBlockFormat(format);
            if (block == lastCode) break;
        }
        QTextTableCell neighborCell = table->cellAt(0, 1);
        QTextCursor neighborCursor = neighborCell.firstCursorPosition();
        neighborCursor.insertText(QStringLiteral("neighbor cell"));
        QVERIFY(NotesRichCodeBlocks::isAt(document, firstCode.position()));
        QVERIFY(NotesRichCodeBlocks::remove(document, firstCode.position()) >= 0);
        QCOMPARE(table->cellAt(0, 1).firstCursorPosition().block().text(), QStringLiteral("neighbor cell"));
        QVERIFY(!NotesRichCodeBlocks::isAt(document, codeCell.firstCursorPosition().position()));
    }
};

int runNativeNotesCodeLanguageTest(int argc, char **argv) {
    NativeNotesCodeLanguageTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_code_language_test.moc"
