#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_callouts.h"
#include "controllers/notes/notes_rich_format.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtTest/QtTest>

class NativeNotesCalloutTest final : public QObject {
    Q_OBJECT

private slots:
    void reactColoredQuoteLoadsAndRoundTrips() {
        const QString source = QStringLiteral(
            "<blockquote data-color=\"#3B82F6\" style=\"background-color: #3B82F615 !important; "
            "border-left-color: #3B82F6 !important;\"><p>First <strong>line</strong></p>"
            "<p>Second line</p></blockquote>");
        QVERIFY(NotesRichDocument::supportsSource(source));

        QTextDocument document;
        document.setHtml(NotesRichCallouts::sourceForEditor(source));
        QVERIFY(!NotesRichCallouts::sourceForEditor(source).contains("background-color:"));
        QVERIFY(NotesRichDocument::prepareCalloutStyles(document, source));
        QVERIFY(NotesRichDocument::isCalloutAt(document, 1));
        QCOMPARE(NotesRichDocument::calloutColorAt(document, 1), QStringLiteral("#3b82f6"));
        QCOMPARE(document.begin().blockFormat().stringProperty(NotesRichFormat::QuoteColor),
                 QStringLiteral("#3b82f6"));
        QCOMPARE(document.begin().blockFormat().background().color().alpha(), 0x15);
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<blockquote data-color=\"#3b82f6\"><p>First <strong>line</strong></p>"
            "<p>Second line</p></blockquote>"));
    }

    void paletteChangesAreUndoableAndResetToDefault() {
        const QString source = QStringLiteral("<blockquote><p>Quote body</p></blockquote>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareCalloutStyles(document, source));
        QVERIFY(NotesRichDocument::isCalloutAt(document, 1));
        QCOMPARE(NotesRichDocument::calloutColorAt(document, 1), QStringLiteral("default"));

        QVERIFY(NotesRichDocument::setCalloutColor(document, 0, 5, QStringLiteral("#A855F7")));
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<blockquote data-color=\"#a855f7\"><p>Quote body</p></blockquote>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        QVERIFY(NotesRichDocument::setCalloutColor(document, 0, 5, QStringLiteral("#22C55E")));
        QVERIFY(NotesRichDocument::setCalloutColor(document, 0, 5, QStringLiteral("default")));
        QCOMPARE(NotesRichDocument::serialize(document), source);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<blockquote data-color=\"#22c55e\"><p>Quote body</p></blockquote>"));

        QVERIFY(!NotesRichDocument::setCalloutColor(document, 0, 5, QStringLiteral("#fff")));
        QVERIFY(!NotesRichDocument::setCalloutColor(document, 0, 5, QStringLiteral("url(red)")));
    }

    void unsupportedColorMarkupStaysOutsideVisualMode() {
        QVERIFY(!NotesRichDocument::supportsSource(QStringLiteral(
            "<blockquote data-color=\"red\"><p>Unsafe</p></blockquote>")));
        QVERIFY(!NotesRichDocument::supportsSource(QStringLiteral(
            "<blockquote data-color=\"#3B82F6\" style=\"background: red\"><p>Unsupported</p></blockquote>")));
    }
};

int runNativeNotesCalloutTest(int argc, char **argv) {
    NativeNotesCalloutTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_callout_test.moc"
