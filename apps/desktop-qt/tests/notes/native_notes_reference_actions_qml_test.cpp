#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesReferenceActionsQmlTest final : public QObject {
    Q_OBJECT
private:
    QObject *createEditor(QQmlEngine &engine, NotesTextOperations &operations,
                          QQuickWindow &window, const QVariantList &pages,
                          const QString &source, QScopedPointer<QObject> &root) {
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        root.reset(component.create());
        if (!root) return nullptr;
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        if (!rootItem) return nullptr;
        rootItem->setParentItem(window.contentItem());
        QObject *editor = root->findChild<QObject *>("richTableEditor");
        if (!editor) return nullptr;
        editor->setProperty("pageList", pages);
        editor->setProperty("sourceHtml", source);
        editor->setProperty("active", true);
        QVariant loaded;
        if (!QMetaObject::invokeMethod(editor, "loadSource", Q_RETURN_ARG(QVariant, loaded)) || !loaded.toBool())
            return nullptr;
        window.resize(960, 520);
        window.show();
        return editor;
    }

    void click(QObject *object) {
        QVERIFY(object);
        QVERIFY(QMetaObject::invokeMethod(object, "clicked", Qt::DirectConnection));
    }

private slots:
    void adjacentBoundarySeparatesOnlyPageReferenceAnchors() {
        NotesTextOperations operations;
        const QVariantList pages = {
            QVariantMap{{"id", "target-page"}, {"title", "Target page"}, {"icon", "📄"}}
        };
        const QString references = QStringLiteral(
            "<p><span data-page-id=\"target-page\" title=\"Target page\"></span>"
            "<span data-page-id=\"target-page\" title=\"Target page\"></span></p>");
        const QString referenceEditorSource = operations.richSourceForEditorWithPages(references, pages);
        QCOMPARE(referenceEditorSource.count(QStringLiteral("&#8288;")), 1);

        const QString externalThenReference = QStringLiteral(
            "<p><a href=\"https://example.com\">External</a>"
            "<span data-page-id=\"target-page\" title=\"Target page\"></span></p>");
        const QString externalEditorSource = operations.richSourceForEditorWithPages(externalThenReference, pages);
        QVERIFY(!externalEditorSource.contains(QStringLiteral("&#8288;")));
    }

    void backspaceConfirmsAndRemovesTheWholePageReferenceAsOneEdit() {
        QQmlEngine engine;
        NotesTextOperations operations;
        QQuickWindow window;
        QScopedPointer<QObject> root;
        const QString source = QStringLiteral(
            "<p>Before<span data-page-id=\"target-page\" title=\"Target page\"></span>"
            "<span data-page-id=\"target-page\" title=\"Target page\"></span>After</p>");
        QObject *editor = createEditor(engine, operations, window, {
            QVariantMap{{"id", "target-page"}, {"title", "Target page"}, {"icon", "📄"}}
        }, source, root);
        QVERIFY(editor);
        QTRY_VERIFY(window.isVisible());

        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *dialog = root->findChild<QObject *>("notesPageReferenceRemovalDialog");
        QObject *removeButton = root->findChild<QObject *>("notesPageReferenceRemoveButton");
        QVERIFY(textEdit);
        QVERIFY(dialog);
        QVERIFY(removeButton);
        textEdit->setProperty("cursorPosition", 23);
        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        auto *textDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(textDocument);
        QCOMPARE(operations.richPlainText(textDocument), QString("Before↗ Target page↗ Target pageAfter"));
        QTest::keyClick(&window, Qt::Key_Backspace);
        QTRY_VERIFY(dialog->property("visible").toBool());
        QCOMPARE(editor->property("sourceHtml").toString(), source);

        click(removeButton);
        const QString oneReference = QStringLiteral(
            "<p>Before<span data-page-id=\"target-page\" title=\"Target page\"></span>After</p>");
        QTRY_COMPARE(editor->property("sourceHtml").toString(), oneReference);
        QTest::keyClick(&window, Qt::Key_Z, Qt::ControlModifier);
        QTRY_COMPARE(editor->property("sourceHtml").toString(), source);
    }

    void deletedReferenceOffersKeepAndConfirmedRemoval() {
        QQmlEngine engine;
        NotesTextOperations operations;
        QQuickWindow window;
        QScopedPointer<QObject> root;
        QObject *editor = createEditor(engine, operations, window, {},
            QStringLiteral("<p>Before<span data-page-id=\"deleted-page\" title=\"Old page\"></span>After</p>"), root);
        QVERIFY(editor);
        QTRY_VERIFY(window.isVisible());

        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *dialog = root->findChild<QObject *>("notesPageReferenceRemovalDialog");
        QObject *removeButton = root->findChild<QObject *>("notesPageReferenceRemoveButton");
        QObject *keepButton = root->findChild<QObject *>("notesPageReferenceKeepButton");
        QVERIFY(textEdit);
        QVERIFY(dialog);
        QVERIFY(removeButton);
        QVERIFY(keepButton);
        const QString href = QStringLiteral("synapse-page:/deleted-page?title=Old%20page");
        QVERIFY(QMetaObject::invokeMethod(textEdit, "linkActivated", Qt::DirectConnection, Q_ARG(QString, href)));
        QTRY_VERIFY(dialog->property("visible").toBool());
        QVERIFY(dialog->property("deletedTarget").toBool());
        QVERIFY(dialog->property("removable").toBool());
        QCOMPARE(editor->property("sourceHtml").toString().contains("data-page-id=\"deleted-page\""), true);

        click(keepButton);
        QTRY_VERIFY(!dialog->property("visible").toBool());
        QVERIFY(editor->property("sourceHtml").toString().contains("data-page-id=\"deleted-page\""));
        QVERIFY(QMetaObject::invokeMethod(textEdit, "linkActivated", Qt::DirectConnection, Q_ARG(QString, href)));
        QTRY_VERIFY(dialog->property("visible").toBool());
        click(removeButton);
        QTRY_COMPARE(editor->property("sourceHtml").toString(), QString("<p>BeforeAfter</p>"));
    }
};

int runNativeNotesReferenceActionsQmlTest(int argc, char **argv) {
    NativeNotesReferenceActionsQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_reference_actions_qml_test.moc"
