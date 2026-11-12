#include "synapse_controller.h"
#include "controllers/notes/notes_text_operations.h"
#include "controllers/notes/notes_rich_divider_editing.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_format.h"
#include "controllers/notes/notes_rich_spoilers.h"
#include "controllers/notes/notes_rich_task_markup.h"
#include "controllers/notes/notes_rich_task_lists.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QColor>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextLayout>
#include <QtCore/QUrl>

class NativeNotesTest final : public QObject {
    Q_OBJECT

private slots:
    void richDividerInsertionIsUndoable() {
        QTextDocument document;
        document.setHtml("<p>BeforeAfter</p>");
        const int position = NotesRichDocument::insertDivider(document, 6, 6);
        QVERIFY(position >= 0);
        const QString html = NotesRichDocument::serialize(document);
        QCOMPARE(html, QStringLiteral("<p>Before</p><hr/><p>After</p>"));
        QVERIFY(NotesRichDocument::supportsSource(html));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral("<p>BeforeAfter</p>"));
    }

    void richDividerMovesAndParagraphInsertionPreserveUndo() {
        QVERIFY(NotesRichDocument::supportsSource("<p></p>"));
        const QString source = QStringLiteral("<p>Before <strong>bold</strong></p><hr/><h2>After</h2>");
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        const QString original = NotesRichDocument::serialize(document);
        const int dividerPosition = document.begin().next().position();
        QVERIFY(NotesRichDividerEditing::isDividerAt(document, dividerPosition));
        QVERIFY(NotesRichDividerEditing::canMove(document, dividerPosition, true));
        QVERIFY(NotesRichDividerEditing::canMove(document, dividerPosition, false));

        QCOMPARE(NotesRichDividerEditing::move(document, dividerPosition, true), 0);
        QCOMPARE(NotesRichDocument::serialize(document),
                 QStringLiteral("<hr/><p>Before <strong>bold</strong></p><h2>After</h2>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        const int restoredDividerPosition = document.begin().next().position();
        const int movedDownPosition = NotesRichDividerEditing::move(document, restoredDividerPosition, false);
        QVERIFY(movedDownPosition >= 0);
        QCOMPARE(NotesRichDocument::serialize(document),
                 QStringLiteral("<p>Before <strong>bold</strong></p><h2>After</h2><hr/>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        const int paragraphPosition = NotesRichDividerEditing::insertParagraphBelow(document,
                                                                                       restoredDividerPosition);
        QVERIFY(paragraphPosition >= 0);
        QVERIFY(NotesRichDocument::supportsSource(
            "<p>Before <strong>bold</strong></p><hr/><p><br/></p><h2>After</h2>"));
        QCOMPARE(NotesRichDocument::serialize(document),
                 QStringLiteral("<p>Before <strong>bold</strong></p><hr/><p><br/></p><h2>After</h2>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        QTextDocument boundaryDocument;
        boundaryDocument.setHtml("<hr/><p>After</p>");
        QVERIFY(!NotesRichDividerEditing::canMove(boundaryDocument, 0, true));
        QCOMPARE(NotesRichDividerEditing::move(boundaryDocument, 0, true), -1);

        QTextDocument listDocument;
        listDocument.setHtml("<hr/><ul><li>After</li></ul>");
        const int listDividerPosition = listDocument.begin().position();
        QVERIFY(!NotesRichDividerEditing::canMove(listDocument, listDividerPosition, false));
        QVERIFY(!NotesRichDividerEditing::isDividerAt(document, 0));
    }

    void richDocumentAcceptsOnlyPreservableMarkup() {
        NotesTextOperations operations;
        QVERIFY(operations.supportsRichSource("<p>Text</p>"));
        QVERIFY(!operations.serializeRich(nullptr).value("ok").toBool());
        QVERIFY(!operations.toggleRich(nullptr, 0, 1, "bold"));
        QVERIFY(NotesRichDocument::supportsSource(""));
        QVERIFY(NotesRichDocument::supportsSource("<p>Hello <strong>world</strong><br/></p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p>Before</p><hr><p>After</p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p>Before</p><hr class=\"custom\"><p>After</p>"));
        QTextDocument dividerDocument;
        const QString dividerHtml = QStringLiteral("<p>Before</p><hr><p>After</p>");
        dividerDocument.setHtml(dividerHtml);
        NotesRichDocument::prepareHeadingStyles(dividerDocument, dividerHtml);
        QCOMPARE(NotesRichDocument::serialize(dividerDocument), QStringLiteral("<p>Before</p><hr/><p>After</p>"));
        QVERIFY(NotesRichDocument::supportsSource("<h2>Section</h2><ul><li><p>First</p></li><li><p>Second</p></li></ul>"));
        const QString nestedList = QStringLiteral(
            "<ul><li><p>Parent <strong>bold</strong></p><ul><li><p>Nested A</p></li>"
            "<li><p>Nested B</p></li></ul></li><li><p>Sibling</p></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(nestedList));
        QVERIFY(NotesRichDocument::supportsSource(
            "<ul><li><p>Parent</p><ol><li><p>Numbered child</p></li></ol></li></ul>"));
        QVERIFY(NotesRichDocument::supportsSource(
            "<ul><li><p>First paragraph</p><p>Second paragraph</p></li></ul>"));
        QVERIFY(NotesRichDocument::supportsSource("<h4>Subsection</h4><h5>Detail</h5><h6>Caption</h6>"));
        QVERIFY(!NotesRichDocument::supportsSource("<h7>Invalid level</h7>"));
        QVERIFY(NotesRichDocument::supportsSource("<blockquote><p>Quoted text</p></blockquote>"));
        QVERIFY(NotesRichDocument::supportsSource("<pre><code>const value = 1;\nreturn value;</code></pre>"));
        QVERIFY(NotesRichDocument::supportsSource("<pre><code class=\"language-js\">const value = 1;</code></pre>"));
        QVERIFY(!NotesRichDocument::supportsSource("<pre><code>const <strong>value</strong></code></pre>"));
        QVERIFY(NotesRichDocument::supportsSource("<blockquote data-color=\"#ff0000\"><p>Custom quote</p></blockquote>"));
        QVERIFY(!NotesRichDocument::supportsSource("<ul data-type=\"taskList\"><li><p>Task</p></li></ul>"));
        const QString taskMarkup = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>Done <strong>task</strong></p></div></li>"
            "<li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"><span></span></label>"
            "<div><p><s>Keep strike</s> Open task</p></div></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(taskMarkup));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Mismatched</p></div></li></ul>"));
        QVERIFY(!NotesRichDocument::supportsSource(
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\"><p>Malformed</p></li></ul>"));
        QVERIFY(NotesRichDocument::supportsSource("<p>inline <code>const</code></p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p><span style=\"color:#A855F7\">purple</span> <mark data-color=\"#EAB308\" style=\"background-color:#EAB308;color:inherit\">highlight</mark></p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p><span style=\"color:rgb(34, 197, 94)\">green</span></p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p><a href=\"https://example.com\" target=\"_blank\" rel=\"noopener noreferrer nofollow\">link</a></p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p data-id=\"1\">Hello</p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p><a href=\"https://example.com\">link</a></p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<div data-type=\"question\"></div>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p><br>text</br></p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p>broken"));
        QVERIFY(!NotesRichDocument::supportsSource("<p>multiple  spaces</p>"));
        QVERIFY(NotesRichDocument::supportsSource("<p style=\"white-space:pre-wrap\">multiple  spaces</p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p style=\"white-space:pre-wrap;color:red\">multiple  spaces</p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p><span style=\"color:red;background:url(x)\">unsafe</span></p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p><mark data-color=\"#EF4444\" style=\"background-color:#EAB308\">mismatch</mark></p>"));
        QVERIFY(!NotesRichDocument::supportsSource("<p><a href=\"javascript:alert(1)\">unsafe</a></p>"));

        QTextDocument document;
        document.setHtml("<h2>Section</h2>");
        NotesRichDocument::prepareHeadingStyles(document, "<h2>Section</h2>");
        QCOMPARE(NotesRichDocument::serialize(document), QString("<h2>Section</h2>"));
        document.setHtml("<h2><strong>Keep bold</strong></h2>");
        NotesRichDocument::prepareHeadingStyles(document, "<h2><strong>Keep bold</strong></h2>");
        QCOMPARE(NotesRichDocument::serialize(document), QString("<h2><strong>Keep bold</strong></h2>"));
        QVERIFY(NotesRichDocument::toggleBlock(document, 0, 9, "paragraph"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p><strong>Keep bold</strong></p>"));
        const QString deepHeadings = QStringLiteral("<h4>Fourth</h4><h5><strong>Fifth</strong></h5><h6>Sixth</h6>");
        document.setHtml(deepHeadings);
        NotesRichDocument::prepareHeadingStyles(document, deepHeadings);
        QCOMPARE(NotesRichDocument::serialize(document), deepHeadings);
        document.setHtml("<p>Hello <strong>world</strong></p>");
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>Hello <strong>world</strong></p>"));
        QVERIFY(NotesRichDocument::toggleInline(document, 0, 5, "italic"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p><em>Hello</em> <strong>world</strong></p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>Hello <strong>world</strong></p>"));
        QVERIFY(!NotesRichDocument::toggleInline(document, 0, 100, "bold"));
        QVERIFY(!NotesRichDocument::toggleInline(document, 0, 5, "unsupported"));

        QTextDocument insertionDocument;
        insertionDocument.setHtml("<p>abc</p>");
        const QString insertionOriginal = NotesRichDocument::serialize(insertionDocument);
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(insertionDocument, 3, "bold"));
        QCOMPARE(NotesRichDocument::serialize(insertionDocument), insertionOriginal);
        QTextCursor insertionCursor(&insertionDocument);
        insertionCursor.setPosition(3);
        insertionCursor.insertText("X");
        QVERIFY(NotesRichDocument::applyPendingInlineMarks(insertionDocument, 3, 4));
        QCOMPARE(NotesRichDocument::serialize(insertionDocument), QStringLiteral("<p>abc<strong>X</strong></p>"));
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(insertionDocument, 4, "bold"));
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(insertionDocument, 4, "italic"));
        QTextCursor secondInsertionCursor(&insertionDocument);
        secondInsertionCursor.setPosition(4);
        secondInsertionCursor.insertText("Y");
        QVERIFY(NotesRichDocument::applyPendingInlineMarks(insertionDocument, 4, 5));
        QCOMPARE(NotesRichDocument::serialize(insertionDocument),
                 QStringLiteral("<p>abc<strong>X</strong><em>Y</em></p>"));
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(insertionDocument, 5, "spoiler"));
        QTextCursor spoilerInsertionCursor(&insertionDocument);
        spoilerInsertionCursor.setPosition(5);
        spoilerInsertionCursor.insertText("Z");
        QVERIFY(NotesRichDocument::applyPendingInlineMarks(insertionDocument, 5, 6));
        const QString spoilerInsertionHtml = NotesRichDocument::serialize(insertionDocument);
        QVERIFY2(spoilerInsertionHtml.contains("data-type=\"spoiler\"") && spoilerInsertionHtml.contains("Z"),
                 qPrintable(spoilerInsertionHtml));

        QTextDocument canceledMarkDocument;
        canceledMarkDocument.setHtml("<p>abc</p>");
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(canceledMarkDocument, 3, "underline"));
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(canceledMarkDocument, 3, "underline"));
        QTextCursor canceledMarkCursor(&canceledMarkDocument);
        canceledMarkCursor.setPosition(3);
        canceledMarkCursor.insertText("X");
        QVERIFY(NotesRichDocument::applyPendingInlineMarks(canceledMarkDocument, 3, 4));
        QCOMPARE(NotesRichDocument::serialize(canceledMarkDocument), QStringLiteral("<p>abcX</p>"));

        const QVector<QPair<QString, QString>> insertionCases = {
            {"underline", "<u>X</u>"}, {"strike", "<s>X</s>"}, {"code", "<code>X</code>"}
        };
        for (const auto &insertionCase : insertionCases) {
            QTextDocument markedDocument;
            markedDocument.setHtml("<p>a</p>");
            QVERIFY(NotesRichDocument::toggleInlineAtCursor(markedDocument, 1, insertionCase.first));
            QTextCursor markedCursor(&markedDocument);
            markedCursor.setPosition(1);
            markedCursor.insertText("X");
            QVERIFY(NotesRichDocument::applyPendingInlineMarks(markedDocument, 1, 2));
            const QString markedHtml = NotesRichDocument::serialize(markedDocument);
            QVERIFY2(markedHtml.contains(insertionCase.second.toHtmlEscaped()) || markedHtml.contains(insertionCase.second),
                     qPrintable(markedHtml));
        }

        document.setHtml("<p>First</p><p>Second</p>");
        QVERIFY(NotesRichDocument::toggleBlock(document, 0, 5, "heading1"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<h1>First</h1><p>Second</p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>First</p><p>Second</p>"));
        QVERIFY(NotesRichDocument::toggleBlock(document, 0, 5, "heading6"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<h6>First</h6><p>Second</p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>First</p><p>Second</p>"));
        QVERIFY(NotesRichDocument::toggleBlock(document, 6, 12, "bulletList"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>First</p><ul><li><p>Second</p></li></ul>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>First</p><p>Second</p>"));
        QVERIFY(NotesRichDocument::toggleBlock(document, 0, 12, "quote"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<blockquote><p>First</p><p>Second</p></blockquote>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>First</p><p>Second</p>"));
        QVERIFY(!NotesRichDocument::toggleBlock(document, 0, 5, "customBlock"));

        QTextDocument nestedDocument;
        nestedDocument.setHtml(nestedList);
        QCOMPARE(NotesRichDocument::serialize(nestedDocument), nestedList);
        const QString mixedNestedList =
            "<ul><li><p>Parent</p><ol><li><p>Numbered child</p></li></ol></li></ul>";
        nestedDocument.setHtml(mixedNestedList);
        QCOMPARE(NotesRichDocument::serialize(nestedDocument), mixedNestedList);

        QString taskEditorSource;
        QVector<NotesRichTaskMarkup::ListItemState> taskItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(taskMarkup, taskEditorSource, taskItems));
        QCOMPARE(taskEditorSource,
                 QStringLiteral("<ul><li><p>Done <strong>task</strong></p></li><li><p><s>Keep strike</s> Open task</p></li></ul>"));
        QString expectedTaskOutput = taskMarkup;
        expectedTaskOutput.replace("<input type=\"checkbox\" checked=\"checked\">",
                                   "<input type=\"checkbox\" checked=\"checked\"/>");
        expectedTaskOutput.replace("<input type=\"checkbox\">", "<input type=\"checkbox\"/>");
        QTextDocument taskDocument;
        taskDocument.setHtml(taskEditorSource);
        NotesRichDocument::prepareHeadingStyles(taskDocument, taskMarkup);
        QCOMPARE(NotesRichDocument::serialize(taskDocument), expectedTaskOutput);
        bool foundStyledTaskText = false;
        for (auto it = taskDocument.begin().begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.text().contains("Done")) {
                foundStyledTaskText = true;
                QVERIFY(fragment.charFormat().fontStrikeOut());
                QCOMPARE(fragment.charFormat().foreground().color().alpha(), 128);
            }
        }
        QVERIFY(foundStyledTaskText);
        const int firstTaskPosition = taskDocument.begin().position();
        QVERIFY(NotesRichDocument::isTaskItemAt(taskDocument, firstTaskPosition));
        QVERIFY(!NotesRichDocument::isTaskItemAt(taskDocument, firstTaskPosition + 2));
        QVERIFY(NotesRichDocument::toggleTaskItemFromCursor(taskDocument, firstTaskPosition));
        QVERIFY(NotesRichDocument::serialize(taskDocument).contains("data-checked=\"false\""));
        taskDocument.undo();
        QVERIFY(!NotesRichDocument::toggleTaskItemFromCursor(taskDocument, firstTaskPosition + 1));
        QVERIFY(NotesRichDocument::toggleTaskItem(taskDocument, firstTaskPosition));
        QVERIFY(NotesRichDocument::serialize(taskDocument).contains("data-checked=\"false\""));
        QVERIFY(!NotesRichDocument::serialize(taskDocument).contains("<s>Done</s>"));
        QVERIFY(NotesRichDocument::serialize(taskDocument).contains("<s>Keep strike</s>"));
        taskDocument.undo();
        QCOMPARE(NotesRichDocument::serialize(taskDocument), expectedTaskOutput);

        const QString nestedTaskMarkup = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>Parent</p>"
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Child</p></div></li></ul></div></li></ul>");
        QString nestedTaskEditorSource;
        QVector<NotesRichTaskMarkup::ListItemState> nestedTaskItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(nestedTaskMarkup, nestedTaskEditorSource, nestedTaskItems));
        QCOMPARE(nestedTaskItems.size(), 2);
        QTextDocument nestedTaskDocument;
        nestedTaskDocument.setHtml(nestedTaskEditorSource);
        QVERIFY(NotesRichTaskLists::prepareDocument(nestedTaskDocument, nestedTaskMarkup));
        QString expectedNestedTaskMarkup = nestedTaskMarkup;
        expectedNestedTaskMarkup.replace("<input type=\"checkbox\" checked=\"checked\">",
                                         "<input type=\"checkbox\" checked=\"checked\"/>");
        expectedNestedTaskMarkup.replace("<input type=\"checkbox\">", "<input type=\"checkbox\"/>");
        QCOMPARE(NotesRichDocument::serialize(nestedTaskDocument), expectedNestedTaskMarkup);
        const int nestedTaskPosition = nestedTaskDocument.begin().next().position();
        QVERIFY(NotesRichDocument::toggleTaskItem(nestedTaskDocument, nestedTaskPosition));
        QCOMPARE(NotesRichDocument::serialize(nestedTaskDocument).count("data-checked=\"true\""), 2);
        nestedTaskDocument.undo();
        QCOMPARE(NotesRichDocument::serialize(nestedTaskDocument), expectedNestedTaskMarkup);

        const QString flatList = "<ul><li><p>First</p></li><li><p>Second</p></li></ul>";
        nestedDocument.setHtml(flatList);
        const int firstListItem = nestedDocument.begin().position();
        const int secondListItem = nestedDocument.begin().next().position();
        QVERIFY(!NotesRichDocument::changeListIndent(nestedDocument, firstListItem, false));
        QVERIFY(!NotesRichDocument::changeListIndent(nestedDocument, firstListItem, true));
        QVERIFY(NotesRichDocument::changeListIndent(nestedDocument, secondListItem, false));
        const QString indentedList =
            "<ul><li><p>First</p><ul><li><p>Second</p></li></ul></li></ul>";
        QCOMPARE(NotesRichDocument::serialize(nestedDocument), indentedList);
        QVERIFY(NotesRichDocument::changeListIndent(nestedDocument, secondListItem, true));
        QCOMPARE(NotesRichDocument::serialize(nestedDocument), flatList);
        nestedDocument.undo();
        QCOMPARE(NotesRichDocument::serialize(nestedDocument), indentedList);

        document.setHtml("<p>const value</p><p>return value</p>");
        QVERIFY(NotesRichDocument::toggleBlock(document, 0, 24, "codeBlock"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<pre><code>const value\nreturn value</code></pre>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>const value</p><p>return value</p>"));
        document.setHtml("<pre><code>if (a &lt; b &amp;&amp; c)</code></pre>");
        QCOMPARE(NotesRichDocument::serialize(document), QString("<pre><code>if (a &lt; b &amp;&amp; c)</code></pre>"));

        document.setHtml("<p>plain <code>const</code></p>");
        const QString codeHtml = NotesRichDocument::serialize(document);
        QCOMPARE(codeHtml, QString("<p>plain <code>const</code></p>"));
        QVERIFY(NotesRichDocument::supportsSource(codeHtml));
        QVERIFY(NotesRichDocument::toggleInline(document, 6, 11, "code"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>plain const</p>"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>plain <code>const</code></p>"));

        document.setHtml("<p>purple yellow</p>");
        QVERIFY(NotesRichDocument::setColor(document, 0, 6, "#A855F7", false));
        QVERIFY(NotesRichDocument::setColor(document, 7, 13, "#EAB308", true));
        const QString coloredHtml = NotesRichDocument::serialize(document);
        QVERIFY(coloredHtml.contains("<span style=\"color:#a855f7\">purple</span>"));
        QVERIFY(coloredHtml.contains("<mark style=\"background-color:#eab308\">yellow</mark>"));
        QVERIFY(NotesRichDocument::supportsSource(coloredHtml));
        QVERIFY(NotesRichDocument::setColor(document, 0, 6, "", false));
        QVERIFY(!NotesRichDocument::serialize(document).contains("color:#a855f7"));
        document.undo();
        QVERIFY(NotesRichDocument::serialize(document).contains("color:#a855f7"));
        QVERIFY(!NotesRichDocument::setColor(document, 0, 6, "url(unsafe)", false));

        document.setHtml("<p>Visit page</p>");
        QVERIFY(NotesRichDocument::setLink(document, 6, 10, "https://example.com/path?q=one&next=two"));
        QCOMPARE(NotesRichDocument::linkAtSelection(document, 6, 10),
                 QString("https://example.com/path?q=one&next=two"));
        const QString linkedHtml = NotesRichDocument::serialize(document);
        QCOMPARE(linkedHtml, QString("<p>Visit <a href=\"https://example.com/path?q=one&amp;next=two\">page</a></p>"));
        QVERIFY(NotesRichDocument::supportsSource(linkedHtml));
        QVERIFY(!NotesRichDocument::setLink(document, 6, 10, "javascript:alert(1)"));
        QVERIFY(NotesRichDocument::setLink(document, 6, 10, ""));
        QVERIFY(NotesRichDocument::linkAtSelection(document, 6, 10).isEmpty());
        document.undo();
        QCOMPARE(NotesRichDocument::linkAtSelection(document, 6, 10),
                 QString("https://example.com/path?q=one&next=two"));

        document.setHtml(QString::fromUtf8("<p>A &amp; 😀<br/>next</p><p><u>Second</u></p>"));
        const QString html = NotesRichDocument::serialize(document);
        QVERIFY(NotesRichDocument::supportsSource(html));
        QTextDocument roundTrip;
        roundTrip.setHtml(html);
        QCOMPARE(roundTrip.toPlainText(), document.toPlainText());
        QCOMPARE(NotesRichDocument::serialize(roundTrip), html);

        document.setHtml("<p><strong>one</strong> two</p>");
        QVERIFY(NotesRichDocument::toggleInline(document, 0, 7, "bold"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p><strong>one two</strong></p>"));
        QVERIFY(NotesRichDocument::toggleInline(document, 0, 7, "bold"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>one two</p>"));

        document.setHtml("<p><a href=\"https://example.com\">link</a></p>");
        const QString normalizedLink = NotesRichDocument::serialize(document);
        QCOMPARE(normalizedLink,
                 QString("<p><a href=\"https://example.com\"><span style=\"color:#0000ff\"><u>link</u></span></a></p>"));
        QVERIFY(NotesRichDocument::supportsSource(normalizedLink));
        document.setHtml("<p><span style=\"color:red\">red</span></p>");
        const QString normalizedColor = NotesRichDocument::serialize(document);
        QCOMPARE(normalizedColor, QString("<p><span style=\"color:#ff0000\">red</span></p>"));
        QVERIFY(NotesRichDocument::supportsSource(normalizedColor));
        document.setHtml("<ul><li>list item</li></ul>");
        const QString normalizedList = NotesRichDocument::serialize(document);
        QCOMPARE(normalizedList, QString("<ul><li><p>list item</p></li></ul>"));
        QVERIFY(NotesRichDocument::supportsSource(normalizedList));
        document.setHtml("<table><tr><td>cell</td></tr></table>");
        QVERIFY(NotesRichDocument::serialize(document).isNull());
        document.setPlainText("multiple  spaces");
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p style=\"white-space:pre-wrap\">multiple  spaces</p>"));
    }

    void spoilerMarksRoundTripAndRevealWithoutRemovingTheMark() {
        const QString source = QStringLiteral(
            "<p>Visible <span data-type=\"spoiler\" class=\"caderno-spoiler\"><span style=\"color:#a855f7\">"
            "<mark style=\"background-color:#eab308\"><strong>secret</strong></mark></span></span></p>");
        NotesTextOperations operations;
        QVERIFY(operations.supportsRichSource(source));
        QVERIFY(operations.supportsRichSource(
            "<p><span class=\"telegram-spoiler\">legacy</span></p>"));
        QVERIFY(!operations.supportsRichSource(
            "<p><span data-type=\"spoiler\" class=\"custom\">unsafe</span></p>"));
        QVERIFY(!operations.supportsRichSource(
            "<p><span data-type=\"spoiler\" onclick=\"run()\">unsafe</span></p>"));

        const QString editorMarkup = operations.richSourceForEditor(source);
        QVERIFY(editorMarkup.contains("text-decoration:overline"));
        QTextDocument document;
        document.setHtml(editorMarkup);
        QVERIFY(NotesRichDocument::prepareSpoilerStyles(document));
        QCOMPARE(document.availableUndoSteps(), 0);
        const QString expected = QStringLiteral(
            "<p>Visible <span data-type=\"spoiler\" class=\"caderno-spoiler\"><span style=\"color:#a855f7\">"
            "<mark style=\"background-color:#eab308\"><strong>secret</strong></mark></span></span></p>");
        QCOMPARE(NotesRichDocument::serialize(document), expected);
        QVERIFY(NotesRichDocument::supportsSource(expected));

        QTextCursor secret = document.find(QStringLiteral("secret"));
        QVERIFY(secret.hasSelection());
        QVERIFY(NotesRichDocument::isSpoilerAt(document, secret.selectionStart()));
        QVERIFY(!NotesRichDocument::isSpoilerRevealedAt(document, secret.selectionStart()));
        auto formatAt = [&document](int position) {
            const QTextBlock block = document.findBlock(position);
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (fragment.isValid() && position >= fragment.position() &&
                    position < fragment.position() + fragment.length()) return fragment.charFormat();
            }
            return QTextCharFormat();
        };
        QTextCharFormat hidden = formatAt(secret.selectionStart());
        QVERIFY(hidden.boolProperty(NotesRichFormat::SpoilerHidden));
        QCOMPARE(hidden.foreground().color().alpha(), 0);

        const int undoStepsBeforeReveal = document.availableUndoSteps();
        QVERIFY(NotesRichDocument::setSpoilerVisibility(document, secret.selectionStart(), "reveal"));
        QVERIFY(NotesRichDocument::isSpoilerAt(document, secret.selectionStart()));
        QVERIFY(NotesRichDocument::isSpoilerRevealedAt(document, secret.selectionStart()));
        QCOMPARE(document.availableUndoSteps(), undoStepsBeforeReveal);
        QVERIFY(formatAt(secret.selectionStart()).boolProperty(NotesRichFormat::SpoilerHidden));
        QVERIFY(!document.findBlock(secret.selectionStart()).layout()->formats().isEmpty());
        QCOMPARE(NotesRichDocument::serialize(document), expected);
        QVERIFY(NotesRichDocument::setSpoilerVisibility(document, secret.selectionStart(), "toggle"));
        QVERIFY(!NotesRichDocument::isSpoilerRevealedAt(document, secret.selectionStart()));
        hidden = formatAt(secret.selectionStart());
        QVERIFY(hidden.boolProperty(NotesRichFormat::SpoilerHidden));
        QVERIFY(NotesRichDocument::setSpoilerVisibility(document, secret.selectionStart(), "hide"));
        QVERIFY(!NotesRichDocument::isSpoilerRevealedAt(document, secret.selectionStart()));
        QCOMPARE(document.availableUndoSteps(), undoStepsBeforeReveal);
        QVERIFY(document.findBlock(secret.selectionStart()).layout()->formats().isEmpty());
        QVERIFY(!NotesRichDocument::setSpoilerVisibility(document, 0, "toggle"));

        QVERIFY(NotesRichDocument::toggleInline(document, secret.selectionStart(), secret.selectionEnd(), "spoiler"));
        QVERIFY(!NotesRichDocument::isSpoilerAt(document, secret.selectionStart()));
        QVERIFY(!NotesRichDocument::serialize(document).contains("data-type=\"spoiler\""));
        document.undo();
        QVERIFY(NotesRichDocument::isSpoilerAt(document, secret.selectionStart()));
        QCOMPARE(NotesRichDocument::serialize(document), expected);

        QTextCursor inserted(&document);
        inserted.setPosition(secret.selectionStart() + 2);
        inserted.insertText(QStringLiteral("x"));
        QVERIFY(NotesRichDocument::isSpoilerAt(document, secret.selectionStart() + 2));
        QString editedExpected = expected;
        editedExpected.replace(QStringLiteral("secret"), QStringLiteral("sexcret"));
        QCOMPARE(NotesRichDocument::serialize(document), editedExpected);
    }

    void taskCheckboxInventoryIncludesNamesAndCheckedState() {
        const QString source = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\" checked=\"checked\"><span></span></label>"
            "<div><p>Review <strong>chapter</strong></p></div></li>"
            "<li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"><span></span></label>"
            "<div><p>Write summary</p></div></li></ul>");
        QString editorSource;
        QVector<NotesRichTaskMarkup::ListItemState> sourceItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(source, editorSource, sourceItems));
        QTextDocument document;
        document.setHtml(editorSource);
        QVERIFY(NotesRichTaskLists::prepareDocument(document, source));

        QVariantList items = NotesRichTaskLists::checkboxItems(document);
        QCOMPARE(items.size(), 2);
        QCOMPARE(items.at(0).toMap().value(QStringLiteral("label")).toString(), QStringLiteral("Review chapter"));
        QVERIFY(items.at(0).toMap().value(QStringLiteral("checked")).toBool());
        QCOMPARE(items.at(1).toMap().value(QStringLiteral("label")).toString(), QStringLiteral("Write summary"));
        QVERIFY(!items.at(1).toMap().value(QStringLiteral("checked")).toBool());

        const int firstPosition = items.at(0).toMap().value(QStringLiteral("position")).toInt();
        QVERIFY(NotesRichDocument::toggleTaskItem(document, firstPosition));
        items = NotesRichTaskLists::checkboxItems(document);
        QVERIFY(!items.at(0).toMap().value(QStringLiteral("checked")).toBool());
        QCOMPARE(document.toPlainText().count(QStringLiteral("Review chapter")), 1);
        document.undo();
        QVERIFY(NotesRichTaskLists::checkboxItems(document).at(0).toMap()
                    .value(QStringLiteral("checked")).toBool());
    }

    void multiParagraphTaskItemsRoundTripAndToggleAsOneItem() {
        const QString source = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div>"
            "<p>First <strong>item</strong></p><p><em>Second</em> paragraph</p></div></li>"
            "<li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"><span></span></label>"
            "<div><p>Parent</p><ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Child</p><p>Child detail</p></div></li></ul>"
            "<p><em>Parent detail</em></p></div></li>"
            "<li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"><span></span></label>"
            "<div><p>Sibling</p></div></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(source));
        const QString afterChild = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>First</p>"
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Nested</p></div></li></ul>"
            "<p>Second</p></div></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(afterChild));
        QString normalizedAfterChild;
        QVector<NotesRichTaskMarkup::ListItemState> afterChildItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(afterChild, normalizedAfterChild, afterChildItems));
        QTextDocument afterChildDocument;
        afterChildDocument.setHtml(normalizedAfterChild);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(afterChildDocument, afterChild));
        QString afterChildExpected = afterChild;
        afterChildExpected.replace("<input type=\"checkbox\">", "<input type=\"checkbox\"/>");
        QCOMPARE(NotesRichDocument::serialize(afterChildDocument), afterChildExpected);

        const QString afterStandardList = QStringLiteral(
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Before</p>"
            "<ol><li><p>Numbered child</p></li></ol><p>After</p></div></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(afterStandardList));
        QString normalizedAfterStandardList;
        QVector<NotesRichTaskMarkup::ListItemState> standardListItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(afterStandardList, normalizedAfterStandardList,
                                                     standardListItems));
        QTextDocument standardListDocument;
        standardListDocument.setHtml(normalizedAfterStandardList);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(standardListDocument, afterStandardList));
        QString standardListExpected = afterStandardList;
        standardListExpected.replace("<input type=\"checkbox\">", "<input type=\"checkbox\"/>");
        QCOMPARE(NotesRichDocument::serialize(standardListDocument), standardListExpected);

        QString normalized;
        QVector<NotesRichTaskMarkup::ListItemState> sourceItems;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(source, normalized, sourceItems));
        QCOMPARE(sourceItems.size(), 4);
        QCOMPARE(sourceItems.at(0).paragraphBlocks, 2);
        QVERIFY(sourceItems.at(1).hasNestedList);
        QCOMPARE(sourceItems.at(1).paragraphsBeforeNestedList, 1);
        QCOMPARE(sourceItems.at(2).paragraphBlocks, 2);

        QTextDocument document;
        document.setHtml(normalized);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QString expected = source;
        expected.replace("<input type=\"checkbox\" checked=\"checked\">",
                         "<input type=\"checkbox\" checked=\"checked\"/>");
        expected.replace("<input type=\"checkbox\">", "<input type=\"checkbox\"/>");
        QCOMPARE(NotesRichDocument::serialize(document), expected);

        const QVariantList checkboxes = NotesRichTaskLists::checkboxItems(document);
        QCOMPARE(checkboxes.size(), 4);
        QCOMPARE(checkboxes.at(0).toMap().value(QStringLiteral("label")).toString(),
                 QStringLiteral("First item\nSecond paragraph"));
        QCOMPARE(checkboxes.at(1).toMap().value(QStringLiteral("label")).toString(),
                 QStringLiteral("Parent\nParent detail"));
        QCOMPARE(checkboxes.at(2).toMap().value(QStringLiteral("label")).toString(),
                 QStringLiteral("Child\nChild detail"));
        QVERIFY(!checkboxes.at(1).toMap().value(QStringLiteral("checked")).toBool());
        QVERIFY(checkboxes.at(0).toMap().value(QStringLiteral("checked")).toBool());
        QTextBlock secondParagraph = document.findBlock(document.toPlainText().indexOf(QStringLiteral("Second")));
        QVERIFY(secondParagraph.isValid());
        bool checkedStyleAppliedToContinuation = false;
        for (auto it = secondParagraph.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.text().contains(QStringLiteral("Second"))) {
                checkedStyleAppliedToContinuation = true;
                QVERIFY(fragment.charFormat().fontStrikeOut());
                QCOMPARE(fragment.charFormat().foreground().color().alpha(), 128);
            }
        }
        QVERIFY(checkedStyleAppliedToContinuation);
        const int taskPosition = checkboxes.at(0).toMap().value(QStringLiteral("position")).toInt();
        QVERIFY(NotesRichDocument::toggleTaskItem(document, taskPosition));
        const QString unchecked = NotesRichDocument::serialize(document);
        QVERIFY(unchecked.contains("data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"/><span></span></label><div><p>First"));
        QVERIFY(unchecked.contains("<p><em>Second</em> paragraph</p>"));
        QCOMPARE(NotesRichTaskLists::checkboxItems(document).at(0).toMap()
                     .value(QStringLiteral("label")).toString(), QStringLiteral("First item\nSecond paragraph"));
        secondParagraph = document.findBlock(document.toPlainText().indexOf(QStringLiteral("Second")));
        for (auto it = secondParagraph.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.text().contains(QStringLiteral("Second")))
                QVERIFY(!fragment.charFormat().fontStrikeOut());
        }
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), expected);

        const int parentPosition = checkboxes.at(1).toMap().value(QStringLiteral("position")).toInt();
        QVERIFY(NotesRichDocument::toggleTaskItem(document, parentPosition));
        const QString checkedParent = NotesRichDocument::serialize(document);
        QVERIFY(checkedParent.contains(
            "data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"/>"
            "<span></span></label><div><p>Parent</p><ul data-type=\"taskList\">"));
        QVERIFY(checkedParent.contains("</ul><p><em>Parent detail</em></p></div></li>"));
        const QVariantList checkedParentItems = NotesRichTaskLists::checkboxItems(document);
        QVERIFY(checkedParentItems.at(1).toMap().value(QStringLiteral("checked")).toBool());
        QVERIFY(!checkedParentItems.at(2).toMap().value(QStringLiteral("checked")).toBool());
        const QTextBlock parentDetail = document.findBlock(document.toPlainText().indexOf("Parent detail"));
        const QTextBlock childParagraph = document.findBlock(document.toPlainText().indexOf("Child"));
        bool parentDetailStruck = false;
        bool childParagraphStruck = false;
        for (auto it = parentDetail.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.text().contains("Parent detail"))
                parentDetailStruck = fragment.charFormat().fontStrikeOut();
        }
        for (auto it = childParagraph.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.text().contains("Child"))
                childParagraphStruck = fragment.charFormat().fontStrikeOut();
        }
        QVERIFY(parentDetailStruck);
        QVERIFY(!childParagraphStruck);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), expected);

        QTextCursor continuationEdit(&document);
        continuationEdit.setPosition(document.toPlainText().indexOf(QStringLiteral("Second")) + 6);
        continuationEdit.insertText(QStringLiteral("!"));
        QString editedExpected = expected;
        editedExpected.replace(QStringLiteral("<em>Second</em>"), QStringLiteral("<em>Second!</em>"));
        QCOMPARE(NotesRichDocument::serialize(document), editedExpected);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), expected);

        const int continuationPosition = document.toPlainText().indexOf(QStringLiteral("Second"));
        QVERIFY(continuationPosition > taskPosition);
        QVERIFY(!NotesRichDocument::toggleBlock(document, continuationPosition,
                                                continuationPosition + 6, "heading2"));
        QCOMPARE(NotesRichDocument::serialize(document), expected);
    }

    void multiParagraphStandardListItemsRoundTripAroundNestedLists() {
        const QString source = QStringLiteral(
            "<ul><li><p>Leading sibling</p></li><li><p>Parent <strong>item</strong></p>"
            "<ol><li><p>Nested first</p><p>Nested detail</p></li></ol>"
            "<p><em>Parent detail</em></p></li><li><p>Trailing sibling</p></li></ul>");
        QVERIFY(NotesRichDocument::supportsSource(source));

        QString normalized;
        QVector<NotesRichTaskMarkup::ListItemState> items;
        QVERIFY(NotesRichTaskMarkup::normalizeSource(source, normalized, items));
        QCOMPARE(items.size(), 4);
        QCOMPARE(items.at(0).paragraphBlocks, 1);
        QCOMPARE(items.at(1).paragraphBlocks, 2);
        QCOMPARE(items.at(2).paragraphBlocks, 2);
        QCOMPARE(items.at(3).paragraphBlocks, 1);

        QTextDocument document;
        document.setHtml(normalized);
        QVERIFY(NotesRichDocument::prepareHeadingStyles(document, source));
        QCOMPARE(NotesRichDocument::serialize(document), source);

        QTextCursor continuation(&document);
        continuation.setPosition(document.toPlainText().indexOf(QStringLiteral("Parent detail")) + 6);
        continuation.insertText(QStringLiteral("!"));
        QString edited = source;
        edited.replace(QStringLiteral("Parent detail"), QStringLiteral("Parent! detail"));
        QCOMPARE(NotesRichDocument::serialize(document), edited);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);

        const int parentContinuation = document.toPlainText().indexOf(QStringLiteral("Parent detail"));
        QVERIFY(NotesRichDocument::changeListIndent(document, parentContinuation, false));
        const QString indented = QStringLiteral(
            "<ul><li><p>Leading sibling</p><ul><li><p>Parent <strong>item</strong></p>"
            "<ol><li><p>Nested first</p><p>Nested detail</p></li></ol>"
            "<p><em>Parent detail</em></p></li></ul></li><li><p>Trailing sibling</p></li></ul>");
        QCOMPARE(NotesRichDocument::serialize(document), indented);
        QVERIFY(NotesRichDocument::changeListIndent(document, parentContinuation, true));
        QCOMPARE(NotesRichDocument::serialize(document), source);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), indented);
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), source);
    }

    void formattingReplacementPreservesUndoHistory() {
        QTextDocument document;
        document.setPlainText("hello");
        QTextCursor typing(&document);
        typing.movePosition(QTextCursor::End);
        typing.insertText(" world");
        QVERIFY(NotesTextOperations::replaceDocumentText(&document, 0, 5, "<u>hello</u>"));
        QCOMPARE(document.toPlainText(), QString("<u>hello</u> world"));
        document.undo();
        QCOMPARE(document.toPlainText(), QString("hello world"));
        document.undo();
        QCOMPARE(document.toPlainText(), QString("hello"));
        document.redo();
        document.redo();
        QCOMPARE(document.toPlainText(), QString("<u>hello</u> world"));
        QVERIFY(!NotesTextOperations::replaceDocumentText(&document, -1, 5, "invalid"));
        QCOMPARE(document.toPlainText(), QString("<u>hello</u> world"));

        const QString customBlock = QString::fromUtf8("<div data-type=\"question\">😀</div>\nplain");
        document.setPlainText(customBlock);
        const int plainStart = customBlock.indexOf("plain");
        QVERIFY(NotesTextOperations::replaceDocumentText(&document, plainStart, plainStart + 5, "<em>plain</em>"));
        QCOMPARE(document.toPlainText(), customBlock.left(plainStart) + "<em>plain</em>");
        document.undo();
        QCOMPARE(document.toPlainText(), customBlock);
    }
    void pageCoverCanBeProcessedSavedAndRemoved() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath("page-cover.png");
        QImage source(2400, 600, QImage::Format_RGB32);
        source.fill(QColor("#8b5cf6"));
        QVERIFY(source.save(sourcePath, "PNG"));

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-cover.sqlite")));
        const QString pageId = controller.createSubPage("", "Cover page", "📄");
        QVERIFY(!pageId.isEmpty());
        QVERIFY(controller.getPage(pageId).value("cover_image").toString().isEmpty());

        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.processNotesPageCover(QUrl::fromLocalFile(sourcePath));
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 10000);

        const QVariantMap operation = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(operation.value("success").toBool(), qPrintable(operation.value("error").toString()));
        QCOMPARE(operation.value("operation").toString(), QString("notes-cover-process"));
        const QString coverDataUrl = operation.value("coverImage").toString();
        QVERIFY(coverDataUrl.startsWith("data:image/jpeg;base64,"));
        QImage processedImage;
        QVERIFY(processedImage.loadFromData(QByteArray::fromBase64(coverDataUrl.section(',', 1).toLatin1())));
        QCOMPARE(processedImage.width(), 1280);
        QCOMPARE(processedImage.height(), 320);

        QVERIFY(controller.updatePageCover(pageId, coverDataUrl));
        QCOMPARE(controller.getPage(pageId).value("cover_image").toString(), coverDataUrl);
        QVERIFY(controller.updatePageCover(pageId, ""));
        QVERIFY(controller.getPage(pageId).value("cover_image").toString().isEmpty());

        const QString randomCover = controller.createRandomPageCoverUrl();
        QVERIFY(randomCover.startsWith("https://picsum.photos/seed/"));
        QVERIFY(randomCover.endsWith("/1600/400"));
    }

    void nativeSubPageReorderingAndMovesRejectCycles() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-hierarchy.sqlite")));
        const QString parentId = controller.createSubPage("", "Parent", "📄");
        const QString firstId = controller.createSubPage(parentId, "First", "📄");
        const QString secondId = controller.createSubPage(parentId, "Second", "📄");
        const QString thirdId = controller.createSubPage(parentId, "Third", "📄");
        QVERIFY(!parentId.isEmpty());
        QVERIFY(!firstId.isEmpty());
        QVERIFY(!secondId.isEmpty());
        QVERIFY(!thirdId.isEmpty());

        QVERIFY(controller.reorderSubPages(parentId, {thirdId, secondId, firstId}));
        const auto pageOrder = [&controller](const QString &pageId) {
            const QVariantList pages = controller.getPageTree();
            for (const QVariant &value : pages) {
                const QVariantMap page = value.toMap();
                if (page.value("id").toString() == pageId) return page.value("sort_order").toInt();
            }
            return -1;
        };
        QCOMPARE(pageOrder(thirdId), 0);
        QCOMPARE(pageOrder(secondId), 1);
        QCOMPARE(pageOrder(firstId), 2);
        QVERIFY(!controller.reorderSubPages(parentId, {thirdId, thirdId, firstId}));
        QVERIFY(!controller.reorderSubPages(parentId, {thirdId, secondId}));

        QVERIFY(controller.movePage(firstId, secondId));
        QCOMPARE(controller.getPage(firstId).value("parent_id").toString(), secondId);
        QVERIFY(!controller.movePage(secondId, firstId));
        QVERIFY(!controller.movePage(parentId, firstId));
        QVERIFY(controller.movePage(firstId, parentId));
        QCOMPARE(controller.getPage(firstId).value("parent_id").toString(), parentId);
        QVERIFY(controller.movePage(firstId, ""));
        QVERIFY(controller.getPage(firstId).value("parent_id").toString().isEmpty());
    }

    void richHtmlPagesAndHistoryRoundTrip() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeEditorPassword42!"));

        const QString pageId = controller.createSubPage("", "Rich HTML note", "📄");
        QVERIFY(!pageId.isEmpty());
        const QString firstHtml = "<h1>Heading</h1><p>Saved <strong>HTML</strong> stays HTML.</p>";
        const QString secondHtml = "<p>Newer revision.</p>";
        QVERIFY(controller.updatePageDescription(pageId, "A short page summary."));
        QVERIFY(controller.savePage(pageId, "Rich HTML note", firstHtml, "📄"));

        const QVariantMap loadedPage = controller.getPage(pageId);
        QCOMPARE(loadedPage.value("content").toString(), firstHtml);
        QCOMPARE(loadedPage.value("description").toString(), "A short page summary.");
        QVariantList history = controller.getPageHistory(pageId);
        QCOMPARE(history.size(), 1);
        QCOMPARE(history.first().toMap().value("content").toString(), firstHtml);

        QVERIFY(controller.savePage(pageId, "Rich HTML note", secondHtml, "📄"));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), secondHtml);
        QVERIFY(controller.restorePageRevision(pageId, history.first().toMap().value("id").toString()));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), firstHtml);
        QCOMPARE(controller.getPage(pageId).value("description").toString(), "A short page summary.");

        controller.lockVault();
        const QString lockedContent = controller.getPage(pageId).value("content").toString();
        QVERIFY(lockedContent.contains("Encrypted note"));
        QVERIFY(!lockedContent.contains(firstHtml));
        QVERIFY(controller.unlockVault("NativeEditorPassword42!"));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), firstHtml);
    }

    void deletingPageMovesItsSubtreeAndLinkedEventsToTrash() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-delete.sqlite")));

        const QString rootId = controller.createSubPage("", "Root note", "📄");
        const QString childId = controller.createSubPage(rootId, "Child note", "📄");
        const QString grandchildId = controller.createSubPage(childId, "Grandchild note", "📄");
        QVERIFY(!rootId.isEmpty());
        QVERIFY(!childId.isEmpty());
        QVERIFY(!grandchildId.isEmpty());

        const QString eventInsert = QString(
            "INSERT INTO calendar_events (id, title, page_id, created_at, updated_at) "
            "VALUES ('linked-note-event', 'Linked event', '%1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ).arg(childId);
        QVERIFY(controller.executeSql(eventInsert));

        QVERIFY(controller.deletePage(rootId));
        QVERIFY(controller.getPageTree().isEmpty());
        QVERIFY(controller.getPage(rootId).isEmpty());
        QVERIFY(controller.getPage(childId).isEmpty());
        QVERIFY(controller.getPage(grandchildId).isEmpty());
        QVERIFY(controller.getCalendarEvents().isEmpty());

        const QVariantList trashItems = controller.getTrashItems();
        QCOMPARE(trashItems.size(), 4);
    }
};

int runNativeNotesTest(int argc, char **argv) {
    NativeNotesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_test.moc"
