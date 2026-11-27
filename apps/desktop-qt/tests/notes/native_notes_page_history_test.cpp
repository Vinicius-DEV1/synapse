#include "controllers/notes/notes_text_operations.h"
#include "native_notes_page_switch_test_support.h"
#include "synapse_controller.h"

#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QRegularExpression>
#include <QtCore/QDateTime>
#include <QtCore/QUrl>
#include <QtGui/QColor>
#include <QtGui/QFont>
#include <QtGui/QAccessible>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QtTest>

class NotesPageHistoryController final : public QObject {
    Q_OBJECT

public:
    bool failNextSave = false;
    int saveCalls = 0;
    QString lastSavedContent;
    QVariantList historyEntries;

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

    Q_INVOKABLE QVariantList getPageHistory(const QString &) const { return historyEntries; }
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

class NotesDeleteDialogController final : public QObject {
    Q_OBJECT

public:
    Q_INVOKABLE QVariantList getPageTree(const QString &) const {
        return {
            QVariantMap{{QStringLiteral("id"), QStringLiteral("page-one")},
                        {QStringLiteral("parent_id"), QString()},
                        {QStringLiteral("title"), QStringLiteral("page-one")}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("child-one")},
                        {QStringLiteral("parent_id"), QStringLiteral("page-one")},
                        {QStringLiteral("title"), QStringLiteral("child-one")}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("page-two")},
                        {QStringLiteral("parent_id"), QString()},
                        {QStringLiteral("title"), QStringLiteral("page-two")}},
        };
    }

    Q_INVOKABLE QVariantList getCalendarEvents() const {
        const QString future = QDateTime::currentDateTimeUtc().addDays(2).toString(Qt::ISODate);
        const QString past = QDateTime::currentDateTimeUtc().addDays(-2).toString(Qt::ISODate);
        return {
            QVariantMap{{QStringLiteral("id"), QStringLiteral("root-event")},
                        {QStringLiteral("title"), QStringLiteral("Root event")},
                        {QStringLiteral("page_id"), QStringLiteral("page-one")},
                        {QStringLiteral("start_date"), future}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("child-event")},
                        {QStringLiteral("title"), QStringLiteral("Child event")},
                        {QStringLiteral("page_id"), QStringLiteral("child-one")},
                        {QStringLiteral("start_date"), future}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("inline-event")},
                        {QStringLiteral("title"), QStringLiteral("Inline event")},
                        {QStringLiteral("start_date"), future}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("expired-event")},
                        {QStringLiteral("title"), QStringLiteral("Expired event")},
                        {QStringLiteral("page_id"), QStringLiteral("page-one")},
                        {QStringLiteral("start_date"), past}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("unrelated-event")},
                        {QStringLiteral("title"), QStringLiteral("Unrelated event")},
                        {QStringLiteral("page_id"), QStringLiteral("page-two")},
                        {QStringLiteral("start_date"), future}},
        };
    }
};

class NativeNotesPageHistoryTest final : public QObject {
    Q_OBJECT

    static QQuickItem *findVisualItem(QQuickItem *root, const QString &objectName) {
        if (!root) return nullptr;
        for (QQuickItem *child : root->childItems()) {
            if (child->objectName() == objectName) return child;
            if (QQuickItem *match = findVisualItem(child, objectName)) return match;
        }
        return nullptr;
    }

private slots:
    void deleteDialogListsUpcomingSubtreeEvents() {
        QQmlEngine engine;
        NotesDeleteDialogController controller;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/notes/NotesDeleteDialog.qml")));
        QScopedPointer<QObject> dialog(component.create());
        QVERIFY2(dialog, qPrintable(component.errorString()));
        QQuickWindow window;
        window.resize(640, 480);
        QVERIFY(dialog->property("parent").isValid());
        dialog->setProperty("parent", QVariant::fromValue(window.contentItem()));
        window.show();
        QTRY_VERIFY(window.isVisible());
        dialog->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        dialog->setProperty("selectedPageId", QStringLiteral("page-one"));
        dialog->setProperty("noteTitle", QStringLiteral("page-one"));
        dialog->setProperty("pageList", QVariant::fromValue(controller.getPageTree(QString())));
        dialog->setProperty("activeContent", QStringLiteral("<div data-event-id=\"inline-event\"></div>"));

        QVERIFY(QMetaObject::invokeMethod(dialog.data(), "openForPage", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one"))),
                                          Q_ARG(QVariant, QVariant(QString()))));
        QTRY_VERIFY(dialog->property("visible").toBool());
        QTRY_VERIFY(dialog->property("width").toReal() > 0.0);
        QTRY_VERIFY(dialog->property("height").toReal() > 0.0);
        QCOMPARE(dialog->property("activeEvents").toList().size(), 3);
        QCOMPARE(dialog->property("hasActiveEvents").toBool(), true);

        QObject *warning = dialog->findChild<QObject *>(QStringLiteral("notesDeleteEventsWarning"));
        QVERIFY(warning);
        QObject *confirmButton = dialog->findChild<QObject *>(QStringLiteral("notesDeleteConfirmButton"));
        QVERIFY(confirmButton);
        QVERIFY(confirmButton->property("text").toString().contains(QStringLiteral("3 evento(s)")));
        QObject *eventList = dialog->findChild<QObject *>(QStringLiteral("notesDeleteEventList"));
        QVERIFY(eventList);
        QCOMPARE(eventList->property("count").toInt(), 3);
        QObject *cancelButton = dialog->findChild<QObject *>(QStringLiteral("notesDeleteCancelButton"));
        QVERIFY(cancelButton);
        QVERIFY(QMetaObject::invokeMethod(cancelButton, "clicked", Qt::DirectConnection));
        QTRY_VERIFY(!dialog->property("visible").toBool());
    }

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

