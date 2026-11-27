#include "synapse_controller.h"
#include "controllers/notes/notes_text_operations.h"
#include "controllers/notes/notes_rich_divider_editing.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_format.h"
#include "controllers/notes/notes_rich_spoilers.h"
#include "controllers/notes/notes_rich_task_markup.h"
#include "controllers/notes/notes_rich_task_lists.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QObject>
#include <QtCore/QPointer>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QColor>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QTextLayout>
#include <QtCore/QUrl>
#include <functional>

class NativeNotesTest final : public QObject {
    Q_OBJECT

private slots:
    void initTestCase() {
        registerNotesPageSwitchTestTypes();
    }

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
        QVERIFY(!NotesRichDocument::isMarkActive(document, 0, 5, "bold"));
        QVERIFY(NotesRichDocument::isMarkActive(document, 6, 11, "bold"));
        QVERIFY(!NotesRichDocument::isMarkActive(document, 0, 11, "bold"));
        QVERIFY(!NotesRichDocument::isMarkActive(document, 6, 11, "italic"));
        QVERIFY(NotesRichDocument::isMarkActive(document, 7, 7, "bold"));
        QVERIFY(!NotesRichDocument::isMarkActive(document, 2, 2, "bold"));
        QVERIFY(NotesRichDocument::toggleInline(document, 0, 5, "italic"));
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p><em>Hello</em> <strong>world</strong></p>"));
        QVERIFY(NotesRichDocument::isMarkActive(document, 0, 5, "italic"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QString("<p>Hello <strong>world</strong></p>"));
        QVERIFY(!NotesRichDocument::toggleInline(document, 0, 100, "bold"));
        QVERIFY(!NotesRichDocument::toggleInline(document, 0, 5, "unsupported"));

        QTextDocument insertionDocument;
        insertionDocument.setHtml("<p>abc</p>");
        const QString insertionOriginal = NotesRichDocument::serialize(insertionDocument);
        QVERIFY(NotesRichDocument::toggleInlineAtCursor(insertionDocument, 3, "bold"));
        QVERIFY(NotesRichDocument::isMarkActive(insertionDocument, 3, 3, "bold"));
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

    void linkMetadataCacheMatchesReactFieldsAndRevivesSoftDeletedRows() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-link-metadata.sqlite")));
        const QString url = "https://example.com/docs?id=17";
        QVERIFY(controller.getLinkMetadata(url).isEmpty());

        QVariantMap entry = {
            {"url", url}, {"title", "Native metadata"}, {"channel", "Research"},
            {"duration", 97.5}, {"is_playlist", true}, {"playlist_count", 12},
            {"upload_date", "2026-11-12"}, {"image_url", "https://example.com/cover.png"}
        };
        QVERIFY(controller.saveLinkMetadata(entry));
        QVariantMap cached = controller.getLinkMetadata(url);
        QCOMPARE(cached.value("url").toString(), url);
        QCOMPARE(cached.value("title").toString(), "Native metadata");
        QCOMPARE(cached.value("channel").toString(), "Research");
        QCOMPARE(cached.value("duration").toDouble(), 97.5);
        QVERIFY(cached.value("isPlaylist").toBool());
        QCOMPARE(cached.value("playlistCount").toInt(), 12);
        QCOMPARE(cached.value("uploadDate").toString(), "2026-11-12");
        QCOMPARE(cached.value("imageUrl").toString(), "https://example.com/cover.png");

        entry.insert("title", "Updated title");
        entry.insert("isPlaylist", false);
        entry.remove("is_playlist");
        QVERIFY(controller.saveLinkMetadata(entry));
        cached = controller.getLinkMetadata(url);
        QCOMPARE(cached.value("title").toString(), "Updated title");
        QVERIFY(!cached.value("isPlaylist").toBool());

        QVERIFY(controller.executeSql(
            "UPDATE link_metadata_cache SET deleted_at = CURRENT_TIMESTAMP WHERE url = 'https://example.com/docs?id=17'"));
        QVERIFY(controller.getLinkMetadata(url).isEmpty());
        QVERIFY(controller.saveLinkMetadata(entry));
        QCOMPARE(controller.getLinkMetadata(url).value("title").toString(), "Updated title");

        QVERIFY(!controller.saveLinkMetadata({{"url", "javascript:alert(1)"}, {"title", "Unsafe"}}));
        QVERIFY(!controller.saveLinkMetadata({{"url", url}, {"title", QString(513, QLatin1Char('x'))}}));
        QVERIFY(controller.getLinkMetadata(url).value("title").toString() == "Updated title");
    }

    void readingPreviewHydratesMissingCardFieldsFromTheIsolatedSqliteCache() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-link-preview-hydration.sqlite")));

