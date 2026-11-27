#include "controllers/notes/notes_text_operations.h"

#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QUrl>
#include <QtQuick/QQuickItem>
#include <QtTest/QtTest>

class NotesPageSwitchAudioPlayer : public QQuickItem {
    Q_OBJECT
    Q_PROPERTY(QString source READ source WRITE setSource NOTIFY sourceChanged)
    Q_PROPERTY(double position READ position WRITE setPosition NOTIFY positionChanged)
    Q_PROPERTY(double duration READ duration NOTIFY durationChanged)
    Q_PROPERTY(bool paused READ paused WRITE setPaused NOTIFY pausedChanged)
    Q_PROPERTY(bool muted READ muted WRITE setMuted NOTIFY mutedChanged)
    Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY volumeChanged)

public:
    QString source() const { return m_source; }
    double position() const { return m_position; }
    double duration() const { return 0; }
    bool paused() const { return m_paused; }
    bool muted() const { return m_muted; }
    double volume() const { return m_volume; }
    void setSource(const QString &value) { m_source = value; emit sourceChanged(); }
    Q_INVOKABLE void setPosition(double value) { m_position = value; emit positionChanged(); }
    void setPaused(bool value) { m_paused = value; emit pausedChanged(); }
    void setMuted(bool value) { m_muted = value; emit mutedChanged(); }
    void setVolume(double value) { m_volume = value; emit volumeChanged(); }
    Q_INVOKABLE void pause() { setPaused(true); }
    Q_INVOKABLE void play() { setPaused(false); }

signals:
    void sourceChanged();
    void positionChanged();
    void durationChanged();
    void pausedChanged();
    void mutedChanged();
    void volumeChanged();
    void endOfFile();
    void playbackError(const QString &message);

private:
    QString m_source;
    double m_position = 0;
    double m_volume = 100;
    bool m_paused = true;
    bool m_muted = false;
};

class PageSwitchTestController final : public QObject {
    Q_OBJECT

public:
    int saveCalls = 0;
    bool failNextSave = false;
    bool conflictNextSave = false;
    QString latestPageTwoContent = QStringLiteral("<p>Saved page two</p>");
    QString latestPageTwoTimestamp = QStringLiteral("2026-11-01T00:00:00Z");
    QString lastSavedPageId;
    QString lastSavedContent;
    QString lastExpectedTimestamp;

    Q_INVOKABLE QVariantList getPageTree(const QString &) const {
        return {page("page-one", "<p>Saved page one</p>", "2026-11-01T00:00:00Z"),
                page("page-two", latestPageTwoContent, latestPageTwoTimestamp)};
    }

    Q_INVOKABLE QVariantList getPinnedPages() const { return {}; }

    Q_INVOKABLE QVariantMap getPage(const QString &pageId) const {
        if (pageId == QStringLiteral("page-one")) {
            return page(pageId, "<p>Saved page one</p>", "2026-11-01T00:00:00Z");
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

private slots:
    void failedSaveKeepsCurrentPageAndAllowsRetry() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        PageSwitchTestController controller;
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

    void conflictCanKeepLocalOrLoadSavedVersionBeforeNavigating() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        PageSwitchTestController controller;
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
    qmlRegisterType<NotesPageSwitchAudioPlayer>("Synapse.Media", 1, 0, "MpvPlayerItem");
    qmlRegisterType<NotesPageSwitchAudioPlayer>("Synapse.Media", 1, 0, "MpvVideoPlayer");
    NativeNotesPageSwitchTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_switch_test.moc"
