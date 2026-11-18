#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QColor>
#include <QtGui/QTextCursor>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class MockPageCreationController final : public QObject {
    Q_OBJECT
public:
    QString lastSavedPageId;
    QString lastSavedTitle;
    QString lastSavedContent;
    QString lastSavedIcon;
    QString lastSavedExpectedUpdatedAt;
    QString lastSavedDescription;
    int savePageCount = 0;
    bool saveShouldFail = false;
    bool descriptionSaveShouldFail = false;
    QString currentTitle = QStringLiteral("Stored target");
    QString currentDescription = QStringLiteral("Target description");
    QString currentContent = QStringLiteral("<p>Target body</p>");
    QString currentUpdatedAt = QStringLiteral("2026-11-13T12:00:00Z");

    Q_INVOKABLE bool savePage(const QString &pageId, const QString &title, const QString &content,
                              const QString &icon, const QString &expectedUpdatedAt = QString()) {
        if (saveShouldFail) return false;
        ++savePageCount;
        lastSavedPageId = pageId;
        lastSavedTitle = title;
        lastSavedContent = content;
        lastSavedIcon = icon;
        lastSavedExpectedUpdatedAt = expectedUpdatedAt;
        currentTitle = title;
        currentContent = content;
        currentUpdatedAt = QStringLiteral("2026-11-13T12:05:00Z");
        return true;
    }

    Q_INVOKABLE bool updatePageDescription(const QString &pageId, const QString &description) {
        Q_UNUSED(pageId);
        if (descriptionSaveShouldFail) return false;
        lastSavedDescription = description;
        currentDescription = description;
        return true;
    }

    Q_INVOKABLE QVariantMap getPage(const QString &pageId) {
        if (pageId != QStringLiteral("page-one")) return {};
        return {{"id", pageId}, {"title", currentTitle}, {"icon", "📄"},
                {"description", currentDescription}, {"content", currentContent},
                {"updated_at", currentUpdatedAt}};
    }
};

class NativeNotesPageReferenceQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void floatingPagePreviewLoadsStoredContentAndGuardsExpand() {
        QQmlEngine engine;
        MockPageCreationController controller;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesPageReferencePreview.qml")));
        QScopedPointer<QObject> preview(component.create());
        QVERIFY2(preview, qPrintable(component.errorString()));
        preview->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        preview->setProperty("pageId", "page-one");

        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "loadPage", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QCOMPARE(preview->property("pageData").toMap().value("title").toString(), QString("Stored target"));
        QCOMPARE(preview->property("pageData").toMap().value("content").toString(), QString("<p>Target body</p>"));

