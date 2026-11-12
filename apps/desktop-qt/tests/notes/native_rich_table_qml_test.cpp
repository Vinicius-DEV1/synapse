#include "controllers/notes/notes_text_operations.h"
#include "controllers/notes/notes_rich_document.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QAccessible>
#include <QtGui/QTextBlock>
#include <QtGui/QTextFormat>
#include <QtGui/QTextTable>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeRichTableQmlTest final : public QObject {
    Q_OBJECT

private slots:
    void toolbarSignalInsertsAndSavesEditableTable() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl harnessUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml"));
        component.loadUrl(harnessUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *taskControls = root->findChild<QObject *>("notesRichTaskListControls");
        QVERIFY(toolbar);
        QVERIFY(richEditor);
        QVERIFY(taskControls);
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", "<p>BeforeAfter</p>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QObject *textEdit = richEditor->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(textEdit);
        QTest::qWait(220);
        QCoreApplication::processEvents();
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 6), Q_ARG(int, 6)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableRequested"));

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY2(committed.toBool(), "The native rich editor refused its inserted table.");
        const QString html = richEditor->property("sourceHtml").toString();
        QVERIFY(html.contains("<table><tbody>"));
        QCOMPARE(html.count("<th>"), 3);
        QCOMPARE(html.count("<td>"), 6);
        QVERIFY2(html.startsWith("<p>Before</p>"), qPrintable(html));
        QVERIFY2(html.endsWith("<p>After</p>"), qPrintable(html));

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextTable *table = nullptr;
        for (QTextFrame *frame : quickDocument->textDocument()->rootFrame()->childFrames()) {
            if (auto *candidate = qobject_cast<QTextTable *>(frame)) table = candidate;
        }
        QVERIFY(table);
        QTextCursor cell = table->cellAt(1, 1).firstCursorPosition();
        cell.insertText("Editable");
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QVERIFY(richEditor->property("sourceHtml").toString().contains("<td><p>Editable</p></td>"));
        QVERIFY(NotesRichDocument::supportsSource(richEditor->property("sourceHtml").toString()));

        textEdit->setProperty("cursorPosition", cell.position());
        QCoreApplication::processEvents();
        QVERIFY(toolbar->property("tableCellActive").toBool());
        QVERIFY(toolbar->property("canMoveTableRowUp").toBool());
        QVERIFY(toolbar->property("canMoveTableRowDown").toBool());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested", Q_ARG(QString, QStringLiteral("rowAfter"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString().count("<tr>"), 4);

        const QString headerMoveOriginal = richEditor->property("sourceHtml").toString();
        QTextCursor headerCell = table->cellAt(0, 0).firstCursorPosition();
        textEdit->setProperty("cursorPosition", headerCell.position());
        QCoreApplication::processEvents();
        QVERIFY(!toolbar->property("canMoveTableRowUp").toBool());
        QVERIFY(toolbar->property("canMoveTableRowDown").toBool());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveRowDown"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString movedHeaderHtml = richEditor->property("sourceHtml").toString();
        QVERIFY(movedHeaderHtml.indexOf("<td>") < movedHeaderHtml.indexOf("<th>"));
        QVERIFY(NotesRichDocument::supportsSource(movedHeaderHtml));

        headerCell = table->cellAt(1, 0).firstCursorPosition();
        textEdit->setProperty("cursorPosition", headerCell.position());
        QCoreApplication::processEvents();
        QVERIFY(toolbar->property("canMoveTableRowUp").toBool());
        QVERIFY(toolbar->property("canMoveTableRowDown").toBool());
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richTableActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveRowUp"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), headerMoveOriginal);

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", "<p>Heading</p>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QTest::qWait(220);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 0), Q_ARG(int, 7)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richBlockRequested", Q_ARG(QString, QStringLiteral("heading6"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral("<h6>Heading</h6>"));

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", "<p>BeforeAfter</p>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QTest::qWait(220);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 6), Q_ARG(int, 6)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richDividerRequested"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<p>Before</p><hr/><p>After</p>"));

        QTextBlock dividerBlock = quickDocument->textDocument()->begin();
        while (dividerBlock.isValid() &&
               !dividerBlock.blockFormat().hasProperty(QTextFormat::BlockTrailingHorizontalRulerWidth))
            dividerBlock = dividerBlock.next();
        QVERIFY(dividerBlock.isValid());
        textEdit->setProperty("cursorPosition", dividerBlock.position());
        QCoreApplication::processEvents();
        QVERIFY(operations.isRichDivider(quickDocument, dividerBlock.position()));
        QObject *tableActions = richEditor->findChild<QObject *>("notesRichTableEditorActions");
        QVERIFY(tableActions);
        QVERIFY(tableActions->property("isOnDivider").toBool());
        QVERIFY(toolbar->property("dividerActive").toBool());
        QVERIFY(toolbar->property("canMoveDividerUp").toBool());
        QVERIFY(toolbar->property("canMoveDividerDown").toBool());
        QObject *dividerActions = root->findChild<QObject *>("notesDividerActions");
        QVERIFY(dividerActions);
        QVERIFY(dividerActions->property("visible").toBool());

        QVERIFY(QMetaObject::invokeMethod(toolbar, "richDividerActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveUp"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<hr/><p>Before</p><p>After</p>"));

        QVERIFY(QMetaObject::invokeMethod(toolbar, "richDividerActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveDown"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<p>Before</p><hr/><p>After</p>"));

        QVERIFY(QMetaObject::invokeMethod(toolbar, "richDividerActionRequested",
                                          Q_ARG(QString, QStringLiteral("moveDown"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<p>Before</p><p>After</p><hr/>"));

        QVERIFY(QMetaObject::invokeMethod(toolbar, "richDividerActionRequested",
                                          Q_ARG(QString, QStringLiteral("addBelow"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<p>Before</p><p>After</p><hr/><p><br/></p>"));

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", "<ul><li><p>First</p></li><li><p>Second</p></li></ul>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QTest::qWait(220);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 6), Q_ARG(int, 6)));
        QVariant changedIndent;
        QVERIFY(QMetaObject::invokeMethod(taskControls, "changeListIndent", Q_RETURN_ARG(QVariant, changedIndent),
                                          Q_ARG(QVariant, QVariant(false))));
        QVERIFY(changedIndent.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<ul><li><p>First</p><ul><li><p>Second</p></li></ul></li></ul>"));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 6), Q_ARG(int, 6)));
        QVERIFY(QMetaObject::invokeMethod(taskControls, "changeListIndent", Q_RETURN_ARG(QVariant, changedIndent),
                                          Q_ARG(QVariant, QVariant(true))));
        QVERIFY(changedIndent.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(),
                 QStringLiteral("<ul><li><p>First</p></li><li><p>Second</p></li></ul>"));

        const QString multiParagraphList = QStringLiteral(
            "<ul><li><p>Leading sibling</p></li><li><p>Parent</p><ol><li><p>Nested</p>"
            "<p>Nested detail</p></li></ol><p>Parent detail</p></li><li><p>Trailing sibling</p></li></ul>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", multiParagraphList);
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QTest::qWait(220);
        const int parentDetailPosition = QStringLiteral(
            "Leading sibling\nParent\nNested\nNested detail\nParent detail\nTrailing sibling")
                .indexOf(QStringLiteral("Parent detail"));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, parentDetailPosition),
                                          Q_ARG(int, parentDetailPosition)));
        QVERIFY(QMetaObject::invokeMethod(taskControls, "changeListIndent", Q_RETURN_ARG(QVariant, changedIndent),
                                          Q_ARG(QVariant, QVariant(false))));
        QVERIFY(changedIndent.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<ul><li><p>Leading sibling</p><ul><li><p>Parent</p><ol><li><p>Nested</p>"
            "<p>Nested detail</p></li></ol><p>Parent detail</p></li></ul></li>"
            "<li><p>Trailing sibling</p></li></ul>"));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, parentDetailPosition),
                                          Q_ARG(int, parentDetailPosition)));
        QVERIFY(QMetaObject::invokeMethod(taskControls, "changeListIndent", Q_RETURN_ARG(QVariant, changedIndent),
                                          Q_ARG(QVariant, QVariant(true))));
        QVERIFY(changedIndent.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), multiParagraphList);

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", "<p>First</p><p>Second</p>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QTest::qWait(220);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 0), Q_ARG(int, 12)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richBlockRequested", Q_ARG(QString, QStringLiteral("taskList"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString taskHtml = richEditor->property("sourceHtml").toString();
        QVERIFY(taskHtml.contains("<ul data-type=\"taskList\">"));
        QVERIFY(taskHtml.contains("data-checked=\"false\""));
        QVariant taskToggled;
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 1), Q_ARG(int, 1)));
        QVERIFY(QMetaObject::invokeMethod(taskControls, "toggleFromCursor", Q_RETURN_ARG(QVariant, taskToggled)));
        QVERIFY(!taskToggled.toBool());
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 0), Q_ARG(int, 0)));
        QVERIFY(QMetaObject::invokeMethod(taskControls, "toggleFromCursor", Q_RETURN_ARG(QVariant, taskToggled)));
        QVERIFY(taskToggled.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        taskHtml = richEditor->property("sourceHtml").toString();
        QVERIFY(taskHtml.contains("data-checked=\"true\""));
        QVERIFY(taskHtml.contains("checked=\"checked\""));
    }

    void spoilerToolbarActionPreservesMarkWhileRevealStateChanges() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl harnessUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml"));
        component.loadUrl(harnessUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(toolbar);
        QVERIFY(richEditor);
        QVERIFY(textEdit);

        richEditor->setProperty("sourceHtml", "<p>secret text</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 0), Q_ARG(int, 6)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richMarkRequested", Q_ARG(QString, QStringLiteral("spoiler"))));

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        const QString marked = richEditor->property("sourceHtml").toString();
        QVERIFY(marked.contains("<span data-type=\"spoiler\" class=\"caderno-spoiler\">secret</span>"));
        QVERIFY(NotesRichDocument::supportsSource(marked));

        textEdit->setProperty("cursorPosition", 2);
        QCoreApplication::processEvents();
        QVERIFY(toolbar->property("richSpoilerActive").toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "setSpoilerVisibility", Q_RETURN_ARG(QVariant, committed),
                                          Q_ARG(QVariant, QVariant(2)), Q_ARG(QVariant, QVariant("reveal"))));
        QVERIFY(committed.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), marked);

        QVERIFY(QMetaObject::invokeMethod(richEditor, "setSpoilerVisibility", Q_RETURN_ARG(QVariant, committed),
                                          Q_ARG(QVariant, QVariant(2)), Q_ARG(QVariant, QVariant("hide"))));
        QVERIFY(committed.toBool());
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 0), Q_ARG(int, 6)));
        QVERIFY(QMetaObject::invokeMethod(toolbar, "richMarkRequested", Q_ARG(QString, QStringLiteral("spoiler"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QVERIFY(!richEditor->property("sourceHtml").toString().contains("data-type=\"spoiler\""));
    }

    void spoilerRevealControlSupportsKeyboardAndAccessibilityState() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl harnessUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml"));
        component.loadUrl(harnessUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(960, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QAccessible::setActive(true);

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *spoilerCheckbox = root->findChild<QObject *>("notesRichSpoilerCheckbox");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(spoilerCheckbox);
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml",
            "<p>Read <span data-type=\"spoiler\" class=\"caderno-spoiler\">secret</span> later</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const int secretPosition = quickDocument->textDocument()->toPlainText().indexOf(QStringLiteral("secret")) + 1;
        QVERIFY(secretPosition > 0);
        textEdit->setProperty("cursorPosition", secretPosition);
        textItem->forceActiveFocus();
        QTRY_VERIFY(textItem->hasActiveFocus());
        QTRY_VERIFY(spoilerCheckbox->property("visible").toBool());
        auto *accessible = QAccessible::queryAccessibleInterface(spoilerCheckbox);
        QVERIFY(accessible);
        QCOMPARE(accessible->role(), QAccessible::CheckBox);
        QCOMPARE(accessible->text(QAccessible::Name), QStringLiteral("Reveal spoiler"));
        QVERIFY(accessible->state().checkable);
        QVERIFY(!accessible->state().checked);

        const QString savedMarkup = richEditor->property("sourceHtml").toString();
        QTest::keyClick(&window, Qt::Key_R, Qt::AltModifier);
        QTRY_VERIFY(spoilerCheckbox->property("checked").toBool());
        QTRY_VERIFY(spoilerCheckbox->property("activeFocus").toBool());
        accessible = QAccessible::queryAccessibleInterface(spoilerCheckbox);
        QVERIFY(accessible);
        QCOMPARE(accessible->text(QAccessible::Name), QStringLiteral("Hide revealed spoiler"));
        QVERIFY(accessible->state().checked);
        QVERIFY(!richEditor->property("hasPendingChanges").toBool());
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), savedMarkup);

        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_VERIFY(!spoilerCheckbox->property("checked").toBool());
        accessible = QAccessible::queryAccessibleInterface(spoilerCheckbox);
        QVERIFY(accessible);
        QVERIFY(!accessible->state().checked);
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_VERIFY(textItem->hasActiveFocus());
        QAccessible::setActive(false);
    }

    void tableCellBackgroundPaletteAppliesCellRowColumnAndTableScopes() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl harnessUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml"));
        component.loadUrl(harnessUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *palette = root->findChild<QObject *>("notesTableCellBackgroundPalette");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(palette);
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml",
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th></tr>"
            "<tr><td><p>Body A</p></td><td><p>Body B</p></td></tr></tbody></table>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextTable *table = nullptr;
        for (QTextFrame *frame : quickDocument->textDocument()->rootFrame()->childFrames()) {
            if (auto *candidate = qobject_cast<QTextTable *>(frame)) table = candidate;
        }
        QVERIFY(table);
        const int cellPosition = table->cellAt(1, 0).firstCursorPosition().position();
        textEdit->setProperty("cursorPosition", cellPosition);
        QCoreApplication::processEvents();
        QVERIFY(palette->property("visible").toBool());

        QVariant scopeSelected;
        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("cell")))));
        QVERIFY(scopeSelected.toBool());
        QCOMPARE(palette->property("backgroundScope").toString(), QStringLiteral("cell"));
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected",
            Q_ARG(QString, QStringLiteral("rgba(234, 179, 8, 0.2)")), Q_ARG(QString, QStringLiteral("cell"))));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 1);
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(QString, QString()),
                                          Q_ARG(QString, QStringLiteral("cell"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(!html.contains("data-bg-color"));
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("row")))));
        QVERIFY(scopeSelected.toBool());
        QCOMPARE(palette->property("backgroundScope").toString(), QStringLiteral("row"));
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected",
            Q_ARG(QString, QStringLiteral("rgba(239, 68, 68, 0.2)")), Q_ARG(QString, QStringLiteral("row"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 2);
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(QString, QString()),
                                          Q_ARG(QString, QStringLiteral("row"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(!html.contains("data-bg-color"));
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("column")))));
        QVERIFY(scopeSelected.toBool());
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected",
            Q_ARG(QString, QStringLiteral("rgba(59, 130, 246, 0.2)")), Q_ARG(QString, QStringLiteral("column"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 2);
        QVERIFY(html.contains("<th data-bg-color=\"rgba(59, 130, 246, 0.200)\""));
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "selectBackgroundScope", Q_RETURN_ARG(QVariant, scopeSelected),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("table")))));
        QVERIFY(scopeSelected.toBool());
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected",
            Q_ARG(QString, QStringLiteral("rgba(34, 197, 94, 0.2)")), Q_ARG(QString, QStringLiteral("table"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QCOMPARE(html.count("data-bg-color="), 4);
        QVERIFY(NotesRichDocument::supportsSource(html));

        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(QString, QString()),
                                          Q_ARG(QString, QStringLiteral("table"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(!html.contains("data-bg-color"));
        QVERIFY(NotesRichDocument::supportsSource(html));
    }

    void taskCheckboxesExposeLabelsAndIndependentKeyboardFocus() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        const QUrl harnessUrl = QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml"));
        component.loadUrl(harnessUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(960, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QAccessible::setActive(true);

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml",
            "<ul data-type=\"taskList\"><li data-checked=\"false\" data-type=\"taskItem\">"
            "<label><input type=\"checkbox\"><span></span></label><div><p>Review <strong>chapter</strong></p>"
            "<p>And notes</p></div></li>"
            "<li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"><span></span></label>"
            "<div><p>Read appendix</p></div></li></ul>");
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QCoreApplication::processEvents();

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const QVariantList taskItems = operations.richTaskCheckboxes(quickDocument);
        QCOMPARE(taskItems.size(), 2);
        const QVariantMap first = taskItems.first().toMap();
        QCOMPARE(first.value(QStringLiteral("label")).toString(), QStringLiteral("Review chapter\nAnd notes"));
        QObject *overlay = root->findChild<QObject *>("notesRichTaskCheckboxOverlay");
        QVERIFY(overlay);
        auto checkboxAt = [overlay](int index) {
            QVariant result;
            QMetaObject::invokeMethod(overlay, "checkboxAt", Q_RETURN_ARG(QVariant, result),
                                      Q_ARG(QVariant, QVariant(index)));
            return result.value<QObject *>();
        };
        QObject *checkbox = checkboxAt(0);
        QVERIFY(checkbox);
        auto *accessible = QAccessible::queryAccessibleInterface(checkbox);
        QVERIFY(accessible);
        QCOMPARE(accessible->role(), QAccessible::CheckBox);
        QCOMPARE(accessible->text(QAccessible::Name), QStringLiteral("Review chapter\nAnd notes"));
        QVERIFY(accessible->state().checkable);
        QVERIFY(!accessible->state().checked);

        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTRY_VERIFY(textItem->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Tab);
        QTRY_VERIFY(checkbox->property("activeFocus").toBool());
        QTest::keyClick(&window, Qt::Key_Space);

        QTRY_VERIFY(checkboxAt(0));
        QObject *focusedCheckbox = checkboxAt(0);
        QTRY_VERIFY(focusedCheckbox->property("activeFocus").toBool());
        QTRY_VERIFY(focusedCheckbox->property("checked").toBool());
        accessible = QAccessible::queryAccessibleInterface(focusedCheckbox);
        QVERIFY(accessible);
        QVERIFY(accessible->state().checked);
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QVERIFY(html.contains("data-checked=\"true\""));
        QVERIFY(html.contains("Review <strong>chapter</strong>"));
        QVERIFY(html.contains("<p>And notes</p>"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(html.contains("data-checked=\"false\""));
        QVERIFY(html.contains("Review <strong>chapter</strong>"));
        QVERIFY(html.contains("<p>And notes</p>"));
        QObject *restoredCheckbox = checkboxAt(0);
        QVERIFY(restoredCheckbox);
        accessible = QAccessible::queryAccessibleInterface(restoredCheckbox);
        QVERIFY(accessible);
        QVERIFY(!accessible->state().checked);
        QAccessible::setActive(false);
    }
};

int main(int argc, char **argv) {
    QGuiApplication application(argc, argv);
    NativeRichTableQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_rich_table_qml_test.moc"
