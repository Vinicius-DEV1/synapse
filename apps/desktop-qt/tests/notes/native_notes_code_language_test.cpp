#include "controllers/notes/notes_rich_code_blocks.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_format.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
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
};

int runNativeNotesCodeLanguageTest(int argc, char **argv) {
    NativeNotesCodeLanguageTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_code_language_test.moc"