        QSignalSpy expanded(preview.data(), SIGNAL(expandRequested(QString)));
        QVariant expandedResult;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "requestExpand", Q_RETURN_ARG(QVariant, expandedResult)));
        QVERIFY(expandedResult.toBool());
        QCOMPARE(expanded.count(), 1);
        QCOMPARE(expanded.takeFirst().at(0).toString(), QString("page-one"));

        preview->setProperty("pageId", "missing-page");
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "loadPage", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(!loaded.toBool());
        QVERIFY(preview->property("loadError").toString().contains("unavailable"));
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "requestExpand", Q_RETURN_ARG(QVariant, expandedResult)));
        QVERIFY(!expandedResult.toBool());
        QCOMPARE(expanded.count(), 0);
    }

    void floatingPagePreviewEditsTitleDescriptionAndContentWithPersistence() {
        QQmlEngine engine;
        MockPageCreationController controller;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesPageReferencePreview.qml")));
        QScopedPointer<QObject> preview(component.create());
        QVERIFY2(preview, qPrintable(component.errorString()));
        preview->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        preview->setProperty("pageId", "page-one");

        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "loadPage", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());
        QVERIFY(!preview->property("isEditing").toBool());
        QVERIFY(!preview->property("isDirty").toBool());
        QCOMPARE(preview->property("editTitle").toString(), QString("Stored target"));
        QCOMPARE(preview->property("editDescription").toString(), QString("Target description"));
        QCOMPARE(preview->property("editContent").toString(), QString("<p>Target body</p>"));

        QVariant startResult;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "startEditing", Q_RETURN_ARG(QVariant, startResult)));
        QVERIFY(startResult.toBool());
        QVERIFY(preview->property("isEditing").toBool());

        preview->setProperty("editTitle", "Modified title");
        preview->setProperty("editDescription", "Modified description");
        preview->setProperty("editContent", "<p>Modified content</p>");
        QVERIFY(preview->property("isDirty").toBool());

        QSignalSpy savedSpy(preview.data(), SIGNAL(pageSaved(QString, QString)));
        QVariant saveResult;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "saveEdits", Q_RETURN_ARG(QVariant, saveResult)));
        QVERIFY(saveResult.toBool());
        QCOMPARE(controller.savePageCount, 1);
        QCOMPARE(controller.lastSavedTitle, QString("Modified title"));
        QCOMPARE(controller.lastSavedContent, QString("<p>Modified content</p>"));
        QCOMPARE(controller.lastSavedDescription, QString("Modified description"));
        QCOMPARE(controller.lastSavedExpectedUpdatedAt, QString("2026-11-13T12:00:00Z"));
        QVERIFY(!preview->property("isEditing").toBool());
        QVERIFY(!preview->property("isDirty").toBool());
        QVERIFY(preview->property("statusMessage").toString().contains("Saved"));
        QCOMPARE(savedSpy.count(), 1);
        QCOMPARE(savedSpy.at(0).at(0).toString(), QString("page-one"));
        QCOMPARE(savedSpy.at(0).at(1).toString(), QString("Modified title"));

        // Test cancel
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "startEditing", Q_RETURN_ARG(QVariant, startResult)));
        QVERIFY(startResult.toBool());
        preview->setProperty("editTitle", "Discarded title");
        QVERIFY(preview->property("isDirty").toBool());
        QVariant cancelResult;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "cancelEditing", Q_RETURN_ARG(QVariant, cancelResult)));
        QVERIFY(cancelResult.toBool());
        QVERIFY(!preview->property("isEditing").toBool());
        QCOMPARE(preview->property("editTitle").toString(), QString("Modified title"));
        QCOMPARE(controller.savePageCount, 1);

        // Test save failure
        controller.saveShouldFail = true;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "startEditing", Q_RETURN_ARG(QVariant, startResult)));
        preview->setProperty("editTitle", "Failing title");
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "saveEdits", Q_RETURN_ARG(QVariant, saveResult)));
        QVERIFY(!saveResult.toBool());
        QVERIFY(preview->property("isEditing").toBool());
        QVERIFY(preview->property("statusMessage").toString().contains("Failed"));
    }

    void floatingPagePreviewReportsPartialSaveWhenDescriptionPersistenceFails() {
        QQmlEngine engine;
        MockPageCreationController controller;
        controller.descriptionSaveShouldFail = true;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesPageReferencePreview.qml")));
        QScopedPointer<QObject> preview(component.create());
        QVERIFY2(preview, qPrintable(component.errorString()));
        preview->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        preview->setProperty("pageId", "page-one");

        QVariant result;
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "loadPage", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        QVERIFY(QMetaObject::invokeMethod(preview.data(), "startEditing", Q_RETURN_ARG(QVariant, result)));
        QVERIFY(result.toBool());
        preview->setProperty("editTitle", "Saved title");
        preview->setProperty("editDescription", "Unsaved description");
        preview->setProperty("editContent", "Saved content");
        QSignalSpy savedSpy(preview.data(), SIGNAL(pageSaved(QString, QString)));

        QVERIFY(QMetaObject::invokeMethod(preview.data(), "saveEdits", Q_RETURN_ARG(QVariant, result)));

        QVERIFY(!result.toBool());
        QVERIFY(preview->property("isEditing").toBool());
        QVERIFY(!preview->property("isSaving").toBool());
        QVERIFY(preview->property("statusMessage").toString().contains("Failed"));
        QCOMPARE(preview->property("editTitle").toString(), QString("Saved title"));
        QCOMPARE(preview->property("editDescription").toString(), QString("Unsaved description"));
        QCOMPARE(preview->property("editContent").toString(), QString("Saved content"));
        QCOMPARE(controller.currentTitle, QString("Saved title"));
        QCOMPARE(controller.currentContent, QString("Saved content"));
        QCOMPARE(controller.currentDescription, QString("Target description"));
        QCOMPARE(savedSpy.count(), 1);
    }

    void reactPageReferenceMarkupRoundTripsAndRejectsUnsafeIds() {
        NotesTextOperations operations;
        const QVariantList pages = {QVariantMap{
            {"id", "page-one"}, {"title", "Target & page"}, {"icon", "📄"}
        }};
        const QString source = QStringLiteral(
            "<p>Before<span data-page-id=\"page-one\" title=\"Stored title\" class=\"page-reference\"></span>After</p>");
        QVERIFY(operations.supportsRichSource(source));

        const QString editorSource = operations.richSourceForEditorWithPages(source, pages);
        QVERIFY2(editorSource.contains("href=\"synapse-page:/page-one?title=Target%20%26%20page\""),
                 qPrintable(editorSource));
        QVERIFY(editorSource.contains("↗ Target &amp; page"));
        QCOMPARE(operations.richPageReferenceId(QStringLiteral(
                     "synapse-page:/page-one?title=Target%20%26%20page")), QString("page-one"));
        QVERIFY(operations.richPageReferenceId(QStringLiteral("javascript:alert(1)")).isEmpty());
        QVERIFY(operations.richPageReferenceId(QStringLiteral(
            "synapse-page://unexpected-host/page-one?title=Target")).isEmpty());
        QVERIFY(!operations.supportsRichSource(QStringLiteral(
            "<p><span data-page-id=\"javascript:alert(1)\" title=\"bad\"></span></p>")));

        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.setData("import QtQuick\nTextEdit { textFormat: TextEdit.RichText }", QUrl());
        QScopedPointer<QObject> editor(component.create());
        QVERIFY2(editor, qPrintable(component.errorString()));
        editor->setProperty("text", editorSource);
        auto *document = qobject_cast<QQuickTextDocument *>(editor->property("textDocument").value<QObject *>());
        QVERIFY(document);
        const QVariantMap saved = operations.serializeRich(document);
        QVERIFY2(saved.value("ok").toBool(), qPrintable(document->textDocument()->toHtml()));
        QCOMPARE(saved.value("html").toString(), QStringLiteral(
            "<p>Before<span data-page-id=\"page-one\" title=\"Target &amp; page\"></span>After</p>"));

        const QString deletedSource = operations.richSourceForEditorWithPages(
            QStringLiteral("<p><span data-page-id=\"removed-page\" title=\"Old title\"></span></p>"), pages);
        QVERIFY(deletedSource.contains("⚠ Old title (Deleted)"));
        QVERIFY(deletedSource.contains("background-color:rgba(239,68,68,0.08)"));
        editor->setProperty("text", deletedSource);
        const QVariantMap deletedSaved = operations.serializeRich(document);
        QVERIFY2(deletedSaved.value("ok").toBool(), qPrintable(document->textDocument()->toHtml()));
        QCOMPARE(deletedSaved.value("html").toString(), QStringLiteral(
            "<p><span data-page-id=\"removed-page\" title=\"Old title\"></span></p>"));
    }


};

int runNativeNotesPageReferenceQmlTest(int argc, char **argv) {
    NativeNotesPageReferenceQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_reference_qml_test.moc"
