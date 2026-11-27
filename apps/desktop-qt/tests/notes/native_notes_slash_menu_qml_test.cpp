#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QAccessible>
#include <QtGui/QTextDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesSlashMenuQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void slashCommandActionsPreserveTheQueryInOneUndoStep() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.setData(R"(
            import QtQuick
            TextEdit {
                textFormat: TextEdit.RichText
                text: "<p>Alpha/foo</p>"
            }
        )", QUrl());
        QScopedPointer<QObject> editor(component.create());
        QVERIFY2(editor, qPrintable(component.errorString()));
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            editor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);

        const QList<QPair<QString, QString>> cases = {
            {"text", "<p>Alpha</p>"}, {"h1", "<h1>Alpha</h1>"},
            {"h2", "<h2>Alpha</h2>"}, {"h3", "<h3>Alpha</h3>"},
            {"todo", "data-type=\"taskList\""}, {"bullet", "<ul>"},
            {"callout", "<blockquote>"}, {"code", "<pre><code>Alpha</code></pre>"},
            {"divider", "<hr"}, {"table", "<table>"}
        };
        for (const auto &testCase : cases) {
            editor->setProperty("text", "<p>Alpha/foo</p>");
            const int cursorPosition = operations.executeRichSlashCommand(
                quickDocument, 5, 9, testCase.first);
            QVERIFY2(cursorPosition >= 0, qPrintable(testCase.first));
            const QVariantMap saved = operations.serializeRich(quickDocument);
            QVERIFY2(saved.value("ok").toBool(),
                     qPrintable(testCase.first + ": " + quickDocument->textDocument()->toHtml()));
            QVERIFY2(saved.value("html").toString().contains(testCase.second),
                     qPrintable(testCase.first + ": " + saved.value("html").toString()));
            QVERIFY(!operations.richPlainText(quickDocument).contains("/foo"));

            QVERIFY(QMetaObject::invokeMethod(editor.data(), "undo"));
            const QVariantMap undone = operations.serializeRich(quickDocument);
            QVERIFY2(undone.value("ok").toBool(), qPrintable(testCase.first));
            QCOMPARE(undone.value("html").toString(), QString("<p>Alpha/foo</p>"));
        }
        editor->setProperty("text", "<p>Alpha/foo</p>");
        QCOMPARE(operations.executeRichSlashCommand(quickDocument, 5, 9, "unsupported"), -1);
        QCOMPARE(operations.richPlainText(quickDocument), QString("Alpha/foo"));
        editor->setProperty("text", "<p><strong>Alpha/code</strong></p>");
        QCOMPARE(operations.executeRichSlashCommand(quickDocument, 5, 10, "code"), -1);
        QCOMPARE(operations.richPlainText(quickDocument), QString("Alpha/code"));
    }

    void slashMenuFiltersHandlesKeyboardAndCommitsOneUndoableCommand() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        QQuickWindow window;
        window.resize(960, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QAccessible::setActive(true);
        QTRY_VERIFY(window.isVisible());

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *menu = root->findChild<QObject *>("notesRichSlashCommandMenu");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(menu);
        richEditor->setProperty("sourceHtml", "<p>Alpha</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        textEdit->setProperty("cursorPosition", 5);
        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTRY_VERIFY(textItem->hasActiveFocus());

        QTest::keyClick(&window, Qt::Key_Slash);
        QTest::keyClick(&window, Qt::Key_H);
        QTest::keyClick(&window, Qt::Key_E);
        QTest::keyClick(&window, Qt::Key_A);
        QTest::keyClick(&window, Qt::Key_D);
        QTRY_VERIFY(menu->property("visible").toBool());
        QTRY_COMPARE(menu->property("filteredCommands").toList().size(), 3);
        QCOMPARE(menu->property("selectedIndex").toInt(), 0);
        auto *menuAccessible = QAccessible::queryAccessibleInterface(menu);
        QVERIFY(menuAccessible);
        QCOMPARE(menuAccessible->role(), QAccessible::List);
        auto *editorAccessible = QAccessible::queryAccessibleInterface(textEdit);
        QVERIFY(editorAccessible);
        QVERIFY(editorAccessible->text(QAccessible::Description).contains(
            "selected 1 of 3: Heading 1", Qt::CaseInsensitive));
        QTest::keyClick(&window, Qt::Key_Down);
        QCOMPARE(menu->property("selectedIndex").toInt(), 1);
        QTRY_VERIFY(editorAccessible->text(QAccessible::Description).contains(
            "selected 2 of 3: Heading 2", Qt::CaseInsensitive));
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(!menu->property("visible").toBool());

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<h2>Alpha</h2>"));
        QTest::keyClick(&window, Qt::Key_Z, Qt::ControlModifier);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<p>Alpha/head</p>"));

        textEdit->setProperty("text", "<p></p>");
        textEdit->setProperty("cursorPosition", 0);
        textItem->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Slash);
        QTest::keyClick(&window, Qt::Key_T);
        QTest::keyClick(&window, Qt::Key_A);
        QTest::keyClick(&window, Qt::Key_R);
        QTest::keyClick(&window, Qt::Key_E);
        QTest::keyClick(&window, Qt::Key_F);
        QTest::keyClick(&window, Qt::Key_A);
        QTRY_VERIFY(menu->property("visible").toBool());
        QTRY_COMPARE(menu->property("filteredCommands").toList().size(), 1);
        QCOMPARE(menu->property("filteredCommands").toList().first().toMap().value("id").toString(),
                 QString("todo"));
        QTest::keyClick(&window, Qt::Key_Escape);
        QVERIFY(!menu->property("visible").toBool());
        QCOMPARE(operations.richPlainText(qobject_cast<QQuickTextDocument *>(
                     textEdit->property("textDocument").value<QObject *>())).trimmed(), QString("/tarefa"));

        textEdit->setProperty("text", "<p></p>");
        textEdit->setProperty("cursorPosition", 0);
        textItem->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Slash);
        QTRY_VERIFY(menu->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_Space);
        QVERIFY(!menu->property("visible").toBool());
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QCOMPARE(operations.richPlainText(quickDocument), QString("/ "));

        textEdit->setProperty("text", "<p></p>");
        textEdit->setProperty("cursorPosition", 0);
        textItem->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Slash);
        QTRY_VERIFY(menu->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_Left);
        QVERIFY(!menu->property("visible").toBool());
        QCOMPARE(textEdit->property("cursorPosition").toInt(), 0);

        richEditor->setProperty("active", false);
        richEditor->setProperty("hasPendingChanges", false);
        richEditor->setProperty("sourceHtml", "<p><strong>Alpha</strong></p>");
        richEditor->setProperty("active", true);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        textEdit->setProperty("cursorPosition", 5);
        textItem->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Slash);
        QTest::keyClick(&window, Qt::Key_C);
        QTest::keyClick(&window, Qt::Key_O);
        QTest::keyClick(&window, Qt::Key_D);
        QTest::keyClick(&window, Qt::Key_E);
        QTRY_VERIFY(menu->property("visible").toBool());
        QTRY_COMPARE(menu->property("filteredCommands").toList().size(), 1);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(menu->property("visible").toBool());
        QCOMPARE(menu->property("errorMessage").toString(),
                 QString("This block action could not be applied safely."));
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<p><strong>Alpha</strong></p>"));
        QCOMPARE(operations.richPlainText(qobject_cast<QQuickTextDocument *>(
                     textEdit->property("textDocument").value<QObject *>())), QString("Alpha/code"));
        QAccessible::setActive(false);
    }

    void slashCommandTemplatesAndCustomWidgetsProduceExpectedMarkup() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.setData(R"(
            import QtQuick
            TextEdit {
                textFormat: TextEdit.RichText
                text: "<p>/cmd</p>"
            }
        )", QUrl());
        QScopedPointer<QObject> editor(component.create());
        QVERIFY2(editor, qPrintable(component.errorString()));
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            editor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);

        const QList<QPair<QString, QString>> tableTemplates = {
            {"table-week", "Seg"},
            {"table-day", "Horário"},
            {"table-habit", "Hábito"},
            {"cols2", "Coluna 1"},
            {"cols3", "Coluna 3"}
        };

        for (const auto &testCase : tableTemplates) {
            editor->setProperty("text", "<p>/cmd</p>");
            const int cursorPosition = operations.executeRichSlashCommand(
                quickDocument, 0, 4, testCase.first);
            QVERIFY2(cursorPosition >= 0, qPrintable(testCase.first));
            const QVariantMap saved = operations.serializeRich(quickDocument);
            QVERIFY2(saved.value("ok").toBool(), qPrintable(testCase.first));
            QVERIFY2(saved.value("html").toString().contains(testCase.second),
                     qPrintable(testCase.first + ": " + saved.value("html").toString()));
            QVERIFY(!operations.richPlainText(quickDocument).contains("/cmd"));

            QVERIFY(QMetaObject::invokeMethod(editor.data(), "undo"));
            const QVariantMap undone = operations.serializeRich(quickDocument);
            QVERIFY2(undone.value("ok").toBool(), qPrintable(testCase.first));
            QCOMPARE(undone.value("html").toString(), QString("<p>/cmd</p>"));
        }

        const QStringList customWidgetCommands = {
            "question", "foco", "alarme", "evento", "habito",
            "documento", "agrupar", "scrap", "toggle", "blockquoteToggle",
            "group", "video", "livro", "ia"
        };
        for (const auto &commandId : customWidgetCommands) {
            editor->setProperty("text", "<p>/cmd</p>");
            const int cursorPosition = operations.executeRichSlashCommand(
                quickDocument, 0, 4, commandId);
            QCOMPARE(cursorPosition, -1);
            QCOMPARE(operations.richPlainText(quickDocument), QString("/cmd"));
        }
    }

    void allThirtyTwoSlashCommandsArePresentAndSearchable() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesRichSlashCommandMenu.qml")));
        QScopedPointer<QObject> menu(component.create());
        QVERIFY2(menu, qPrintable(component.errorString()));
        const QVariantList commands = menu->property("commands").toList();
        QCOMPARE(commands.size(), 32);
        menu->setProperty("query", "mermaid");
        QVariantList mermaidFiltered = menu->property("filteredCommands").toList();
        QVERIFY(!mermaidFiltered.isEmpty());
        QCOMPARE(mermaidFiltered.first().toMap().value("id").toString(), QString("ia"));
        menu->setProperty("query", "video");
        QVariantList filtered = menu->property("filteredCommands").toList();
        QVERIFY(!filtered.isEmpty());
        QCOMPARE(filtered.first().toMap().value("id").toString(), QString("video"));
        menu->setProperty("query", "livro");
        filtered = menu->property("filteredCommands").toList();
        QVERIFY(!filtered.isEmpty());
        QCOMPARE(filtered.first().toMap().value("id").toString(), QString("livro"));
        menu->setProperty("query", "colecao");
        filtered = menu->property("filteredCommands").toList();
        QVERIFY(!filtered.isEmpty());
        QCOMPARE(filtered.first().toMap().value("id").toString(), QString("group"));
        menu->setProperty("query", "prompt");
        filtered = menu->property("filteredCommands").toList();
        QVERIFY(!filtered.isEmpty());
        QCOMPARE(filtered.first().toMap().value("id").toString(), QString("text"));
        bool hasAiCommand = false;
        for (const auto &item : filtered) {
            if (item.toMap().value("id").toString() == "ia") hasAiCommand = true;
        }
        QVERIFY(hasAiCommand);
        menu->setProperty("query", "ia");
        filtered = menu->property("filteredCommands").toList();
        bool hasIa = false;
        for (const auto &item : filtered) {
            if (item.toMap().value("id").toString() == "ia") hasIa = true;
        }
        QVERIFY(hasIa);
    }

};

int runNativeNotesSlashMenuQmlTest(int argc, char **argv) {
    NativeNotesSlashMenuQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_slash_menu_qml_test.moc"
