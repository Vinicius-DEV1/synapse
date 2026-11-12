#include "controllers/notes/notes_text_operations.h"

#include <QtGui/QGuiApplication>
#include <QtCore/QCoreApplication>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QUrl>
#include <QtTest/QtTest>

int runNativeNotesCalloutQmlTest(int argc, char **argv);
int runNativeNotesCodeLanguageQmlTest(int argc, char **argv);
int runNativeNotesDividerDragQmlTest(int argc, char **argv);
int runNativeNotesSlashMenuQmlTest(int argc, char **argv);
int runNativeNotesPageReferenceQmlTest(int argc, char **argv);
int runNativeNotesReferenceSearchQmlTest(int argc, char **argv);
int runNativeNotesReferenceActionsQmlTest(int argc, char **argv);
int runNativeNotesRichImagesQmlTest(int argc, char **argv);
int runNativeNotesRichImageMovementQmlTest(int argc, char **argv);
int runNativeNotesRichImageClipboardQmlTest(int argc, char **argv);

class MockNotesController final : public QObject {
    Q_OBJECT
public:
    int saveCount = 0;
    QString lastSavedPageId;
    QString lastSavedContent;

signals:
    void fileOperationFinished(const QVariantMap &result);

public:

    Q_INVOKABLE QVariantList getPinnedPages() const {
        return {page("page-one", "<p>First page</p>" )};
    }

    Q_INVOKABLE QVariantList getPageTree(const QString &query) const {
        QVariantList pages = {page("page-one", "<p>First page</p>"), page("page-two", "<p>Second page</p>")};
        if (query.isEmpty()) return pages;
        return {};
    }

    Q_INVOKABLE QVariantMap getPage(const QString &id) const {
        if (id == "page-one") return page(id, lastSavedPageId == id ? lastSavedContent : "<p>First page</p>");
        if (id == "page-two") return page(id, "<p>Second page</p>");
        return {};
    }

    Q_INVOKABLE bool savePage(const QString &id, const QString &, const QString &content, const QString &) {
        ++saveCount;
        lastSavedPageId = id;
        lastSavedContent = content;
        return true;
    }

    Q_INVOKABLE bool updatePageDescription(const QString &, const QString &) { return true; }
    Q_INVOKABLE QVariantList getPageHistory(const QString &) const { return {}; }
    Q_INVOKABLE QString createSubPage(const QString &, const QString &, const QString &) { return {}; }
    Q_INVOKABLE bool deletePage(const QString &) { return true; }
    Q_INVOKABLE void togglePinPage(const QString &) {}

private:
    static QVariantMap page(const QString &id, const QString &content) {
        return {{"id", id}, {"title", id}, {"description", ""}, {"content", content},
                {"parent_id", ""}, {"sort_order", 0}, {"icon", "📄"},
                {"cover_image", ""}, {"updated_at", "2026-11-11"}};
    }
};

class NativeRichQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void collapsedCursorFormattingAppliesOnlyToFollowingText() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.setData(R"(
            import QtQuick
            TextEdit {
                property string previousPlainText: ""
                textFormat: TextEdit.RichText
                text: "<p>abc</p>"
                Component.onCompleted: previousPlainText = notesTextOperations.richPlainText(textDocument)
                onTextChanged: {
                    var currentPlainText = notesTextOperations.richPlainText(textDocument)
                    var previous = previousPlainText
                    previousPlainText = currentPlainText
                    notesTextOperations.applyRichPendingMarks(textDocument, previous, currentPlainText, cursorPosition)
                }
                function exercise() {
                    cursorPosition = 3
                    var saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>abc</p>") return false
                    if (!notesTextOperations.toggleRichAtCursor(textDocument, cursorPosition, "bold")) return false
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>abc</p>") return false
                    insert(cursorPosition, "X")
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>abc<strong>X</strong></p>") return false
                    undo()
                    saved = notesTextOperations.serializeRich(textDocument)
                    return saved.ok && saved.html === "<p>abc</p>"
                }
            }
        )", QUrl());
        QScopedPointer<QObject> editor(component.create());
        QVERIFY2(editor, qPrintable(component.errorString()));
        QVariant result;
        QVERIFY(QMetaObject::invokeMethod(editor.data(), "exercise", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
    }

    void richDocumentBridgePreservesChangesAndRejectsUnsupported() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.setData(R"(
            import QtQuick
            TextEdit {
                textFormat: TextEdit.RichText
                text: "<p>Hello world</p>"
                function exercise() {
                    if (!notesTextOperations.supportsRichSource("<p>Hello world</p>")) return false
                    if (!notesTextOperations.toggleRich(textDocument, 0, 5, "bold")) return false
                    var saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p><strong>Hello</strong> world</p>") return false
                    undo()
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>Hello world</p>") return false
                    text = "<p>First</p><p>Second</p>"
                    if (!notesTextOperations.toggleRichBlock(textDocument, 0, 5, "heading2")) return false
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<h2>First</h2><p>Second</p>") return false
                    undo()
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>First</p><p>Second</p>") return false
                    text = "<p>one</p><p>two</p>"
                    if (!notesTextOperations.toggleRichBlock(textDocument, 0, 7, "codeBlock")) return false
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<pre><code>one\ntwo</code></pre>") return false
                    undo()
                    saved = notesTextOperations.serializeRich(textDocument)
                    if (!saved.ok || saved.html !== "<p>one</p><p>two</p>") return false
                    text = "<p><a href='javascript:alert(1)'>link</a></p>"
                    return !notesTextOperations.serializeRich(textDocument).ok
                }
            }
        )", QUrl());
        QScopedPointer<QObject> editor(component.create());
        QVERIFY2(editor, qPrintable(component.errorString()));
        QVariant result;
        QVERIFY(QMetaObject::invokeMethod(editor.data(), "exercise", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
    }

    void richEditorFlushesValidEditsAndBlocksUnsupportedContent() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl editorUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesRichTextEditor.qml"));
        component.loadUrl(editorUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        root->setProperty("sourceHtml", "<p>First</p>");
        root->setProperty("active", true);
        QCoreApplication::processEvents();
        QObject *editor = root->findChild<QObject *>("notesRichTextEditor");
        QObject *tableActions = root->findChild<QObject *>("notesRichTableEditorActions");
        QVERIFY(editor);
        QVERIFY(tableActions);
        QSignalSpy published(root.data(), SIGNAL(contentModified(QString)));

        editor->setProperty("text", "<p>First <strong>edit</strong></p>");
        QVariant flushed;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>First <strong>edit</strong></p>"));
        QCOMPARE(published.count(), 1);

        editor->setProperty("text", "<p><a href='javascript:alert(1)'>unsupported</a></p>");
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(!flushed.toBool());
        QVERIFY(root->property("hasInvalidContent").toBool());
        QCOMPARE(published.count(), 1);

        editor->setProperty("text", "<p>Restored</p>");
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QVERIFY(!root->property("hasInvalidContent").toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>Restored</p>"));
        QCOMPARE(published.count(), 2);

        editor->setProperty("text", "<p>Heading</p>");
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 7)));
        QVariant formatted;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "toggleBlock", Q_RETURN_ARG(QVariant, formatted),
                                          Q_ARG(QVariant, QVariant("heading1"))));
        QVERIFY(formatted.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<h1>Heading</h1>"));

        editor->setProperty("text", "<p>First</p><p>Second</p>");
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 12)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "toggleBlock", Q_RETURN_ARG(QVariant, formatted),
                                          Q_ARG(QVariant, QVariant("bulletList"))));
        QVERIFY(formatted.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(),
                 QString("<ul><li><p>First</p></li><li><p>Second</p></li></ul>"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>First</p><p>Second</p>"));

        editor->setProperty("text", "<p>const x</p><p>return x</p>");
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 16)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "toggleBlock", Q_RETURN_ARG(QVariant, formatted),
                                          Q_ARG(QVariant, QVariant("codeBlock"))));
        QVERIFY(formatted.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<pre><code>const x\nreturn x</code></pre>"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>const x</p><p>return x</p>"));

        root->setProperty("sourceHtml", "<h2><strong>Preserve</strong></h2>");
        QTest::qWait(240);
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 8)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "toggleBlock", Q_RETURN_ARG(QVariant, formatted),
                                          Q_ARG(QVariant, QVariant("paragraph"))));
        QVERIFY(formatted.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p><strong>Preserve</strong></p>"));

        editor->setProperty("text", "<p>Highlight me</p>");
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 9)));
        QVariant colored;
        QVERIFY(QMetaObject::invokeMethod(tableActions, "setColor", Q_RETURN_ARG(QVariant, colored),
                                          Q_ARG(QVariant, QVariant(true)), Q_ARG(QVariant, QVariant("#EAB308"))));
        QVERIFY(colored.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(),
                 QString("<p><mark style=\"background-color:#eab308\">Highlight</mark> me</p>"));
        QCOMPARE(published.count(), 9);
    }

    void notesViewFlushesBeforePreviewNavigationAndSave() {
        QQmlEngine engine;
        NotesTextOperations operations;
        MockNotesController controller;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("theme", QVariantMap{
            {"bgDarkBg", "#0f0e17"}, {"fontFamily", "Inter, -apple-system, sans-serif"},
            {"textSubtext", "#a7a9be"}, {"textDark", "#fffffe"}, {"brand600", "#7c3aed"},
            {"textMuted", "#71717a"}, {"fontMono", "monospace"}
        });
        QQmlComponent component(&engine);
        const QUrl viewUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesEditorView.qml"));
        component.loadUrl(viewUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        QTRY_COMPARE(root->property("selectedPageId").toString(), QString("page-one"));

        root->setProperty("isPreviewMode", false);
        QObject *canvas = root->findChild<QObject *>("notesEditorCanvas");
        QVERIFY(canvas);
        QVERIFY(QMetaObject::invokeMethod(canvas, "richModeRequested", Q_ARG(bool, true)));
        QTRY_VERIFY(root->property("isRichMode").toBool());
        QObject *editor = root->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(editor);

        editor->setProperty("text", "<p>Preview flush</p>");
        QVariant transition;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "setPreviewMode", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant(true))));
        QVERIFY(transition.toBool());
        QCOMPARE(root->property("activeContent").toString(), QString("<p>Preview flush</p>"));
        QCOMPARE(controller.saveCount, 0);

        QVERIFY(QMetaObject::invokeMethod(root.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QCOMPARE(controller.saveCount, 1);
        QCOMPARE(controller.lastSavedPageId, QString("page-one"));
        QCOMPARE(controller.lastSavedContent, QString("<p>Preview flush</p>"));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "setPreviewMode", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant(false))));
        QVERIFY(transition.toBool());
        editor->setProperty("text", "<p>Navigation flush</p>");
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant("page-two"))));
        QVERIFY(transition.toBool());
        QCOMPARE(controller.saveCount, 2);
        QCOMPARE(controller.lastSavedPageId, QString("page-one"));
        QCOMPARE(controller.lastSavedContent, QString("<p>Navigation flush</p>"));
        QCOMPARE(root->property("selectedPageId").toString(), QString("page-two"));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant("page-one"))));
        QVERIFY(transition.toBool());
        root->setProperty("isPreviewMode", false);
        QVERIFY(QMetaObject::invokeMethod(canvas, "richModeRequested", Q_ARG(bool, true)));
        QTRY_VERIFY(root->property("isRichMode").toBool());
        editor->setProperty("text", "<p><a href='javascript:alert(1)'>unsupported</a></p>");
        QVERIFY(QMetaObject::invokeMethod(root.data(), "setPreviewMode", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant(true))));
        QVERIFY(!transition.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_RETURN_ARG(QVariant, transition),
                                          Q_ARG(QVariant, QVariant("page-two"))));
        QVERIFY(!transition.toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(!transition.toBool());
        QCOMPARE(controller.saveCount, 2);

        editor->setProperty("text", "<p>Color me</p>");
        QObject *richEditor = root->findChild<QObject *>("notesRichTextEditorRoot");
        QVERIFY(richEditor);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QObject *palette = root->findChild<QObject *>("notesRichColorPalette");
        QVERIFY(palette);
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 5)));
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(bool, false),
                                          Q_ARG(QString, QString("#A855F7"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QCOMPARE(root->property("activeContent").toString(),
                 QString("<p><span style=\"color:#a855f7\">Color</span> me</p>"));

        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 6), Q_ARG(int, 8)));
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(bool, true),
                                          Q_ARG(QString, QString("#EAB308"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QCOMPARE(root->property("activeContent").toString(),
                 QString("<p><span style=\"color:#a855f7\">Color</span> <mark style=\"background-color:#eab308\">me</mark></p>"));

        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 5)));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "openLinkDialog", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QObject *linkDialog = richEditor->findChild<QObject *>("notesRichLinkDialog");
        QVERIFY(linkDialog);
        linkDialog->setProperty("targetUrl", "https://example.com/docs?q=1&x=2");
        QVERIFY(QMetaObject::invokeMethod(linkDialog, "createLink"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QCOMPARE(root->property("activeContent").toString(),
                 QString("<p><a href=\"https://example.com/docs?q=1&amp;x=2\"><span style=\"color:#a855f7\">Color</span></a> <mark style=\"background-color:#eab308\">me</mark></p>"));

        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 5)));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "openLinkDialog", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QVERIFY(linkDialog->property("hasExistingLink").toBool());
        QVERIFY(QMetaObject::invokeMethod(linkDialog, "linkRemoved"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, transition)));
        QVERIFY(transition.toBool());
        QCOMPARE(root->property("activeContent").toString(),
                 QString("<p><span style=\"color:#a855f7\">Color</span> <mark style=\"background-color:#eab308\">me</mark></p>"));
    }
};

int main(int argc, char **argv) {
    QGuiApplication application(argc, argv);
    NativeRichQmlTest test;
    const int richResult = QTest::qExec(&test, argc, argv);
    return richResult | runNativeNotesSlashMenuQmlTest(argc, argv) |
        runNativeNotesPageReferenceQmlTest(argc, argv) |
        runNativeNotesReferenceSearchQmlTest(argc, argv) |
        runNativeNotesReferenceActionsQmlTest(argc, argv) |
        runNativeNotesCalloutQmlTest(argc, argv) |
        runNativeNotesCodeLanguageQmlTest(argc, argv) |
        runNativeNotesDividerDragQmlTest(argc, argv) |
        runNativeNotesRichImagesQmlTest(argc, argv) |
        runNativeNotesRichImageMovementQmlTest(argc, argv) |
        runNativeNotesRichImageClipboardQmlTest(argc, argv);
}

#include "native_rich_qml_test.moc"
