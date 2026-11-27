#include "controllers/notes/notes_text_operations.h"
#include "native_notes_page_switch_test_support.h"

#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QUrl>
#include <QtQuick/QQuickItem>
#include <QtTest/QtTest>

class PageSwitchTestController final : public QObject {
    Q_OBJECT

public:
    int saveCalls = 0;
    bool failNextSave = false;
    bool failNextDelete = false;
    bool conflictNextSave = false;
    int deleteCalls = 0;
    QString latestPageTwoContent = QStringLiteral("<p>Saved page two</p>");
    QString latestPageTwoTimestamp = QStringLiteral("2026-11-01T00:00:00Z");
    QString lastSavedPageId;
    QString lastSavedContent;
    QString lastExpectedTimestamp;

    Q_INVOKABLE QVariantList getPageTree(const QString &) const {
        return {page("page-one", "", "2026-11-01T00:00:00Z"),
                page("page-two", latestPageTwoContent, latestPageTwoTimestamp)};
    }

    Q_INVOKABLE QVariantList getPinnedPages() const { return {}; }

    Q_INVOKABLE QVariantList parseNoteBlocks(const QString &content) const {
        if (content.isEmpty()) return {};
        return {QVariantMap{{QStringLiteral("blockType"), QStringLiteral("richText")}}};
    }

    Q_INVOKABLE bool deleteFile(const QString &) {
        ++deleteCalls;
        if (failNextDelete) {
            failNextDelete = false;
            return false;
        }
        return true;
    }

    Q_INVOKABLE QVariantMap getPage(const QString &pageId) const {
        if (pageId == QStringLiteral("page-one")) {
            return page(pageId, "", "2026-11-01T00:00:00Z");
        }
        if (pageId == QStringLiteral("page-two")) {
            return page(pageId, latestPageTwoContent, latestPageTwoTimestamp);
        }
        return {};
    }

    Q_INVOKABLE bool savePage(const QString &pageId, const QString &, const QString &content,
                              const QString &, const QString &expectedTimestamp) {
        ++saveCalls;
        lastSavedPageId = pageId;
        lastSavedContent = content;
        lastExpectedTimestamp = expectedTimestamp;
        if (conflictNextSave) {
            conflictNextSave = false;
            latestPageTwoContent = QStringLiteral("<p>Remote page two edit</p>");
            latestPageTwoTimestamp = QStringLiteral("2026-11-02T00:00:00Z");
            emit pageConflictDetected(pageId, latestPageTwoContent);
            return false;
        }
        if (failNextSave) {
            failNextSave = false;
            return false;
        }
        if (pageId == QStringLiteral("page-two")) {
            latestPageTwoContent = content;
            latestPageTwoTimestamp = QStringLiteral("2026-11-03T00:00:00Z");
        }
        return true;
    }

    Q_INVOKABLE QVariantList getPageHistory(const QString &) const { return {}; }
    Q_INVOKABLE QString createSubPage(const QString &, const QString &, const QString &) { return {}; }
    Q_INVOKABLE bool updatePageDescription(const QString &, const QString &) { return true; }
    Q_INVOKABLE bool deletePage(const QString &) { return true; }
    Q_INVOKABLE void togglePinPage(const QString &) {}

signals:
    void pageConflictDetected(const QString &pageId, const QString &externalContent);
    void libraryPdfPageReady(const QVariantMap &result);

private:
    static QVariantMap page(const QString &id, const QString &content, const QString &updatedAt) {
        return {{QStringLiteral("id"), id},
                {QStringLiteral("title"), id},
                {QStringLiteral("description"), QString()},
                {QStringLiteral("content"), content},
                {QStringLiteral("parent_id"), QString()},
                {QStringLiteral("sort_order"), 0},
                {QStringLiteral("icon"), QStringLiteral("📄")},
                {QStringLiteral("cover_image"), QString()},
                {QStringLiteral("updated_at"), updatedAt}};
    }
};

class NativeNotesPageSwitchTest final : public QObject {
    Q_OBJECT

