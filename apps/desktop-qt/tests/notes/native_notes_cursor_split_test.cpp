#include "synapse_controller.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_markup.h"
#include "controllers/notes/notes_rich_page_reference_object.h"
#include "controllers/notes/notes_rich_task_lists.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QTemporaryDir>
#include <QtGui/QTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtTest/QtTest>

namespace {

int editorCursorAfter(const QTextDocument &document, const QString &needle) {
    const QString plain = document.toPlainText();
    const int idx = plain.indexOf(needle);
    return idx >= 0 ? idx + needle.size() : -1;
}

std::unique_ptr<QQuickItem> createQuickTextEdit(QQmlEngine &engine) {
    QQmlComponent component(&engine);
    component.setData(QByteArrayLiteral("import QtQuick 2.15\nTextEdit { textFormat: TextEdit.RichText }"), QUrl());
    std::unique_ptr<QQuickItem> item(qobject_cast<QQuickItem *>(component.create()));
    return item;
}

} // namespace

class NativeNotesCursorSplitTest final : public QObject {
    Q_OBJECT

private slots:
    void supplementaryEmojiCombiningMarksAndEntitiesSplitAtUtf16Offsets() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath(QStringLiteral("cursor_split.db"))));
        NotesTextOperations ops;
        QQmlEngine engine;

        // 1. Supplementary emoji (2 UTF-16 code units)
        {
            const QString html = QStringLiteral("<p>A\U0001F600B</p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditor(html));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());

            const int posAfterEmoji = editorCursorAfter(*quickDoc->textDocument(), QStringLiteral("A\U0001F600"));
            QCOMPARE(posAfterEmoji, 3);
            const int sourceOffset = ops.richSourceOffsetForEditorPosition(quickDoc, posAfterEmoji);
            QCOMPARE(sourceOffset, 3);
            const QVariantMap split = controller.splitRichHtml(html, sourceOffset);
            QCOMPARE(split.value(QStringLiteral("before")).toString(), QStringLiteral("<p>A\U0001F600</p>"));
            QCOMPARE(split.value(QStringLiteral("after")).toString(), QStringLiteral("<p>B</p>"));
        }

        // 2. Combining mark (e + U+0301 = 2 UTF-16 code units)
        {
            const QString html = QStringLiteral("<p>e\u0301x</p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditor(html));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());

            const int posAfterCombining = editorCursorAfter(*quickDoc->textDocument(), QStringLiteral("e\u0301"));
            QCOMPARE(posAfterCombining, 2);
            const int sourceOffset = ops.richSourceOffsetForEditorPosition(quickDoc, posAfterCombining);
            const QVariantMap split = controller.splitRichHtml(html, sourceOffset);
            QCOMPARE(split.value(QStringLiteral("before")).toString(), QStringLiteral("<p>e\u0301</p>"));
            QCOMPARE(split.value(QStringLiteral("after")).toString(), QStringLiteral("<p>x</p>"));
        }

        // 3. Named & numeric HTML entities
        {
            const QString html = QStringLiteral("<p>A&amp;B &#128512;C</p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditor(html));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());

            const int posAfterAmp = editorCursorAfter(*quickDoc->textDocument(), QStringLiteral("A&"));
            QCOMPARE(posAfterAmp, 2);
            const QVariantMap splitAmp = controller.splitRichHtml(
                html, ops.richSourceOffsetForEditorPosition(quickDoc, posAfterAmp));
            QCOMPARE(splitAmp.value(QStringLiteral("before")).toString(), QStringLiteral("<p>A&amp;</p>"));
            QCOMPARE(splitAmp.value(QStringLiteral("after")).toString(), QStringLiteral("<p>B &#128512;C</p>"));

            const int posAfterNumericEmoji = editorCursorAfter(*quickDoc->textDocument(), QStringLiteral("A&B \U0001F600"));
            QCOMPARE(posAfterNumericEmoji, 6);
            const QVariantMap splitEmoji = controller.splitRichHtml(
                html, ops.richSourceOffsetForEditorPosition(quickDoc, posAfterNumericEmoji));
            QCOMPARE(splitEmoji.value(QStringLiteral("before")).toString(), QStringLiteral("<p>A&amp;B &#128512;</p>"));
            QCOMPARE(splitEmoji.value(QStringLiteral("after")).toString(), QStringLiteral("<p>C</p>"));
        }

        // 4. Nested inline marks
        {
            const QString html = QStringLiteral("<p><strong><em>AlphaBeta</em></strong></p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditor(html));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());

            const int posAfterAlpha = editorCursorAfter(*quickDoc->textDocument(), QStringLiteral("Alpha"));
            QCOMPARE(posAfterAlpha, 5);
            const QVariantMap split = controller.splitRichHtml(
                html, ops.richSourceOffsetForEditorPosition(quickDoc, posAfterAlpha));
            QCOMPARE(split.value(QStringLiteral("before")).toString(), QStringLiteral("<p><strong><em>Alpha</em></strong></p>"));
            QCOMPARE(split.value(QStringLiteral("after")).toString(), QStringLiteral("<p><strong><em>Beta</em></strong></p>"));
        }
    }

    void taskListsPageReferencesBreaksAndTableCellsSplitAtExactEditorPositions() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath(QStringLiteral("cursor_split_rich.db"))));
        NotesTextOperations ops;
        QQmlEngine engine;

        // 1. Task list with TaskCheckboxObjectType followed by paragraph
        {
            const QString html = QStringLiteral(
                "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
                "<label><input type=\"checkbox\"/><span></span></label><div><p>TaskOne</p></div></li></ul>"
                "<p>AfterTask</p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            const QString editorHtml = ops.richSourceForEditor(html);
            QVERIFY(!editorHtml.isEmpty());
            editor->setProperty("text", editorHtml);
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());
            QTextDocument &doc = *quickDoc->textDocument();
            QVERIFY(ops.prepareRichHeadings(quickDoc, html));

            const int posInTask = editorCursorAfter(doc, QStringLiteral("Task"));
            QCOMPARE(posInTask, 5); // 1 (TaskCheckboxObjectType) + 4 ("Task")
            const int taskSourceOffset = ops.richSourceOffsetForEditorPosition(quickDoc, posInTask);
            const QVariantMap splitTask = controller.splitRichHtml(html, taskSourceOffset);
            QCOMPARE(splitTask.value(QStringLiteral("before")).toString(),
                     QStringLiteral("<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
                                    "<label><input type=\"checkbox\"/><span></span></label><div><p>Task</p></div></li></ul>"));
            QCOMPARE(splitTask.value(QStringLiteral("after")).toString(),
                     QStringLiteral("<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
                                    "<label><input type=\"checkbox\"/><span></span></label><div><p>One</p></div></li></ul><p>AfterTask</p>"));

            const int posInAfter = editorCursorAfter(doc, QStringLiteral("After"));
            const int afterSourceOffset = ops.richSourceOffsetForEditorPosition(quickDoc, posInAfter);
            const QVariantMap splitAfter = controller.splitRichHtml(html, afterSourceOffset);
            QCOMPARE(splitAfter.value(QStringLiteral("before")).toString(),
                     QStringLiteral("<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
                                    "<label><input type=\"checkbox\"/><span></span></label><div><p>TaskOne</p></div></li></ul><p>After</p>"));
            QCOMPARE(splitAfter.value(QStringLiteral("after")).toString(), QStringLiteral("<p>Task</p>"));
        }

        // 2. Adjacent identical page references prepared as native PageReferenceObjectType
        {
            const QString html = QStringLiteral(
                "<p>Go <span data-page-id=\"p1\" title=\"Alpha\"></span>"
                "<span data-page-id=\"p1\" title=\"Alpha\"></span> End</p>");
            const QVariantList pages{
                QVariantMap{{QStringLiteral("id"), QStringLiteral("p1")}, {QStringLiteral("title"), QStringLiteral("Alpha")}}
            };
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditorWithPages(html, pages));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());
            QVERIFY(ops.prepareRichPageReferences(quickDoc, pages));

            // "Go " (3) + obj1 (1) + obj2 (1) + " End" -> between obj1 and obj2 is pos 4
            const int betweenRefs = 4;
            QCOMPARE(ops.richSourceOffsetForEditorPosition(quickDoc, betweenRefs), 4);
            const QVariantMap splitBetween = controller.splitRichHtml(html, 4);
            QCOMPARE(splitBetween.value(QStringLiteral("before")).toString(),
                     QStringLiteral("<p>Go <span data-page-id=\"p1\" title=\"Alpha\"></span></p>"));
            QCOMPARE(splitBetween.value(QStringLiteral("after")).toString(),
                     QStringLiteral("<p><span data-page-id=\"p1\" title=\"Alpha\"></span> End</p>"));

            // After both refs + " " -> pos 6
            const int afterRefsSpace = 6;
            QCOMPARE(ops.richSourceOffsetForEditorPosition(quickDoc, afterRefsSpace), 6);
            const QVariantMap splitAfter = controller.splitRichHtml(html, 6);
            QCOMPARE(splitAfter.value(QStringLiteral("before")).toString(),
                     QStringLiteral("<p>Go <span data-page-id=\"p1\" title=\"Alpha\"></span>"
                                    "<span data-page-id=\"p1\" title=\"Alpha\"></span> </p>"));
            QCOMPARE(splitAfter.value(QStringLiteral("after")).toString(), QStringLiteral("<p>End</p>"));
        }

        // 3. Hard break <br/> and heading/table boundaries
        {
            const QString html = QStringLiteral("<h1>Head</h1><p>Line1<br/>Line2</p>");
            auto editor = createQuickTextEdit(engine);
            QVERIFY(editor);
            editor->setProperty("text", ops.richSourceForEditor(html));
            QQuickTextDocument *quickDoc = editor->property("textDocument").value<QQuickTextDocument *>();
            QVERIFY(quickDoc && quickDoc->textDocument());
            QTextDocument &doc = *quickDoc->textDocument();

            const int posAfterLine1 = editorCursorAfter(doc, QStringLiteral("Line1"));
            const int posBeforeLine2 = posAfterLine1 + 1; // After QChar::LineSeparator
            const QVariantMap splitAfterBr = controller.splitRichHtml(
                html, ops.richSourceOffsetForEditorPosition(quickDoc, posBeforeLine2));
            QCOMPARE(splitAfterBr.value(QStringLiteral("before")).toString(), QStringLiteral("<h1>Head</h1><p>Line1<br/></p>"));
            QCOMPARE(splitAfterBr.value(QStringLiteral("after")).toString(), QStringLiteral("<p>Line2</p>"));
        }
    }
};

int runNativeNotesCursorSplitTest(int argc, char **argv) {
    NativeNotesCursorSplitTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_cursor_split_test.moc"
