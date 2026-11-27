#include "controllers/notes/notes_text_operations.h"
#include "native_notes_page_switch_test_support.h"
#include "synapse_controller.h"

#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QUrl>
#include <QtTest/QtTest>

class NotesPageHistoryController final : public QObject {
    Q_OBJECT

public:
    bool failNextSave = false;
    int saveCalls = 0;
    QString lastSavedContent;

    Q_INVOKABLE QVariantList getPageTree(const QString &) const {
        return {page(QStringLiteral("page-one"), QStringLiteral("<p>Current content</p>")),
                page(QStringLiteral("page-two"), QStringLiteral("<p>Other page</p>"))};
    }

    Q_INVOKABLE QVariantList getPinnedPages() const { return {}; }

    Q_INVOKABLE QVariantMap getPage(const QString &pageId) const {
        if (pageId == QStringLiteral("page-one"))
            return page(pageId, QStringLiteral("<p>Current content</p>"));
        if (pageId == QStringLiteral("page-two"))
            return page(pageId, QStringLiteral("<p>Other page</p>"));
        return {};
    }

    Q_INVOKABLE bool savePage(const QString &, const QString &, const QString &content,
                              const QString &, const QString &) {
        ++saveCalls;
        if (failNextSave) {
            failNextSave = false;
            return false;
        }
        lastSavedContent = content;
        return true;
    }

    Q_INVOKABLE QVariantList getPageHistory(const QString &) const { return {}; }
    Q_INVOKABLE QVariantList parseNoteBlocks(const QString &content) const {
        return content.isEmpty() ? QVariantList{}
            : QVariantList{QVariantMap{{QStringLiteral("blockType"), QStringLiteral("richText")}}};
    }
    Q_INVOKABLE QString createSubPage(const QString &, const QString &, const QString &) { return {}; }
    Q_INVOKABLE bool updatePageDescription(const QString &, const QString &) { return true; }
    Q_INVOKABLE bool deletePage(const QString &) { return true; }
    Q_INVOKABLE bool deleteFile(const QString &) { return true; }
    Q_INVOKABLE void togglePinPage(const QString &) {}

signals:
    void libraryPdfPageReady(const QVariantMap &result);

private:
    static QVariantMap page(const QString &id, const QString &content) {
        return {{QStringLiteral("id"), id},
                {QStringLiteral("title"), id},
                {QStringLiteral("description"), QString()},
                {QStringLiteral("content"), content},
                {QStringLiteral("parent_id"), QString()},
                {QStringLiteral("sort_order"), 0},
                {QStringLiteral("icon"), QStringLiteral("📄")},
                {QStringLiteral("cover_image"), QString()},
                {QStringLiteral("updated_at"), QStringLiteral("2026-11-01T00:00:00Z")}};
    }
};

class NativeNotesPageHistoryTest final : public QObject {
    Q_OBJECT

private slots:
    void failedRestoreSaveKeepsRevisionDirtyForRetry() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        NotesPageHistoryController controller;
        engine.rootContext()->setContextProperty(QStringLiteral("notesTextOperations"), &textOperations);
        engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &controller);
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("bgDarkBg"), QStringLiteral("#0f0e17")},
            {QStringLiteral("fontFamily"), QStringLiteral("Inter, sans-serif")},
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
            {QStringLiteral("textDark"), QStringLiteral("#fffffe")},
            {QStringLiteral("brand600"), QStringLiteral("#7c3aed")},
            {QStringLiteral("textMuted"), QStringLiteral("#71717a")},
            {QStringLiteral("fontMono"), QStringLiteral("monospace")},
        });
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> pageView(component.create());
        QVERIFY2(pageView, qPrintable(component.errorString()));
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        QTRY_COMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));

        const QString restoredContent = QStringLiteral("<p>Restored revision</p>");
        controller.failNextSave = true;
        QVariant restored;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "restoreHistoryRevision",
                                          Q_RETURN_ARG(QVariant, restored),
                                          Q_ARG(QVariant, QVariant(restoredContent))));
        QVERIFY(!restored.toBool());
        QCOMPARE(pageView->property("activeContent").toString(), restoredContent);
        QVERIFY(pageView->property("isDirty").toBool());
        QCOMPARE(pageView->property("saveStatus").toString(), QStringLiteral("error"));
        QVERIFY(!pageView->property("isHistoryOpen").toBool());

        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote",
                                          Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        QCOMPARE(controller.lastSavedContent, restoredContent);
        QVERIFY(!pageView->property("isDirty").toBool());
    }

    void richHtmlHistoryDiffDisplaysTextWithoutMarkup() {
        SynapseDataController controller(nullptr, false);
        QQmlEngine engine;
        engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &controller);
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("bgDarkBg"), QStringLiteral("#0f0e17")},
            {QStringLiteral("fontFamily"), QStringLiteral("Inter, sans-serif")},
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
            {QStringLiteral("textDark"), QStringLiteral("#fffffe")},
            {QStringLiteral("brand600"), QStringLiteral("#7c3aed")},
            {QStringLiteral("textMuted"), QStringLiteral("#71717a")},
            {QStringLiteral("fontMono"), QStringLiteral("monospace")},
        });
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/notes/PageHistoryModal.qml")));
        QScopedPointer<QObject> modal(component.create());
        QVERIFY2(modal, qPrintable(component.errorString()));
        modal->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));

        QVariant diff;
        QVERIFY(QMetaObject::invokeMethod(modal.data(), "computeDiffHtml",
                                          Q_RETURN_ARG(QVariant, diff),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("<p>One stable word</p>"))),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("<p>One changed word</p>")))));
        const QString renderedDiff = diff.toString();
        QVERIFY(renderedDiff.contains(QStringLiteral("One")));
        QVERIFY(renderedDiff.contains(QStringLiteral("stable")));
        QVERIFY(renderedDiff.contains(QStringLiteral("changed")));
        QVERIFY(!renderedDiff.contains(QStringLiteral("&lt;")));
    }
};

int runNativeNotesPageHistoryTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesPageHistoryTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_history_test.moc"