    static QObject *createPageView(QQmlEngine &engine, NotesTextOperations &textOperations,
                                   PageSwitchTestController &controller, QString &componentError) {
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
        QObject *pageView = component.create();
        if (!pageView) componentError = component.errorString();
        return pageView;
    }

private slots:
    void failedSaveKeepsCurrentPageAndAllowsRetry() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        PageSwitchTestController controller;
        QString componentError;
        QScopedPointer<QObject> pageView(createPageView(engine, textOperations, controller, componentError));
        QVERIFY2(pageView, qPrintable(componentError));
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        QTRY_COMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));

        const QString localEdit = QStringLiteral("<p>Local unsaved edit</p>");
        pageView->setProperty("activeContent", localEdit);
        pageView->setProperty("isDirty", true);
        pageView->setProperty("saveStatus", QStringLiteral("dirty"));
        controller.failNextSave = true;

        QVariant selectionResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-two")))));
        QVERIFY(!selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));
        QCOMPARE(pageView->property("activeContent").toString(), localEdit);
        QVERIFY(pageView->property("isDirty").toBool());
        QCOMPARE(pageView->property("saveStatus").toString(), QStringLiteral("error"));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-two")))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(controller.lastSavedContent, localEdit);
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-two"));
    }

    void failedFileTrashAfterSavedNoteDoesNotBlockNavigationAndRetries() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        PageSwitchTestController controller;
        QString componentError;
        QScopedPointer<QObject> pageView(createPageView(engine, textOperations, controller, componentError));
        QVERIFY2(pageView, qPrintable(componentError));
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        QTRY_COMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));

        pageView->setProperty("activeContent", QString());
        pageView->setProperty("isDirty", true);
        QVariant queueResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "queueFileTrashAfterSave",
                                          Q_RETURN_ARG(QVariant, queueResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("file-one")))));
        QVERIFY(queueResult.toBool());
        QVariant referenceResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "noteReferencesFile",
                                          Q_RETURN_ARG(QVariant, referenceResult),
                                          Q_ARG(QVariant, QVariant(QString())),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("file-one")))));
        QVERIFY(referenceResult.isValid());
        QVERIFY(!referenceResult.toBool());
        controller.failNextDelete = true;

        QVariant selectionResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-two")))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-two"));
        QVERIFY(!pageView->property("isDirty").toBool());
        QVariantList pending = pageView->property("pendingFileTrashAfterSaveRequests").toList();
        QCOMPARE(pending.size(), 1);
        QCOMPARE(pending.first().toMap().value(QStringLiteral("pageId")).toString(),
                 QStringLiteral("page-one"));
        QCOMPARE(pending.first().toMap().value(QStringLiteral("fileId")).toString(),
                 QStringLiteral("file-one"));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(controller.deleteCalls, 2);
        QVERIFY(pageView->property("pendingFileTrashAfterSaveRequests").toList().isEmpty());
    }

    void conflictCanKeepLocalOrLoadSavedVersionBeforeNavigating() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        PageSwitchTestController controller;
        QString componentError;
        QScopedPointer<QObject> pageView(createPageView(engine, textOperations, controller, componentError));
        QVERIFY2(pageView, qPrintable(componentError));
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        QTRY_COMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-two")))));

        const QString localEdit = QStringLiteral("<p>My local conflict edit</p>");
        pageView->setProperty("activeContent", localEdit);
        pageView->setProperty("isDirty", true);
        pageView->setProperty("saveStatus", QStringLiteral("dirty"));
        controller.conflictNextSave = true;
        QVariant selectionResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QVERIFY(!selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-two"));
        QCOMPARE(pageView->property("activeContent").toString(), localEdit);
        QVERIFY(pageView->property("pageConflictDialogOpen").toBool());

        QVariant choiceResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "keepLocalVersionAfterConflict",
                                          Q_RETURN_ARG(QVariant, choiceResult)));
        QVERIFY(choiceResult.toBool());
        QVERIFY(pageView->property("isDirty").toBool());
        QCOMPARE(pageView->property("activeContent").toString(), localEdit);
        QCOMPARE(pageView->property("activeUpdatedAt").toString(), controller.latestPageTwoTimestamp);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-two")))));
        pageView->setProperty("activeContent", QStringLiteral("<p>Discard this conflict</p>"));
        pageView->setProperty("isDirty", true);
        controller.conflictNextSave = true;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QVERIFY(!selectionResult.toBool());
        QVERIFY(pageView->property("pageConflictDialogOpen").toBool());

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "loadSavedVersionAfterConflict",
                                          Q_RETURN_ARG(QVariant, choiceResult)));
        QVERIFY(choiceResult.toBool());
        QCOMPARE(pageView->property("activeContent").toString(), QStringLiteral("<p>Remote page two edit</p>"));
        QVERIFY(!pageView->property("isDirty").toBool());
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("page-one")))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), QStringLiteral("page-one"));
    }


};

int runNativeNotesPageSwitchTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesPageSwitchTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_switch_test.moc"
