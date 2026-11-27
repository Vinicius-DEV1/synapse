#include "controllers/notes/notes_text_operations.h"
#include "controllers/notes/notes_rich_format.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class MockSlashPageController final : public QObject {
    Q_OBJECT
public:
    QString lastParentId;
    QString lastTitle;
    QString lastIcon;
    QString createdPageId = QStringLiteral("page-created");
    int createCount = 0;
    bool shouldFail = false;

    Q_INVOKABLE QString createSubPage(const QString &parentId, const QString &title, const QString &icon) {
        ++createCount;
        lastParentId = parentId;
        lastTitle = title;
        lastIcon = icon;
        return shouldFail ? QString() : createdPageId;
    }
};

class NativeNotesPageReferenceSlashQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void slashSearchInsertsAtCaretSupportsUndoAndOpensFloatingPreview() {
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
        QTRY_VERIFY(window.isVisible());

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *slashMenu = root->findChild<QObject *>("notesRichSlashCommandMenu");
        QObject *pageMenu = root->findChild<QObject *>("notesRichPageReferenceMenu");
        QObject *searchField = root->findChild<QObject *>("notesRichPageReferenceSearchField");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(slashMenu);
        QVERIFY(pageMenu);
        QVERIFY(searchField);

        richEditor->setProperty("pageList", QVariantList{
            QVariantMap{{"id", "page-one"}, {"title", "First page"}, {"icon", "📄"}, {"depth", 0}},
            QVariantMap{{"id", "page-two"}, {"title", "Second page"}, {"icon", "📄"}, {"depth", 1}}
        });
        richEditor->setProperty("sourceHtml", "<p>BeginEnd</p>");
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
        QTest::keyClick(&window, Qt::Key_P);
        QTest::keyClick(&window, Qt::Key_A);
        QTest::keyClick(&window, Qt::Key_G);
        QTest::keyClick(&window, Qt::Key_E);
        QTRY_VERIFY(slashMenu->property("visible").toBool());
        const QVariantList commands = slashMenu->property("filteredCommands").toList();
        int pageCommandIndex = -1;
        for (int index = 0; index < commands.size(); ++index) {
            if (commands.at(index).toMap().value("id").toString() == "page") pageCommandIndex = index;
        }
        QVERIFY(pageCommandIndex >= 0);
        slashMenu->setProperty("selectedIndex", pageCommandIndex);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(pageMenu->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_S);
        QTest::keyClick(&window, Qt::Key_E);
        QTest::keyClick(&window, Qt::Key_C);
        QTRY_COMPARE(pageMenu->property("filteredPages").toList().size(), 1);
        QCOMPARE(pageMenu->property("filteredPages").toList().first().toMap().value("id").toString(),
                 QString("page-two"));
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(!pageMenu->property("visible").toBool());
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const QVariantMap insertedReference = operations.richPageReferenceAt(quickDocument, 5, 5, false);
        QCOMPARE(insertedReference.value("pageId").toString(), QString("page-two"));
        QCOMPARE(insertedReference.value("title").toString(), QString("Second page"));
        QTextCursor referenceCursor(quickDocument->textDocument());
        referenceCursor.setPosition(5);
        referenceCursor.movePosition(QTextCursor::NextCharacter, QTextCursor::KeepAnchor);
        QCOMPARE(referenceCursor.charFormat().objectType(), NotesRichFormat::PageReferenceObjectType);
        QCOMPARE(referenceCursor.charFormat().property(NotesRichFormat::PageReferenceId).toString(),
                 QString("page-two"));

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString(
            "<p>Begin<span data-page-id=\"page-two\" title=\"Second page\"></span>End</p>"));

        QSignalSpy preview(richEditor, SIGNAL(pagePreviewRequested(QString)));
        const QString href = QStringLiteral("synapse-page:/page-two?title=Second%20page");
        QVERIFY(QMetaObject::invokeMethod(textEdit, "linkActivated", Qt::DirectConnection, Q_ARG(QString, href)));
        QCOMPARE(preview.count(), 1);
        QCOMPARE(preview.takeFirst().at(0).toString(), QString("page-two"));

        QTest::keyClick(&window, Qt::Key_Z, Qt::ControlModifier);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<p>BeginEnd</p>"));
    }

    void slashCreateAddsLinkedChildAndReportsDatabaseFailure() {
        QQmlEngine engine;
        NotesTextOperations operations;
        MockSlashPageController controller;
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
        QTRY_VERIFY(window.isVisible());

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *slashMenu = root->findChild<QObject *>("notesRichSlashCommandMenu");
        QObject *pageMenu = root->findChild<QObject *>("notesRichPageReferenceMenu");
        QObject *searchField = root->findChild<QObject *>("notesRichPageReferenceSearchField");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(slashMenu);
        QVERIFY(pageMenu);
        QVERIFY(searchField);
        richEditor->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        richEditor->setProperty("parentPageId", "parent-page");
        richEditor->setProperty("sourceHtml", "<p>BeginEnd</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        textEdit->setProperty("cursorPosition", 5);
        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTRY_VERIFY(textItem->hasActiveFocus());

        QSignalSpy hierarchy(richEditor, SIGNAL(pageHierarchyChanged()));
        QTest::keyClick(&window, Qt::Key_Slash);
        const QString command = QStringLiteral("page-create");
        for (const QChar character : command) {
            const int key = character == QLatin1Char('-') ? Qt::Key_Minus
                : Qt::Key_A + character.toLower().unicode() - QLatin1Char('a').unicode();
            QTest::keyClick(&window, key);
        }
        QTRY_VERIFY(slashMenu->property("visible").toBool());
        const QVariantList commands = slashMenu->property("filteredCommands").toList();
        int createCommandIndex = -1;
        for (int index = 0; index < commands.size(); ++index) {
            if (commands.at(index).toMap().value("id").toString() == "page-create")
                createCommandIndex = index;
        }
        QVERIFY(createCommandIndex >= 0);
        slashMenu->setProperty("selectedIndex", createCommandIndex);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(pageMenu->property("visible").toBool());
        QCOMPARE(pageMenu->property("mode").toString(), QString("create"));
        const QVariantList initialOptions = pageMenu->property("options").toList();
        QVERIFY(!initialOptions.isEmpty());
        QVERIFY(initialOptions.first().toMap().value("createNew").toBool());
        searchField->setProperty("text", "New child");
        QCOMPARE(searchField->property("text").toString(), QString("New child"));
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(!pageMenu->property("visible").toBool());
        QCOMPARE(controller.createCount, 1);
        QCOMPARE(controller.lastParentId, QString("parent-page"));
        QCOMPARE(controller.lastTitle, QString("New child"));
        QCOMPARE(controller.lastIcon, QString("📄"));
        QCOMPARE(hierarchy.count(), 1);
        QVERIFY(richEditor->property("active").toBool());
        QCOMPARE(richEditor->property("parentPageId").toString(), QString("parent-page"));

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString(
            "<p>Begin<span data-page-id=\"page-created\" title=\"New child\"></span>End</p>"));
        QTest::keyClick(&window, Qt::Key_Z, Qt::ControlModifier);
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<p>BeginEnd</p>"));

        controller.shouldFail = true;
        textEdit->setProperty("cursorPosition", 5);
        QTest::keyClick(&window, Qt::Key_Slash);
        for (const QChar character : command) {
            const int key = character == QLatin1Char('-') ? Qt::Key_Minus
                : Qt::Key_A + character.toLower().unicode() - QLatin1Char('a').unicode();
            QTest::keyClick(&window, key);
        }
        QTRY_VERIFY(slashMenu->property("visible").toBool());
        const QVariantList failureCommands = slashMenu->property("filteredCommands").toList();
        createCommandIndex = -1;
        for (int index = 0; index < failureCommands.size(); ++index) {
            if (failureCommands.at(index).toMap().value("id").toString() == "page-create")
                createCommandIndex = index;
        }
        QVERIFY(createCommandIndex >= 0);
        slashMenu->setProperty("selectedIndex", createCommandIndex);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(pageMenu->property("visible").toBool());
        searchField->setProperty("text", "Failed child");
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(pageMenu->property("visible").toBool());
        QVERIFY(!pageMenu->property("errorMessage").toString().isEmpty());
        QCOMPARE(controller.createCount, 2);
        QCOMPARE(hierarchy.count(), 1);
        QCOMPARE(richEditor->property("sourceHtml").toString(), QString("<p>BeginEnd</p>"));
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_VERIFY(!pageMenu->property("visible").toBool());
    }
};

int runNativeNotesPageReferenceSlashQmlTest(int argc, char **argv) {
    NativeNotesPageReferenceSlashQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_reference_slash_qml_test.moc"