        controller.historyEntries = {
            QVariantMap{{QStringLiteral("id"), QStringLiteral("current")},
                        {QStringLiteral("content"), QStringLiteral("<p>Current page</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-02T18:00:00Z")}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("older")},
                        {QStringLiteral("content"), QStringLiteral("<p>Older page</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-01T18:00:00Z")}},
        };
        QQuickWindow window;
        window.resize(1280, 900);
        auto *pageViewItem = qobject_cast<QQuickItem *>(pageView.data());
        QVERIFY(pageViewItem);
        pageViewItem->setWidth(1280);
        pageViewItem->setHeight(900);
        pageViewItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());
        QQuickItem *pageViewModalsHost = pageViewItem->findChild<QQuickItem *>(QStringLiteral("pageViewModalsHost"));
        QTRY_VERIFY(pageViewModalsHost);
        QTRY_COMPARE(qRound(pageViewModalsHost->width()), 1280);
        QTRY_COMPARE(qRound(pageViewModalsHost->height()), 900);
        QQuickItem *historyAction = nullptr;
        QTRY_VERIFY((historyAction = findVisualItem(pageViewItem, QStringLiteral("pageHeaderAction-history"))));
        QTRY_VERIFY(historyAction->isVisible());
        historyAction->forceActiveFocus();
        QVERIFY(historyAction->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_VERIFY(pageView->property("isHistoryOpen").toBool());
        QObject *historyModal = pageView->findChild<QObject *>(QStringLiteral("pageHistoryModal"));
        QVERIFY(historyModal);
        QTRY_COMPARE(qRound(historyModal->property("width").toReal()), 1280);
        QTRY_COMPARE(qRound(historyModal->property("height").toReal()), 900);
        QCOMPARE(pageView->property("pageHistoryEntries").toList().size(), 2);
        QQuickItem *currentHistoryRevision = nullptr;
        QTRY_VERIFY_WITH_TIMEOUT((currentHistoryRevision = findVisualItem(pageViewItem, QStringLiteral("historyRevisionCard-0"))), 2000);
        QTRY_VERIFY(currentHistoryRevision->hasActiveFocus());
        QVERIFY(findVisualItem(pageViewItem, QStringLiteral("historyRevisionCard-1")));
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_VERIFY(!pageView->property("isHistoryOpen").toBool());
        QTRY_VERIFY(historyAction->hasActiveFocus());

        QVERIFY(QMetaObject::invokeMethod(pageViewModalsHost, "openMoveFor",
                                          Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QObject *movePageModal = pageView->findChild<QObject *>(QStringLiteral("movePageModal"));
        QVERIFY(movePageModal);
        QTRY_VERIFY(movePageModal->property("visible").toBool());
        QTRY_VERIFY(movePageModal->property("width").toReal() > 0.0);
        QTRY_VERIFY(movePageModal->property("height").toReal() > 0.0);
        QObject *moveHeader = pageView->findChild<QObject *>(QStringLiteral("movePageModalHeader"));
        QVERIFY(moveHeader);
        QCOMPARE(moveHeader->property("sourceTitle").toString(), QStringLiteral("page-one"));
        QCOMPARE(moveHeader->property("currentLocation").toString(), QStringLiteral("Raiz (Início)"));
        QObject *moveSearch = pageView->findChild<QObject *>(QStringLiteral("movePageSearchField"));
        QVERIFY(moveSearch);
        QObject *moveFooter = pageView->findChild<QObject *>(QStringLiteral("movePageModalFooter"));
        QVERIFY(moveFooter);
        QCOMPARE(moveFooter->property("selectedLocation").toString(), QStringLiteral("Raiz (Início)"));
        QObject *confirmMoveButton = pageView->findChild<QObject *>(QStringLiteral("confirmMoveButton"));
        QVERIFY(confirmMoveButton);
        QVERIFY(!confirmMoveButton->property("enabled").toBool());
        movePageModal->setProperty("selectedTargetId", QStringLiteral("page-two"));
        QTRY_VERIFY(confirmMoveButton->property("enabled").toBool());
        movePageModal->setProperty("selectedTargetId", QString());
        QTRY_VERIFY(!confirmMoveButton->property("enabled").toBool());
        QVERIFY(QMetaObject::invokeMethod(movePageModal, "close", Qt::DirectConnection));
        QTRY_VERIFY(!movePageModal->property("visible").toBool());
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

        QVariant timestamp;
        QVERIFY(QMetaObject::invokeMethod(modal.data(), "formatTimestamp",
                                          Q_RETURN_ARG(QVariant, timestamp),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("2026-09-02T18:00:00Z")))));
        QVERIFY(QRegularExpression(QStringLiteral("^\\d{2} de ")).match(timestamp.toString()).hasMatch());
        QVERIFY(timestamp.toString().contains(QStringLiteral(" de 2026, ")));
        QVERIFY(timestamp.toString().contains(QRegularExpression(QStringLiteral("\\d{2}:\\d{2}:\\d{2}"))));

        QVERIFY(QMetaObject::invokeMethod(modal.data(), "formatTimestamp",
                                          Q_RETURN_ARG(QVariant, timestamp),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("2026-09-02")))));
        QVERIFY(timestamp.toString().startsWith(QStringLiteral("02 de ")));
    }

    void historyContentUsesReactCanvasWidthAndTypography() {
        QQmlEngine engine;
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
            {QStringLiteral("textDark"), QStringLiteral("#fffffe")},
            {QStringLiteral("textMuted"), QStringLiteral("#71717a")},
            {QStringLiteral("fontMono"), QStringLiteral("monospace")},
        });
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/notes/PageHistoryModal.qml")));
        QScopedPointer<QObject> modal(component.create());
        QVERIFY2(modal, qPrintable(component.errorString()));
        auto *modalItem = qobject_cast<QQuickItem *>(modal.data());
        QVERIFY(modalItem);
        QQuickItem viewport;
        viewport.setWidth(1280);
        viewport.setHeight(900);
        modalItem->setParentItem(&viewport);
        modal->setProperty("history", QVariant::fromValue(QVariantList{
            QVariantMap{{QStringLiteral("id"), QStringLiteral("current")},
                        {QStringLiteral("content"), QStringLiteral("<p>Current revision</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-02T18:00:00Z")}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("older")},
                        {QStringLiteral("content"), QStringLiteral("<p>Older revision</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-01T18:00:00Z")}},
        }));
        modal->setProperty("visible", true);

        QQuickItem *canvas = modal->findChild<QQuickItem *>(QStringLiteral("historyCanvasColumn"));
        QTRY_VERIFY(canvas);
        QTRY_COMPARE(qRound(canvas->width()), 672);
        QQuickItem *scrollContent = canvas->parentItem();
        QVERIFY(scrollContent);
        QCOMPARE(qRound(canvas->x() + canvas->width() / 2), qRound(scrollContent->width() / 2));
        QQuickItem *revisionContent = modal->findChild<QQuickItem *>(QStringLiteral("historyRevisionContent"));
        QVERIFY(revisionContent);
        QTRY_COMPARE(qRound(revisionContent->width()), 672);
        const QFont bodyFont = qvariant_cast<QFont>(revisionContent->property("font"));
        QCOMPARE(bodyFont.pixelSize(), 16);
        const QColor bodyColor = qvariant_cast<QColor>(revisionContent->property("color"));
        QCOMPARE(bodyColor, QColor(QStringLiteral("#e4e4e7")));
        QQuickItem *revisionCard = nullptr;
        QTRY_VERIFY((revisionCard = findVisualItem(modalItem, QStringLiteral("historyRevisionCard-0"))));
        QQuickItem *revisionTitle = findVisualItem(modalItem, QStringLiteral("historyRevisionTitle"));
        QQuickItem *revisionTimestamp = findVisualItem(modalItem, QStringLiteral("historyRevisionTimestamp"));
        QVERIFY(revisionTitle && revisionTimestamp);
        QVERIFY(revisionTitle->parentItem());
        QCOMPARE(qRound(revisionTitle->parentItem()->x()), 14);
        QCOMPARE(qRound(revisionTitle->parentItem()->y()), 14);
        QCOMPARE(qRound(revisionCard->height()), qRound(revisionTitle->parentItem()->height() + 28));
        QCOMPARE(qvariant_cast<QFont>(revisionTitle->property("font")).pixelSize(), 12);
        QCOMPARE(qvariant_cast<QFont>(revisionTimestamp->property("font")).pixelSize(), 11);

        modal->setProperty("history", QVariant::fromValue(QVariantList{}));
        QQuickItem *emptyState = modal->findChild<QQuickItem *>(QStringLiteral("historyEmptyState"));
        QTRY_VERIFY(emptyState && emptyState->isVisible());
        QQuickItem *listArea = modal->findChild<QQuickItem *>(QStringLiteral("historyRevisionListArea"));
        QVERIFY(listArea);
        QCOMPARE(qRound(emptyState->x() + emptyState->width() / 2), qRound(listArea->width() / 2));
        QCOMPARE(qRound(emptyState->y() + emptyState->height() / 2), qRound(listArea->height() / 2));
    }




};

int runNativeNotesPageHistoryTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesPageHistoryTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_history_test.moc"