        const QString url = "https://cached.example/watch?id=8";
        QVERIFY(controller.saveLinkMetadata({
            {"url", url}, {"title", "Cached title"}, {"channel", "Cached channel"},
            {"duration", 65}, {"isPlaylist", true}, {"playlistCount", 4}}));

        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/LinkPreviewCard.qml")));
        QScopedPointer<QObject> card(component.create());
        QVERIFY2(card, qPrintable(component.errorString()));
        card->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        card->setProperty("blockData", QVariantMap{
            {"id", "blk_cached"}, {"blockType", "linkPreview"},
            {"attrs", QVariantMap{{"url", url}}}
        });
        QCOMPARE(card->property("title").toString(), QString("Cached title"));
        QCOMPARE(card->property("channel").toString(), QString("Cached channel"));
        QCOMPARE(card->property("durationSec").toInt(), 65);
        QCOMPARE(card->property("playlistCount").toInt(), 4);
    }

    void nativeLinkStatusActionPreservesVaultFieldsAndReactBlockMarkup() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-link-vault-status.sqlite")));

        const QString canonicalUrl = "https://www.youtube.com/watch?v=native123";
        const QString pastedUrl = canonicalUrl + "&utm_source=notes";
        const QString configKey = "link_entity:" + canonicalUrl;
        QJsonObject record = {
            {"canonicalUrl", canonicalUrl}, {"originalUrl", pastedUrl}, {"domain", "www.youtube.com"},
            {"title", "Saved title"}, {"channel", "Saved channel"}, {"notes", "Preserve these notes"},
            {"color", "#516273"}, {"watched", false}, {"watching", true},
            {"scrapId", "saved-scrap"}, {"aiSummary", "saved summary"},
            {"firstSeenAt", "2026-01-01T00:00:00.000Z"}, {"lastReferencedAt", "2026-01-02T00:00:00.000Z"},
            {"orphanedAt", "2026-01-03T00:00:00.000Z"}, {"extensionField", "preserve me"}};
        QString payload = QString::fromUtf8(QJsonDocument(record).toJson(QJsonDocument::Compact));
        payload.replace("'", "''");
        const QString insert = QStringLiteral(
            "INSERT INTO config (id, data, value, updated_at) VALUES ('%1', '%2', '%2', CURRENT_TIMESTAMP)")
            .arg(configKey, payload);
        QVERIFY(controller.executeSql(insert));

        const QVariantMap cached = controller.getLinkEntity(pastedUrl);
        QCOMPARE(cached.value("canonicalUrl").toString(), canonicalUrl);
        QCOMPARE(controller.getLinkEntity("https://youtu.be/native123?si=share")
                     .value("canonicalUrl").toString(), canonicalUrl);
        QCOMPARE(controller.getLinkEntity("https://youtube.com/shorts/native123?feature=share")
                     .value("canonicalUrl").toString(), canonicalUrl);
        QVERIFY(cached.value("watching").toBool());
        QCOMPARE(cached.value("notes").toString(), "Preserve these notes");

        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/LinkPreviewCard.qml")));
        QScopedPointer<QObject> card(component.create());
        QVERIFY2(card, qPrintable(component.errorString()));
        card->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        card->setProperty("blockData", QVariantMap{
            {"id", "blk_yt"}, {"blockType", "linkPreview"},
            {"attrs", QVariantMap{{"url", canonicalUrl}, {"watched", "false"}, {"watching", "true"}, {"data-extra", "keep"}}}
        });
        QVERIFY(card->property("isWatching").toBool());
        QCOMPARE(card->property("notesText").toString(), QString("Preserve these notes"));
        QVERIFY(QMetaObject::invokeMethod(card.data(), "saveStatus", Q_ARG(QVariant, true), Q_ARG(QVariant, false)));
        QVERIFY(card->property("isWatched").toBool());
        QVERIFY(!card->property("isWatching").toBool());

        const QVariantMap updated = controller.getLinkEntity(canonicalUrl);
        QVERIFY(updated.value("watched").toBool());
        QVERIFY(!updated.value("watching").toBool());
        QCOMPARE(updated.value("notes").toString(), "Preserve these notes");
        QCOMPARE(updated.value("color").toString(), "#516273");
        QCOMPARE(updated.value("scrapId").toString(), "saved-scrap");
        QCOMPARE(updated.value("aiSummary").toString(), "saved summary");
        QCOMPARE(updated.value("extensionField").toString(), "preserve me");
        QVERIFY(updated.value("orphanedAt").isNull());
        QVERIFY(!controller.setLinkEntityStatus("javascript:alert(1)", true, false).value("success").toBool());
        QVERIFY(!controller.setLinkEntityStatus(canonicalUrl, true, true).value("success").toBool());
    }

    void crossClientSaveClearsCrdtAndProtectsAgainstStaleWrites() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("cross-client-notes.sqlite")));

        // 1. Create a note and simulate React having saved an initial CRDT state
        const QString pageId = controller.createSubPage("", "Cross Client Note", "📄");
        QVERIFY(!pageId.isEmpty());
        const QString reactHtml = "<p>React initial content</p>";
        const QString fakeCrdt = "AQAB+7f8...base64_yjs_state_snapshot";
        QVERIFY(controller.savePage(pageId, "Cross Client Note", reactHtml, "📄"));
        QVERIFY(controller.executeSql(QString("UPDATE pages SET crdt_state = '%1' WHERE id = '%2'").arg(fakeCrdt).arg(pageId)));

        QVariantMap loaded = controller.getPage(pageId);
        QCOMPARE(loaded.value("crdt_state").toString(), fakeCrdt);
        const QString baseTimestamp = loaded.value("updated_at").toString();
        QVERIFY(!baseTimestamp.isEmpty());

        // Wait to guarantee timestamp advances to a subsequent millisecond
        QTest::qWait(20);

        // 2. Sequential edit from Qt: saving updates content, advances updated_at, and clears crdt_state to NULL
        const QString qtHtml = "<p>Qt modified content</p>";
        QVERIFY(controller.savePage(pageId, "Cross Client Note", qtHtml, "📄", baseTimestamp));

        QVariantMap afterQtSave = controller.getPage(pageId);
        QCOMPARE(afterQtSave.value("content").toString(), qtHtml);
        QVERIFY(afterQtSave.value("crdt_state").isNull() || afterQtSave.value("crdt_state").toString().isEmpty());
        const QString newTimestamp = afterQtSave.value("updated_at").toString();
        QVERIFY(!newTimestamp.isEmpty());
        QVERIFY(newTimestamp != baseTimestamp);

        // 3. Stale write protection: simulate a second in-memory session (or React client) that still has baseTimestamp
        // If it attempts to save older/conflicting content using baseTimestamp, it must be rejected to prevent silent overwrite
        const QString staleSessionHtml = "<p>Stale session overwritten attempt</p>";
        QSignalSpy conflictSpy(&controller, &SynapseDataController::pageConflictDetected);

        const bool staleSaveSucceeded = controller.savePage(pageId, "Cross Client Note", staleSessionHtml, "📄", baseTimestamp);
        QVERIFY(!staleSaveSucceeded); // Stale write rejected!
        QCOMPARE(conflictSpy.count(), 1);
        QCOMPARE(conflictSpy.first().at(0).toString(), pageId);

        // Verify the database still has the newer Qt content (not overwritten by stale session)
        QVariantMap afterStaleAttempt = controller.getPage(pageId);
        QCOMPARE(afterStaleAttempt.value("content").toString(), qtHtml);

        // Verify the stale session's content was NOT lost: it was preserved into page_history
        QVariantList history = controller.getPageHistory(pageId);
        bool foundPreservedStaleEdit = false;
        for (const QVariant &item : history) {
            if (item.toMap().value("content").toString() == staleSessionHtml) {
                foundPreservedStaleEdit = true;
                break;
            }
        }
        QVERIFY(foundPreservedStaleEdit);

        // 4. Idempotent save: if content is identical, save succeeds even if expectedUpdatedAt is different
        QVERIFY(controller.savePage(pageId, "Cross Client Note", qtHtml, "📄", baseTimestamp));

        // 5. Encrypted note protection: vault-encrypted pages also clear crdt_state and preserve conflicting revisions
        QVERIFY(controller.setupMasterPassword("MasterVaultPass42!"));
        const QString encPageId = controller.createSubPage("", "Encrypted Cross Note", "🔒");
        QVERIFY(!encPageId.isEmpty());
        const QString encHtml1 = "<p>Encrypted secret text 1</p>";
        QVERIFY(controller.savePage(encPageId, "Encrypted Cross Note", encHtml1, "🔒"));
        QVERIFY(controller.executeSql(QString("UPDATE pages SET crdt_state = 'enc_crdt_token' WHERE id = '%1'").arg(encPageId)));

        const QString encBaseTime = controller.getPage(encPageId).value("updated_at").toString();
        QTest::qWait(20);
        const QString encHtml2 = "<p>Encrypted secret text 2</p>";
        QVERIFY(controller.savePage(encPageId, "Encrypted Cross Note", encHtml2, "🔒", encBaseTime));

        QVariantMap loadedEnc = controller.getPage(encPageId);
        QCOMPARE(loadedEnc.value("content").toString(), encHtml2);
        QVERIFY(loadedEnc.value("crdt_state").isNull() || loadedEnc.value("crdt_state").toString().isEmpty());

        // Stale attempt on encrypted note
        const QString encStaleHtml = "<p>Encrypted stale conflict</p>";
        QVERIFY(!controller.savePage(encPageId, "Encrypted Cross Note", encStaleHtml, "🔒", encBaseTime));

        QVariantList encHistory = controller.getPageHistory(encPageId);
        bool foundEncPreserved = false;
        for (const QVariant &item : encHistory) {
            if (item.toMap().value("content").toString() == encStaleHtml) {
                foundEncPreserved = true;
                break;
            }
        }
        QVERIFY(foundEncPreserved);
    }

    void crossClientTipTapNormalizationAndCrdtToggleHydration() {
        // 1. TipTap empty paragraphs (<p></p>) normalize via parseNoteBlocks to <p><br/></p> and pass supportsRichSource
        NotesTextOperations ops;
        QVERIFY(NotesRichDocument::supportsSource("<p>First</p><p><br/></p><p>Third</p>"));

        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath("cross_tiptap.sqlite")));

        const QVariantList emptyParaBlocks = controller.parseNoteBlocks("<p>First</p><p></p><p>Third</p>");
        QCOMPARE(emptyParaBlocks.size(), 1);
        const QString normalizedEmptyPara = emptyParaBlocks.first().toMap().value("html").toString();
        QVERIFY2(ops.supportsRichSource(normalizedEmptyPara), qPrintable(normalizedEmptyPara));

        const QString pageId = controller.createSubPage("", "TipTap Full Parity", "📄");
        QVERIFY(!pageId.isEmpty());

        const QString legacyBrokenToggleHtml = QStringLiteral(
            "<p>Intro</p><p></p>"
            "<hr class=\"editor-divider\" style=\"margin: 0\">"
            "<div data-title=\"\" data-color=\"default\" data-is-open=\"undefined\" class=\"blockquote-toggle\">"
            "<p>Inner <strong>rich</strong> callout</p></div>"
            "<div data-title=\"\" class=\"toggle-block\"><p>Collapsed item</p></div>"
            "<div data-title=\"\" data-color=\"default\" class=\"blockquote-toggle\"><p>Third body</p></div>"
            "<table style=\"min-width: 75px\"><colgroup><col style=\"min-width: 25px\"></colgroup>"
            "<tbody><tr><th colspan=\"1\" rowspan=\"1\" colwidth=\"180\" data-column-type=\"select\"><p>Status</p></th></tr>"
            "<tr><td></td></tr></tbody></table>");
        const QString realYjsCrdtBase64 = QStringLiteral(
            "ARHepsOoCQAHAQdkZWZhdWx0AwlwYXJhZ3JhcGgHAN6mw6gJAAYEAN6mw6gJAQVJbnRyb4fepsOoCQADEGJsb2NrcXVvdGVUb2dnbGWH3qbDqAkHAwt0b2dnbGVCbG9ja4fepsOoCQgDEGJsb2NrcXVvdGVUb2dnbGUoAN6mw6gJBwV0aXRsZQF3G1ByaW1laXJvIOKAlCBBdGVuw6fDo28g8J+agCgA3qbDqAkHBWNvbG9yAXcHI2VmNDQ0NCgA3qbDqAkHBmlzT3BlbgF4KADepsOoCQgFdGl0bGUBdw9MaXN0YSBSZWNvbGhpZGEoAN6mw6gJCAZpc09wZW4BeSEA3qbDqAkJBXRpdGxlAajepsOoCQ8BdxZUZXJjZWlybyBDYWxsb3V0IEZpbmFsKADepsOoCQkFY29sb3IBdwcjM2I4MmY2KADepsOoCQkGaXNPcGVuAXjB3qbDqAkA3qbDqAkHAQABAd6mw6gJAg8BEwI=");

        QVERIFY(controller.savePage(pageId, "TipTap Full Parity", legacyBrokenToggleHtml, "📄"));
        QVERIFY(controller.executeSql(
            QString("UPDATE pages SET crdt_state = '%1' WHERE id = '%2'").arg(realYjsCrdtBase64, pageId)));

        const QVariantMap loaded = controller.getPage(pageId);
        const QString hydratedHtml = loaded.value("content").toString();
        QVERIFY2(hydratedHtml.contains("Primeiro"), qPrintable(hydratedHtml));
        QVERIFY2(hydratedHtml.contains("#ef4444"), qPrintable(hydratedHtml));
        QVERIFY2(hydratedHtml.contains("Lista Recolhida"), qPrintable(hydratedHtml));
        QVERIFY2(hydratedHtml.contains("Terceiro Callout Final"), qPrintable(hydratedHtml));

        const QVariantList blocks = controller.parseNoteBlocks(hydratedHtml);
        QVERIFY(blocks.size() >= 5);
        for (const QVariant &blkVar : blocks) {
            const QVariantMap blk = blkVar.toMap();
            if (blk.value("blockType").toString() == QLatin1String("richText")) {
                const QString sliceHtml = blk.value("html").toString();
                QVERIFY2(ops.supportsRichSource(sliceHtml), qPrintable(sliceHtml));
            }
        }

        // 3. Verify NotesBlockListEditor + NotesToggleBlock renders hydrated titles in QML
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("notesTextOperations", &ops);
        QQmlComponent blComp(&engine);
        blComp.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesBlockListEditor.qml")));
        QScopedPointer<QObject> blockList(blComp.create());
        QVERIFY2(blockList, qPrintable(blComp.errorString()));
        blockList->setProperty("width", 800);
        blockList->setProperty("height", 600);
        blockList->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        blockList->setProperty("sourceHtml", hydratedHtml);
        blockList->setProperty("active", true);
        QTRY_COMPARE(blockList->property("blocks").toList().size(), 5);
        std::function<void(QQuickItem *, QList<QQuickItem *> &)> collectToggles =
            [&](QQuickItem *item, QList<QQuickItem *> &out) {
                if (!item) return;
                if (item->objectName() == QLatin1String("notesToggleBlockRoot")) out.append(item);
                for (QQuickItem *ch : item->childItems()) collectToggles(ch, out);
            };
        QList<QQuickItem *> toggles;
        QTRY_VERIFY(([&]() {
            toggles.clear();
            collectToggles(qobject_cast<QQuickItem *>(blockList.data()), toggles);
            return toggles.size() == 3;
        })());
        QCOMPARE(toggles.at(0)->property("titleText").toString(), QString::fromUtf8("Primeiro \u2014 Aten\u00e7\u00e3o \U0001F680"));
        QCOMPARE(toggles.at(1)->property("titleText").toString(), QString("Lista Recolhida"));
        QCOMPARE(toggles.at(2)->property("titleText").toString(), QString("Terceiro Callout Final"));
    }

    void pageViewBlockquoteAndRichLayoutSettling() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath("layout_test.db")));
        NotesTextOperations ops;

        const QString pageId = controller.createSubPage("", "MURAL", "📄");
        QVERIFY(!pageId.isEmpty());
        const QString contentHtml = QStringLiteral(
            "<p>Intro paragraph</p><hr/><blockquote data-color=\"#3b82f6\">"
            "<p>MODO CAVERNA DEFINITIVO 20-09-2026</p></blockquote><p>Outro</p>");
        QVERIFY(controller.savePage(pageId, "MURAL", contentHtml, "📄"));

        QQuickWindow window;
        window.resize(1280, 800);
        window.show();

        QQmlEngine engine;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("notesTextOperations", &ops);
        QQmlComponent comp(&engine);
        comp.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> root(comp.create());
        QVERIFY2(root, qPrintable(comp.errorString()));
        QQuickItem *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        rootItem->setWidth(1000);
        rootItem->setHeight(800);
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(pageId))));
        QTest::qWait(500);

        QQuickItem *blockquoteItem = nullptr;
        std::function<void(QQuickItem *)> findQuote = [&](QQuickItem *item) {
            if (!item || blockquoteItem) return;
            if (item->property("quoteColor").isValid() && item->property("contentHtml").isValid()) {
                blockquoteItem = item;
                return;
            }
            for (QQuickItem *ch : item->childItems()) findQuote(ch);
        };
        QTRY_VERIFY(([&]() {
            blockquoteItem = nullptr;
            findQuote(rootItem);
            return blockquoteItem != nullptr;
        })());

        qInfo() << "Blockquote geometry:" << blockquoteItem->width() << blockquoteItem->height()
                << "implicitHeight:" << blockquoteItem->implicitHeight()
                << "y:" << blockquoteItem->y();
        QVERIFY2(blockquoteItem->width() > 300.0, qPrintable(QString::number(blockquoteItem->width())));
        QVERIFY2(blockquoteItem->height() < 160.0, qPrintable(QString::number(blockquoteItem->height())));
        QVERIFY2(blockquoteItem->implicitHeight() < 160.0, qPrintable(QString::number(blockquoteItem->implicitHeight())));

        // Also test StackLayout 0-width startup -> visible switch (mimics AuthenticatedApplication.qml)
        QQmlComponent stackComp(&engine);
        stackComp.setData(R"(
            import QtQuick 2.15
            import QtQuick.Layouts 1.15
            import "apps/desktop-qt/qml/page-view" as PV
            Item {
                width: 1200; height: 800
                property alias pageView: pv
                StackLayout {
                    id: sl
                    anchors.fill: parent
                    currentIndex: 0
                    Item { }
                    PV.PageView { id: pv }
                }
                function switchToNotes() { sl.currentIndex = 1 }
            }
        )", QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/../../dummy.qml")));
        QScopedPointer<QObject> stackRoot(stackComp.create());
        QVERIFY2(stackRoot, qPrintable(stackComp.errorString()));
        QQuickItem *stackItem = qobject_cast<QQuickItem *>(stackRoot.data());
        stackItem->setParentItem(window.contentItem());
        QObject *pv = stackRoot->property("pageView").value<QObject *>();
        pv->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pv, "refreshPageTree"));
        QTest::qWait(250);
        QVERIFY(QMetaObject::invokeMethod(stackRoot.data(), "switchToNotes"));
        QTest::qWait(400);
        QQuickItem *q2 = nullptr;
        std::function<void(QQuickItem *)> findQuote2 = [&](QQuickItem *item) {
            if (!item || q2) return;
            if (item->property("quoteColor").isValid() && item->property("contentHtml").isValid()) { q2 = item; return; }
            for (QQuickItem *ch : item->childItems()) findQuote2(ch);
        };
        findQuote2(qobject_cast<QQuickItem *>(pv));
        QVERIFY(q2);
        qInfo() << "StackLayout Blockquote geometry:" << q2->width() << q2->height() << "implicitHeight:" << q2->implicitHeight();
        QVERIFY2(q2->height() < 160.0, qPrintable(QString::number(q2->height())));

        // Regression test: ColorBlockquote blank-paragraph roundtrip must be strictly idempotent (zero 2^N doubling)
        // and pre-existing pathological empty-<p><br/></p> runs must collapse safely without infinite height.
        QString bloatedHtml = QStringLiteral("<blockquote data-color=\"#3b82f6\"><p>Header line</p>");
        for (int i = 0; i < 400; ++i) bloatedHtml += QStringLiteral("<p><br/></p>");
        bloatedHtml += QStringLiteral("<p>Footer line</p></blockquote>");
        const QString bloatPageId = controller.createSubPage("", "Bloat Guard", "📄");
        QVERIFY(controller.savePage(bloatPageId, "Bloat Guard", bloatedHtml, "📄"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(bloatPageId))));
        QTest::qWait(350);
        blockquoteItem = nullptr;
        findQuote(rootItem);
        QVERIFY(blockquoteItem);
        QVERIFY2(blockquoteItem->height() < 240.0, qPrintable(QString::number(blockquoteItem->height())));

        QVariant plainOut;
        const QString singleGapHtml = QStringLiteral("<p>First</p><p><br/></p><p>Second</p>");
        QVERIFY(QMetaObject::invokeMethod(blockquoteItem, "htmlToPlain", Q_RETURN_ARG(QVariant, plainOut),
                                          Q_ARG(QVariant, QVariant(singleGapHtml))));
        QVariant roundTripHtml;
        QVERIFY(QMetaObject::invokeMethod(blockquoteItem, "plainToHtml", Q_RETURN_ARG(QVariant, roundTripHtml),
                                          Q_ARG(QVariant, plainOut)));
        QCOMPARE(roundTripHtml.toString(), singleGapHtml);

        // Editing inside ColorBlockquote must preserve active delegate/focus without Repeater rebuild or doubling.
        QQuickItem *quoteArea = nullptr;
        for (QQuickItem *ch : blockquoteItem->childItems()) {
            if (QString::fromLatin1(ch->metaObject()->className()).contains("TextArea")) {
                quoteArea = ch;
                break;
            }
        }
        QVERIFY(quoteArea);
        QVariant editedHtml;
        QVERIFY(QMetaObject::invokeMethod(blockquoteItem, "plainToHtml", Q_RETURN_ARG(QVariant, editedHtml),
                                          Q_ARG(QVariant, QVariant("First\n\nSecond\n\nThird"))));
        QVERIFY(QMetaObject::invokeMethod(blockquoteItem, "htmlToPlain", Q_RETURN_ARG(QVariant, plainOut),
                                          Q_ARG(QVariant, editedHtml)));
        QCOMPARE(plainOut.toString(), QStringLiteral("First\n\nSecond\n\nThird"));
    }

    void pageViewIdleDoesNotAutoSave() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath("idle_autosave_test.db")));
        NotesTextOperations ops;

        const QString refTargetId = controller.createSubPage("", "Referenced Target", "🔗");
        QVERIFY(!refTargetId.isEmpty());

        const QList<QPair<QString, QString>> cases = {
            {"empty", ""},
            {"plain", "<p>Plain paragraph with <strong>bold</strong> and <em>italic</em>.</p>"},
            {"heading_task", "<h1>Heading</h1><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><p>Todo item</p></li></ul>"},
            {"spoiler", "<p>Secret <span data-type=\"spoiler\" class=\"caderno-spoiler\">hidden text</span> end.</p>"},
            {"page_ref", QStringLiteral("<p>See <span class=\"page-reference\" data-page-id=\"%1\" title=\"Referenced Target\"></span></p>").arg(refTargetId)},
            {"deleted_page_ref", "<p>Missing <span class=\"page-reference\" data-page-id=\"nonexistent-id\" title=\"Gone\"></span></p>"},
            {"code", "<pre><code class=\"language-typescript\">const x = 1;</code></pre>"},
            {"quote", "<blockquote data-color=\"#3b82f6\"><p>Callout line</p></blockquote>"},
            {"nested_quote_in_columns",
             "<div data-type=\"columnGroup\" class=\"group-layout column-group\" data-columns=\"2\">"
             "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\">"
             "<blockquote data-color=\"#3b82f6\"><p>Quote in column</p></blockquote></div>"
             "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Col 2</p></div>"
             "</div>"},
            {"nested_quote_in_toggle",
             "<div data-type=\"toggle-block\" data-title=\"Toggle Title\" data-is-open=\"true\">"
             "<blockquote data-color=\"#8b5cf6\"><p>Quote in toggle</p></blockquote></div>"},
            {"toggle", "<div data-type=\"toggle-block\" data-title=\"Toggle Title\" data-is-open=\"true\"><p>Inside toggle</p></div>"},
            {"collection", "<div data-type=\"groupBlock\" data-title=\"Collection\" data-collapsed=\"false\"><p>Inside collection</p></div>"},
            {"columns", "<div data-type=\"columnGroup\" class=\"group-layout column-group\" data-columns=\"2\">"
                        "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Col 1</p></div>"
                        "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Col 2</p></div>"
                        "</div>"},
            {"mermaid", "<div data-type=\"mermaid\" code=\"graph TD\n  A --&gt; B\"></div>"},
            {"table", "<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>"},
            {"link_preview", "<div class=\"link-preview-block\" data-type=\"link-preview\" url=\"https://example.com\" title=\"Example\"></div>"},
            {"bundle", "<div data-type=\"document-bundle\" data-title=\"Docs\" data-items=\"[]\"></div>"},
            {"widgets", "<span data-type=\"focus-widget\" data-duration=\"25\" data-tag=\"Estudo\" data-status=\"idle\"></span>"
                        "<span data-type=\"alarm-widget\" data-time=\"08:00\" data-label=\"Wake\" data-status=\"pending\"></span>"
                        "<span data-type=\"calendar-event-widget\" data-title=\"Meeting\" data-date=\"2026-12-01\" data-status=\"pending\"></span>"
                        "<span data-type=\"habit-widget\" data-title=\"Read\" data-streak=\"3\"></span>"}
        };

        QQuickWindow window;
        window.resize(1280, 800);
        window.show();

        QQmlEngine engine;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("notesTextOperations", &ops);
        QQmlComponent comp(&engine);
        comp.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> root(comp.create());
        QVERIFY2(root, qPrintable(comp.errorString()));
        QQuickItem *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        rootItem->setWidth(1000);
        rootItem->setHeight(800);
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));

        for (const auto &c : cases) {
            const QString pageId = controller.createSubPage("", "Case " + c.first, "📄");
            QVERIFY(!pageId.isEmpty());
            QVERIFY(controller.savePage(pageId, "Case " + c.first, c.second, "📄"));
            const QString initialUpdatedAt = controller.getPage(pageId).value("updated_at").toString();

            QSignalSpy savedSpy(root.data(), SIGNAL(pageSavedExternal(QString,QString)));
            QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(pageId))));
            QTest::qWait(1400);
            QVERIFY2(savedSpy.count() == 0,
                     qPrintable(QString("Idle save triggered for case %1 (count=%2, activeContent=%3, savedContent=%4)")
                                    .arg(c.first)
                                    .arg(savedSpy.count())
                                    .arg(root->property("activeContent").toString(),
                                         controller.getPage(pageId).value("content").toString())));
            QVERIFY2(!root->property("isDirty").toBool(),
                     qPrintable(QString("isDirty remained true for case %1").arg(c.first)));
            QCOMPARE(controller.getPage(pageId).value("updated_at").toString(), initialUpdatedAt);
        }

        // Verify PageHeader title binding stays intact when switching pages after editing a title
        const QString pageA = controller.createSubPage("", "Alpha Page", "📄");
        const QString pageB = controller.createSubPage("", "Beta Page", "📄");
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(pageA))));
        QTest::qWait(150);
        QQuickItem *titleArea = nullptr;
        std::function<void(QQuickItem *)> findTitleArea = [&](QQuickItem *item) {
            if (!item || titleArea) return;
            if (QString::fromLatin1(item->metaObject()->className()).contains("TextArea") &&
                item->property("text").toString() == QLatin1String("Alpha Page")) {
                titleArea = item;
                return;
            }
            for (QQuickItem *ch : item->childItems()) findTitleArea(ch);
        };
        findTitleArea(rootItem);
        QVERIFY(titleArea);
        titleArea->setProperty("text", QStringLiteral("Alpha Edited"));
        QVERIFY(root->property("isDirty").toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(pageB))));
        QTest::qWait(150);
        QCOMPARE(titleArea->property("text").toString(), QStringLiteral("Beta Page"));
        QCOMPARE(controller.getPage(pageA).value("title").toString(), QStringLiteral("Alpha Edited"));
        QVERIFY(!root->property("isDirty").toBool());
    }

    void pageViewEditsFlushAndStateParity() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath("edits_parity_test.db")));
        NotesTextOperations ops;

        // 1. Word count & encrypted stub guard
        const QString docPageId = controller.createSubPage("", "Doc Page", "📄");
        QVERIFY(controller.savePage(docPageId, "Doc Page", "<p>One two three four five</p>", "📄"));

        const QString lockedStubId = controller.createSubPage("", "Locked Encrypted", "🔒");
        QVERIFY(controller.savePage(lockedStubId, "Locked Encrypted", QStringLiteral("🔒 [Encrypted note]"), "🔒"));

        const QString colQuoteId = controller.createSubPage("", "Columns Quote Page", "📄");
        const QString colQuoteHtml =
            "<div data-type=\"columnGroup\" class=\"group-layout column-group\" data-columns=\"2\">"
            "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\">"
            "<blockquote data-color=\"#3b82f6\"><p>Col callout</p></blockquote></div>"
            "<div data-type=\"columnBlock\" data-width=\"50\" data-group-child=\"\" class=\"column-block\" style=\"--group-flex: 50;\">"
            "<pre><code class=\"language-typescript\">const v = 1;</code></pre></div></div>";
        QVERIFY(controller.savePage(colQuoteId, "Columns Quote Page", colQuoteHtml, "📄"));

        QQuickWindow window;
        window.resize(1280, 800);
        window.show();

        QQmlEngine engine;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("notesTextOperations", &ops);
        registerNotesPageSwitchTestTypes();
        QQmlComponent comp(&engine);
        comp.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> root(comp.create());
        QVERIFY2(root, qPrintable(comp.errorString()));
        QQuickItem *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        rootItem->setWidth(1000);
        rootItem->setHeight(800);
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));

        // Verify word count on load and after edit
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(docPageId))));
        QTest::qWait(150);
        QCOMPARE(root->property("wordCount").toInt(), 5);
        QVERIFY(!root->property("activeIsEncrypted").toBool());

        // Verify encrypted stub blocks saving while locked
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(lockedStubId))));
        QTest::qWait(150);
        QVERIFY(root->property("activeIsEncrypted").toBool());
        QVERIFY(!root->property("isPageUnlocked").toBool());
        QVariant saveBlocked;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saveBlocked)));
        QVERIFY(!saveBlocked.toBool());

        // Verify editing inside ColorBlockquote + CodeBlock nested inside NotesColumnLayout preserves delegates and saves once
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(colQuoteId))));
        QTest::qWait(250);

        QQuickItem *quoteArea = nullptr;
        QQuickItem *codeArea = nullptr;
        std::function<void(QQuickItem *)> findNestedAreas = [&](QQuickItem *item) {
            if (!item) return;
            if (QString::fromLatin1(item->metaObject()->className()).contains("TextArea")) {
                const QString txt = item->property("text").toString();
                if (txt == QLatin1String("Col callout")) quoteArea = item;
                else if (txt == QLatin1String("const v = 1;")) codeArea = item;
            }
            for (QQuickItem *ch : item->childItems()) findNestedAreas(ch);
        };
        findNestedAreas(rootItem);
        QVERIFY(quoteArea);
        QVERIFY(codeArea);

        QPointer<QQuickItem> stableQuoteArea(quoteArea);
        QPointer<QQuickItem> stableCodeArea(codeArea);
        QSignalSpy savedSpy(root.data(), SIGNAL(pageSavedExternal(QString,QString)));

        quoteArea->setProperty("text", QStringLiteral("Col callout edited"));
        codeArea->setProperty("text", QStringLiteral("const v = 42;"));
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(500);
        QCOMPARE(savedSpy.count(), 1);
        QVERIFY2(stableQuoteArea, "ColorBlockquote delegate should remain alive inside NotesColumnLayout across edits");
        QVERIFY2(stableCodeArea, "CodeBlock delegate should remain alive inside NotesColumnLayout across edits");

        const QString savedHtml = controller.getPage(colQuoteId).value("content").toString();
        QVERIFY2(savedHtml.contains("Col callout edited"), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains("const v = 42;"), qPrintable(savedHtml));

        // Verify the block assistant updates its nested source block and the page auto-save persists it.
        std::function<QQuickItem *(QQuickItem *, const QString &)> findItemByName =
            [&](QQuickItem *item, const QString &objectName) -> QQuickItem * {
                if (!item) return nullptr;
                if (item->objectName() == objectName) return item;
                for (QQuickItem *child : item->childItems()) {
                    if (QQuickItem *match = findItemByName(child, objectName)) return match;
                }
                return nullptr;
            };
        QQuickItem *blockAiButton = findItemByName(rootItem, QStringLiteral("notesCodeBlockAiButton"));
        QVERIFY(blockAiButton);
        QVERIFY(QMetaObject::invokeMethod(blockAiButton, "clicked", Qt::DirectConnection));
        QObject *blockAiModal = root->findChild<QObject *>(QStringLiteral("notesAiPromptModal"));
        QVERIFY(blockAiModal);
        QVERIFY(blockAiModal->property("isOpen").toBool());
        const QVariantMap aiReply{
            {QStringLiteral("role"), QStringLiteral("assistant")},
            {QStringLiteral("content"), QStringLiteral("```typescript\nconst aiApplied = 9;\n```")},
        };
        QVariant applyResult;
        QVERIFY(QMetaObject::invokeMethod(blockAiModal, "applyMessageProposal", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, applyResult),
                                          Q_ARG(QVariant, aiReply), Q_ARG(QVariant, QVariant(true))));
        QVERIFY(applyResult.toBool());
        QVERIFY(!blockAiModal->property("isOpen").toBool());
        savedSpy.clear();
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(250);
        QCOMPARE(savedSpy.count(), 1);
        QVERIFY(!root->property("isDirty").toBool());
        QCOMPARE(root->property("saveStatus").toString(), QStringLiteral("saved"));
        const QString aiSavedHtml = controller.getPage(colQuoteId).value("content").toString();
        QVERIFY2(aiSavedHtml.contains("const aiApplied = 9;"), qPrintable(aiSavedHtml));
        QVERIFY2(aiSavedHtml.contains("Col callout edited"), qPrintable(aiSavedHtml));
        QVERIFY(!aiSavedHtml.contains("const v = 42;"));

        QVariant pageChangeResult;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_RETURN_ARG(QVariant, pageChangeResult),
                                          Q_ARG(QVariant, QVariant(docPageId))));
        QVERIFY(pageChangeResult.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_RETURN_ARG(QVariant, pageChangeResult),
                                          Q_ARG(QVariant, QVariant(colQuoteId))));
        QVERIFY(pageChangeResult.toBool());
        QTRY_VERIFY(root->property("activeContent").toString().contains("const aiApplied = 9;"));

        // Verify a colored blockquote uses its own target callback and preserves the code neighbor.
        QQuickItem *quoteBlockItem = nullptr;
        std::function<void(QQuickItem *)> findQuoteBlock = [&](QQuickItem *item) {
            if (!item || quoteBlockItem) return;
            if (item->metaObject()->indexOfProperty("aiButtonItem") >= 0 &&
                item->property("contentHtml").toString().contains(QStringLiteral("Col callout edited"))) {
                quoteBlockItem = item;
                return;
            }
            for (QQuickItem *child : item->childItems()) findQuoteBlock(child);
        };
        findQuoteBlock(rootItem);
        QVERIFY(quoteBlockItem);
        QObject *quoteAiButton = quoteBlockItem->property("aiButtonItem").value<QObject *>();
        QVERIFY(quoteAiButton);
        QCOMPARE(quoteAiButton->property("focusPolicy").toInt(), static_cast<int>(Qt::TabFocus));
        QQuickItem *quoteAiItem = qobject_cast<QQuickItem *>(quoteAiButton);
        QVERIFY(quoteAiItem);
        quoteAiItem->forceActiveFocus(Qt::TabFocusReason);
        QTRY_VERIFY(quoteAiItem->hasActiveFocus());
        QQuickItem *quoteToolbar = findItemByName(rootItem, QStringLiteral("notesColorBlockquoteToolbar"));
        QVERIFY(quoteToolbar);
        QTRY_COMPARE(quoteToolbar->opacity(), 1.0);
        QVERIFY(QMetaObject::invokeMethod(quoteAiButton, "clicked", Qt::DirectConnection));
        QVERIFY(blockAiModal->property("isOpen").toBool());
        const QVariantMap quoteAiReply{
            {QStringLiteral("role"), QStringLiteral("assistant")},
            {QStringLiteral("content"), QStringLiteral("AI callout revised")},
        };
        QVERIFY(QMetaObject::invokeMethod(blockAiModal, "applyMessageProposal", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, applyResult),
                                          Q_ARG(QVariant, quoteAiReply), Q_ARG(QVariant, QVariant(true))));
        QVERIFY(applyResult.toBool());
        savedSpy.clear();
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(250);
        QCOMPARE(savedSpy.count(), 1);
        const QString quoteAiSavedHtml = controller.getPage(colQuoteId).value("content").toString();
        QVERIFY2(quoteAiSavedHtml.contains(QStringLiteral("AI callout revised")), qPrintable(quoteAiSavedHtml));
        QVERIFY2(quoteAiSavedHtml.contains(QStringLiteral("const aiApplied = 9;")), qPrintable(quoteAiSavedHtml));

        // Verify metadata update + subsequent save does not trigger a false conflict
        QSignalSpy conflictSpy(&controller, SIGNAL(pageConflictDetected(QString,QString)));
        QTest::qWait(1100); // ensure timestamp ticks past previous second/ms
        QVERIFY(controller.updatePageDescription(colQuoteId, "Updated summary"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "syncPageMetadataFromController", Q_ARG(QVariant, QVariant(colQuoteId))));
        QVariant appended;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "appendExternalHtml", Q_RETURN_ARG(QVariant, appended),
                                          Q_ARG(QVariant, QVariant("<p>Extra AI text</p>"))));
        QVERIFY(appended.toBool());
        QCOMPARE(conflictSpy.count(), 0);
        QCOMPARE(root->property("saveStatus").toString(), QStringLiteral("saved"));
        QVERIFY(controller.getPage(colQuoteId).value("content").toString().contains("Extra AI text"));
    }

    void pageViewDesktopReadingWidthMatchesReact928Px() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath("width_test.db")));
        NotesTextOperations ops;

        const QString pageId = controller.createSubPage("", "Width Check", "📄");
        QVERIFY(!pageId.isEmpty());
        QVERIFY(controller.savePage(pageId, "Width Check", "<p>Reading width</p>", "📄"));

        QQuickWindow window;
        window.resize(1280, 800);
        window.show();

        QQmlEngine engine;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("notesTextOperations", &ops);
        QQmlComponent comp(&engine);
        comp.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> root(comp.create());
        QVERIFY2(root, qPrintable(comp.errorString()));
        QQuickItem *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        rootItem->setWidth(1280);
        rootItem->setHeight(800);
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QVariant(pageId))));

        QQuickItem *contentColumn = rootItem->findChild<QQuickItem *>(QStringLiteral("pageContentColumn"));
        QVERIFY(contentColumn);
        QTRY_COMPARE(qRound(contentColumn->width()), 928);

        rootItem->setWidth(1440);
        QTRY_COMPARE(qRound(contentColumn->width()), 928);

        rootItem->setWidth(1920);
        QTRY_COMPARE(qRound(contentColumn->width()), 928);

        rootItem->setWidth(700);
        QTRY_COMPARE(qRound(contentColumn->width()), 636);

        rootItem->setWidth(500);
        QTRY_COMPARE(qRound(contentColumn->width()), 468);
    }
};

int runNativeNotesTest(int argc, char **argv) {
    NativeNotesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_test.moc"
