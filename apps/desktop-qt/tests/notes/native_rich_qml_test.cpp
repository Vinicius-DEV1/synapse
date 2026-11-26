#include "controllers/notes/notes_text_operations.h"
#include "native_notes_mock_controller.h"

#include <QtGui/QGuiApplication>
#include <QtCore/QCoreApplication>
#include <QtCore/QHash>
#include <QtCore/QJsonDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQml/qqml.h>
#include <QtCore/QUrl>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

int runNativeNotesCalloutQmlTest(int argc, char **argv);
int runNativeNotesCodeLanguageQmlTest(int argc, char **argv);
int runNativeNotesDividerDragQmlTest(int argc, char **argv);
int runNativeNotesSlashMenuQmlTest(int argc, char **argv);
int runNativeNotesPageReferenceQmlTest(int argc, char **argv);
int runNativeNotesPageReferenceSlashQmlTest(int argc, char **argv);
int runNativeNotesReferenceSearchQmlTest(int argc, char **argv);
int runNativeNotesReferenceActionsQmlTest(int argc, char **argv);
int runNativeNotesRichImagesQmlTest(int argc, char **argv);
int runNativeNotesRichImageMovementQmlTest(int argc, char **argv);
int runNativeNotesRichImageClipboardQmlTest(int argc, char **argv);
int runNativeNotesRichImageDeletionQmlTest(int argc, char **argv);
int runNativeNotesRichImageDropQmlTest(int argc, char **argv);
int runNativeNotesLinkPreviewQmlTest();
int runNativeNotesLinkColorQmlTest(int argc, char **argv);

static QObject *findQuickObject(QQuickItem *parent, const QString &name) {
    if (!parent) return nullptr;
    if (parent->objectName() == name) return parent;
    for (QQuickItem *child : parent->childItems()) {
        if (QObject *match = findQuickObject(child, name)) return match;
    }
    return nullptr;
}

class NotesAudioTestPlayer : public QQuickItem {
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
    double duration() const { return 125.0; }
    bool paused() const { return m_paused; }
    bool muted() const { return m_muted; }
    double volume() const { return m_volume; }
    void setSource(const QString &value) { m_source = value; emit sourceChanged(); }
    void setPosition(double value) { m_position = value; emit positionChanged(); }
    void setPaused(bool value) { m_paused = value; emit pausedChanged(); }
    void setMuted(bool value) { m_muted = value; emit mutedChanged(); }
    void setVolume(double value) { m_volume = value; emit volumeChanged(); }
    Q_INVOKABLE void command(const QVariantList &) {}
    Q_INVOKABLE void play() { setPaused(false); }
    Q_INVOKABLE void pause() { setPaused(true); }
    Q_INVOKABLE void togglePlay() { setPaused(!m_paused); }
    Q_INVOKABLE void seekRelative(double seconds) { setPosition(m_position + seconds); }

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
    bool m_paused = true;
    bool m_muted = false;
    double m_volume = 100;
};

class NotesAudioPreviewTestController final : public QObject {
    Q_OBJECT
public:
    QString requestedFileId;
    QString requestedId;
    QString cancelledId;
    QString closedPath;

    Q_INVOKABLE QVariantMap getFileWidgetMetadata(const QString &fileId) const {
        return {{"id", fileId}, {"name", "Study audio.mp3"}, {"file_size", 2097152}};
    }
    Q_INVOKABLE void previewLocalFile(const QString &fileId, const QString &requestId) {
        requestedFileId = fileId;
        requestedId = requestId;
    }
    Q_INVOKABLE void cancelFilePreview(const QString &requestId) { cancelledId = requestId; }
    Q_INVOKABLE void closeFilePreview(const QString &path) { closedPath = path; }

    void publish(const QVariantMap &result) { emit filePreviewReady(result); }

signals:
    void filePreviewReady(const QVariantMap &result);
    void filePreviewsInvalidated();
};

class NotesFilePreviewTestController final : public QObject {
    Q_OBJECT
public:
    QString requestedFileId;
    QString requestedId;
    QString cancelledId;
    QString closedPath;
    QString closedPdfPath;
    QString exportedFileId;
    QString exportedPath;
    QString renderedPath;
    QString renderedRequestId;
    QString previewTextContent = QStringLiteral("# Preview text");
    QHash<QString, QString> configValues;
    int renderedPage = 0;

    Q_INVOKABLE void previewLocalFile(const QString &fileId, const QString &requestId) {
        requestedFileId = fileId;
        requestedId = requestId;
    }
    Q_INVOKABLE QVariantMap readFilePreviewText(const QString &path) const {
        return path.isEmpty() ? QVariantMap{{"success", false}, {"error", "Missing preview path."}}
                              : QVariantMap{{"success", true}, {"text", previewTextContent}};
    }
    Q_INVOKABLE void renderLibraryPdfPage(const QString &path, int page, int, const QString &requestId) {
        renderedPath = path;
        renderedPage = page;
        renderedRequestId = requestId;
    }
    Q_INVOKABLE void cancelFilePreview(const QString &requestId) { cancelledId = requestId; }
    Q_INVOKABLE void closeFilePreview(const QString &path) { closedPath = path; }
    Q_INVOKABLE void closeLibraryBook(const QString &path) { closedPdfPath = path; }
    Q_INVOKABLE void exportLocalFile(const QString &fileId, const QString &path) {
        exportedFileId = fileId;
        exportedPath = path;
    }
    Q_INVOKABLE QString getConfig(const QString &key, const QString &defaultValue = QString()) const {
        return configValues.value(key, defaultValue);
    }
    Q_INVOKABLE bool setConfig(const QString &key, const QString &value) {
        configValues.insert(key, value);
        return true;
    }

    void publish(const QVariantMap &result) { emit filePreviewReady(result); }
    void publishPdfPage(const QVariantMap &result) { emit notesFilePreviewPdfPageReady(result); }
    void invalidate() { emit filePreviewsInvalidated(); }

signals:
    void filePreviewReady(const QVariantMap &result);
    void notesFilePreviewPdfPageReady(const QVariantMap &result);
    void filePreviewsInvalidated();
    void libraryPdfPageReady(const QVariantMap &result);
    void fileOperationFinished(const QVariantMap &result);
};

class NativeRichQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void notesAudioPreviewCorrelatesAndReleasesItsTemporaryPath() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesAudioPreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        NotesAudioPreviewTestController controller;
        QQuickWindow window;
        window.resize(720, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile",
                                          Q_ARG(QVariant, QString("audio-1")),
                                          Q_ARG(QVariant, QString("Study audio.mp3"))));
        QTRY_VERIFY(root->property("visible").toBool());
        QVERIFY(root->property("loading").toBool());
        QCOMPARE(controller.requestedFileId, QString("audio-1"));
        const QString requestId = root->property("requestId").toString();
        QVERIFY(!requestId.isEmpty());
        QCOMPARE(controller.requestedId, requestId);

        controller.publish({{"success", true}, {"path", "/tmp/protected-audio.mp3"},
                            {"request_id", "stale-request"}});
        QVERIFY(root->property("loading").toBool());
        controller.publish({{"success", true}, {"path", "/tmp/protected-audio.mp3"},
                            {"request_id", requestId}});
        QTRY_VERIFY(!root->property("loading").toBool());
        QCOMPARE(root->property("previewPath").toString(), QString("/tmp/protected-audio.mp3"));
        QObject *player = root->findChild<QObject *>("notesAudioPlayer");
        QVERIFY(player);
        QCOMPARE(player->property("source").toString(), QString("/tmp/protected-audio.mp3"));
        QVERIFY(root->property("isPlaying").toBool());

        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal"));
        QVERIFY(!root->property("visible").toBool());
        QCOMPARE(controller.closedPath, QString("/tmp/protected-audio.mp3"));
        QVERIFY(player->property("source").toString().isEmpty());
    }

    void notesAudioPreviewCancelsOnlyItsPendingRequest() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesAudioPreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        NotesAudioPreviewTestController controller;
        QQuickWindow window;
        window.resize(720, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile",
                                          Q_ARG(QVariant, QString("audio-2")),
                                          Q_ARG(QVariant, QString("Second audio.mp3"))));
        QVERIFY(root->property("visible").toBool());
        QVERIFY(root->property("loading").toBool());
        const QString requestId = root->property("requestId").toString();
        QVERIFY(!requestId.isEmpty());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal"));
        QCOMPARE(controller.cancelledId, requestId);
        QVERIFY(controller.closedPath.isEmpty());
    }

    void notesAudioPreviewShowsControllerErrorsAndClosesOnEscape() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesAudioPreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        NotesAudioPreviewTestController controller;
        QQuickWindow window;
        window.resize(720, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile",
                                          Q_ARG(QVariant, QString("audio-3")),
                                          Q_ARG(QVariant, QString("Locked audio.mp3"))));
        const QString requestId = root->property("requestId").toString();
        controller.publish({{"success", false}, {"error", "Unlock the files vault."},
                            {"request_id", requestId}});
        QTRY_VERIFY(!root->property("loading").toBool());
        QCOMPARE(root->property("errorMessage").toString(), QString("Unlock the files vault."));

        QObject *closeButton = root->findChild<QObject *>("notesAudioPreviewCloseButton");
        QVERIFY(closeButton);
        QTRY_VERIFY(closeButton->property("activeFocus").toBool());
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_VERIFY(!root->property("visible").toBool());
        QVERIFY(controller.cancelledId.isEmpty());
    }

    void notesFilePreviewCorrelatesResultsAndReleasesTemporaryFiles() {
        QQmlEngine engine;
        QQmlComponent themeComponent(&engine);
        themeComponent.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/ui/Theme.qml")));
        QScopedPointer<QObject> theme(themeComponent.create());
        QVERIFY2(theme, qPrintable(themeComponent.errorString()));
        NotesFilePreviewTestController controller;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("theme", theme.data());
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesFilePreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(900, 640);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QObject *viewer = root->findChild<QObject *>("notesFilePreviewSurface");
        QVERIFY(viewer);
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-text"))));
        QTRY_VERIFY(root->property("visible").toBool());
        QCOMPARE(controller.requestedFileId, QString("file-text"));
        const QString requestId = root->property("requestId").toString();
        QVERIFY(requestId.startsWith(QStringLiteral("notes-viewer-")));
        controller.publish({{"success", true}, {"path", "/tmp/stale.txt"},
                            {"url", "file:///tmp/stale.txt"}, {"file_type", "text"},
                            {"name", "Stale.txt"}, {"request_id", "unrelated-request"}});
        QVERIFY(viewer->property("loading").toBool());

        controller.publish({{"success", true}, {"path", "/tmp/protected-note.txt"},
                            {"url", "file:///tmp/protected-note.txt"}, {"file_type", "text"},
                            {"name", "Note.txt"}, {"request_id", requestId}});
        QTRY_VERIFY(!viewer->property("loading").toBool());
        QCOMPARE(viewer->property("previewText").toString(), QString("# Preview text"));
        QCOMPARE(viewer->property("previewName").toString(), QString("Note.txt"));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal", Q_ARG(QVariant, false)));
        QVERIFY(!root->property("visible").toBool());
        QCOMPARE(controller.closedPath, QString("/tmp/protected-note.txt"));
        QVERIFY(viewer->property("previewPath").toString().isEmpty());
    }

    void notesFilePreviewCancelsPendingRequestAndClosesOnVaultInvalidation() {
        QQmlEngine engine;
        QQmlComponent themeComponent(&engine);
        themeComponent.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/ui/Theme.qml")));
        QScopedPointer<QObject> theme(themeComponent.create());
        QVERIFY2(theme, qPrintable(themeComponent.errorString()));
        NotesFilePreviewTestController controller;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("theme", theme.data());
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesFilePreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(900, 640);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QObject *viewer = root->findChild<QObject *>("notesFilePreviewSurface");
        QVERIFY(viewer);
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-pending"))));
        const QString requestId = root->property("requestId").toString();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal", Q_ARG(QVariant, false)));
        QCOMPARE(controller.cancelledId, requestId);

        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-ready"))));
        const QString nextRequestId = root->property("requestId").toString();
        controller.publish({{"success", true}, {"path", "/tmp/protected-note.png"},
                            {"url", "file:///tmp/protected-note.png"}, {"file_type", "image"},
                            {"name", "Diagram.png"}, {"request_id", nextRequestId}});
        QCOMPARE(viewer->property("previewPath").toString(), QString("/tmp/protected-note.png"));
        controller.invalidate();
        QVERIFY(!root->property("visible").toBool());
        QVERIFY(controller.closedPath.isEmpty());
    }

    void notesFilePreviewKeepsPdfPageResultsScopedToItsRequest() {
        QQmlEngine engine;
        QQmlComponent themeComponent(&engine);
        themeComponent.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/ui/Theme.qml")));
        QScopedPointer<QObject> theme(themeComponent.create());
        QVERIFY2(theme, qPrintable(themeComponent.errorString()));
        NotesFilePreviewTestController controller;
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("theme", theme.data());
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesFilePreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(900, 640);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QObject *viewer = root->findChild<QObject *>("notesFilePreviewSurface");
        QVERIFY(viewer);
        window.show();
        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-pdf"))));
        const QString requestId = root->property("requestId").toString();
        controller.publish({{"success", true}, {"path", "/tmp/protected-note.pdf"},
                            {"url", "file:///tmp/protected-note.pdf"}, {"file_type", "pdf"},
                            {"name", "Study.pdf"}, {"request_id", requestId}});
        QCOMPARE(controller.renderedPath, QString("/tmp/protected-note.pdf"));
        QCOMPARE(controller.renderedPage, 1);
        QCOMPARE(controller.renderedRequestId, requestId);

        controller.publishPdfPage({{"success", true}, {"pageNumber", 1},
                                    {"path", "/tmp/stale-pdf-page.png"},
                                    {"url", "file:///tmp/stale-pdf-page.png"},
                                    {"request_id", "another-notes-viewer"}});
        QVERIFY(viewer->property("previewPdfImageUrl").toString().isEmpty());

        controller.publishPdfPage({{"success", true}, {"pageNumber", 1},
                                    {"path", "/tmp/protected-pdf-page.png"},
                                    {"url", "file:///tmp/protected-pdf-page.png"},
                                    {"request_id", requestId}});
        QCOMPARE(viewer->property("previewPdfImageUrl").toString(),
                 QString("file:///tmp/protected-pdf-page.png"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal", Q_ARG(QVariant, false)));
        QCOMPARE(controller.closedPdfPath, QString("/tmp/protected-pdf-page.png"));
        QCOMPARE(controller.closedPath, QString("/tmp/protected-note.pdf"));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-pdf-pending"))));
        const QString pendingRequestId = root->property("requestId").toString();
        controller.publish({{"success", true}, {"path", "/tmp/pending-note.pdf"},
                            {"url", "file:///tmp/pending-note.pdf"}, {"file_type", "pdf"},
                            {"name", "Pending.pdf"}, {"request_id", pendingRequestId}});
        QVERIFY(root->property("pdfRendering").toBool());
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal", Q_ARG(QVariant, false)));
        QCOMPARE(controller.cancelledId, pendingRequestId);
    }

    void notesFilePreviewRestoresReadingProgressAndBookmarks() {
        QQmlEngine engine;
        QQmlComponent themeComponent(&engine);
        themeComponent.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/ui/Theme.qml")));
        QScopedPointer<QObject> theme(themeComponent.create());
        QVERIFY2(theme, qPrintable(themeComponent.errorString()));
        NotesFilePreviewTestController controller;
        for (int line = 0; line < 400; ++line) controller.previewTextContent += QStringLiteral("\nReading progress test line %1 with enough content to scroll.").arg(line);
        controller.configValues.insert(QStringLiteral("notes_file_reading_progress_v1_file-text"),
            QStringLiteral("{\"scrollTop\":420,\"percentage\":42,\"scrollHeight\":1000,\"bookmarks\":[{\"id\":\"bm_saved\",\"label\":\"Chapter 2\",\"scrollTop\":420,\"createdAt\":\"2026-01-02T00:00:00Z\"}]}"));
        engine.rootContext()->setContextProperty("dataController", &controller);
        engine.rootContext()->setContextProperty("theme", theme.data());
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesFilePreviewModal.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(900, 640);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QObject *progress = root->findChild<QObject *>("notesFileReadingProgress");
        QObject *viewer = root->findChild<QObject *>("notesFilePreviewSurface");
        QObject *textContent = root->findChild<QObject *>("notesFilePreviewTextContent");
        QObject *resumeCard = root->findChild<QObject *>("notesFileReadingResumeCard");
        QObject *bookmarksButton = root->findChild<QObject *>("notesFileReadingBookmarksButton");
        QVERIFY(progress);
        QVERIFY(viewer);
        QVERIFY(textContent);
        QVERIFY(resumeCard);
        QVERIFY(bookmarksButton);
        window.show();

        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile", Q_ARG(QVariant, QString("file-text"))));
        const QString requestId = root->property("requestId").toString();
        controller.publish({{"success", true}, {"path", "/tmp/protected-note.txt"},
                            {"url", "file:///tmp/protected-note.txt"}, {"file_type", "text"},
                            {"name", "Note.txt"}, {"request_id", requestId}});
        QTRY_VERIFY(textContent->property("width").toReal() > 0.0);
        QVERIFY(textContent->property("width").toReal() <= 768.0);
        const qreal desktopTextWidth = textContent->property("width").toReal();
        window.resize(480, 640);
        QTRY_VERIFY_WITH_TIMEOUT(textContent->property("width").toReal() < desktopTextWidth, 1000);
        QTRY_VERIFY(progress->property("showResumePrompt").toBool());
        QVERIFY(resumeCard->property("visible").toBool());
        QCOMPARE(bookmarksButton->property("text").toString(), QString("Marcadores (1)"));

        QVERIFY(QMetaObject::invokeMethod(progress, "resumeReading"));
        QVERIFY(!progress->property("showResumePrompt").toBool());

        QVERIFY(QMetaObject::invokeMethod(viewer, "jumpToTextScroll", Q_ARG(QVariant, 150)));
        QTRY_VERIFY(progress->property("currentPercentage").toInt() > 0);
        QTRY_VERIFY(QJsonDocument::fromJson(controller.getConfig(
            QStringLiteral("notes_file_reading_progress_v1_file-text")).toUtf8()).object()
            .value(QStringLiteral("percentage")).toInt() != 42);

        QVERIFY(QMetaObject::invokeMethod(progress, "addBookmark"));
        QCOMPARE(progress->property("bookmarks").toList().size(), 2);
        const QString stored = controller.getConfig(QStringLiteral("notes_file_reading_progress_v1_file-text"));
        QVERIFY(stored.contains(QStringLiteral("Chapter 2")));

        QObject *bookmarkPopup = root->findChild<QObject *>("notesFileReadingBookmarksPopup");
        QVERIFY(bookmarkPopup);
        QVERIFY(QMetaObject::invokeMethod(bookmarksButton, "clicked"));
        QTRY_VERIFY(bookmarkPopup->property("visible").toBool());
        QObject *editButton = findQuickObject(window.contentItem(), QStringLiteral("notesFileBookmarkEditButton"));
        QObject *editField = findQuickObject(window.contentItem(), QStringLiteral("notesFileBookmarkEditField"));
        QVERIFY(editButton && editField);
        QVERIFY(QMetaObject::invokeMethod(editButton, "clicked"));
        QTRY_VERIFY(editField->property("visible").toBool());
        QTRY_VERIFY(editField->property("activeFocus").toBool());
        editField->setProperty("text", QStringLiteral("Renamed chapter"));
        QTest::keyClick(&window, Qt::Key_Return);
        QVariantList updatedBookmarks = progress->property("bookmarks").toList();
        QCOMPARE(updatedBookmarks.first().toMap().value(QStringLiteral("label")).toString(),
                 QStringLiteral("Renamed chapter"));
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_VERIFY(!bookmarkPopup->property("visible").toBool());
        QVERIFY(QMetaObject::invokeMethod(progress, "jumpToBookmark", Q_ARG(QVariant, updatedBookmarks.first())));
        QVariant scrollTop;
        QVERIFY(QMetaObject::invokeMethod(viewer, "textScrollTop", Q_RETURN_ARG(QVariant, scrollTop)));
        QTRY_VERIFY(qAbs(scrollTop.toReal() - 420.0) < 2.0);
        QVERIFY(QMetaObject::invokeMethod(progress, "removeBookmark", Q_ARG(QVariant, QString("bm_saved"))));
        QCOMPARE(progress->property("bookmarks").toList().size(), 1);
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeModal", Q_ARG(QVariant, false)));
    }

    void notesMarkdownEditorProtectsDiscardAndEmitsChangedText() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesFileMarkdownEditor.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(900, 640);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();

        QObject *textArea = root->findChild<QObject *>("notesFileMarkdownTextArea");
        QObject *cancelButton = root->findChild<QObject *>("notesFileMarkdownCancelButton");
        QObject *saveButton = root->findChild<QObject *>("notesFileMarkdownSaveButton");
        QObject *keepEditingButton = root->findChild<QObject *>("notesFileMarkdownKeepEditingButton");
        QObject *discardButton = root->findChild<QObject *>("notesFileMarkdownDiscardButton");
        QObject *discardDialog = root->findChild<QObject *>("notesFileMarkdownDiscardDialog");
        QVERIFY(textArea && cancelButton && saveButton && keepEditingButton && discardButton && discardDialog);
        QSignalSpy saveSpy(root.data(), SIGNAL(saveRequested(QString)));
        QSignalSpy cancelSpy(root.data(), SIGNAL(cancelRequested()));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile",
            Q_ARG(QVariant, QString("study.md")), Q_ARG(QVariant, QString("# Original"))));
        textArea->setProperty("text", QString("# Updated"));
        QVERIFY(root->property("dirty").toBool());
        QVERIFY(QMetaObject::invokeMethod(cancelButton, "clicked"));
        QVERIFY(discardDialog->property("visible").toBool());
        QVERIFY(QMetaObject::invokeMethod(keepEditingButton, "clicked"));
        QVERIFY(!discardDialog->property("visible").toBool());
        QVERIFY(QMetaObject::invokeMethod(cancelButton, "clicked"));
        QVERIFY(QMetaObject::invokeMethod(discardButton, "clicked"));
        QCOMPARE(cancelSpy.count(), 1);

        QVERIFY(QMetaObject::invokeMethod(root.data(), "openForFile",
            Q_ARG(QVariant, QString("study.md")), Q_ARG(QVariant, QString("# Original"))));
        textArea->setProperty("text", QString("# Saved"));
        textArea->setProperty("cursorPosition", 2);
        QTest::keyClick(&window, Qt::Key_Tab);
        QCOMPARE(textArea->property("text").toString(), QString("#   Saved"));
        QTest::keyClick(&window, Qt::Key_S, Qt::ControlModifier);
        QCOMPARE(saveSpy.count(), 1);
        QCOMPARE(saveSpy.takeFirst().at(0).toString(), QString("#   Saved"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "closeAfterSave"));
        QVERIFY(!root->property("visible").toBool());
        QVERIFY(!root->property("dirty").toBool());
    }

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

        editor->setProperty("text", "<p><strong>Bold text</strong></p>");
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Q_ARG(int, 0), Q_ARG(int, 9)));
        QVERIFY(root->property("boldAtCursor").toBool());
        QVERIFY(!root->property("italicAtCursor").toBool());

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

    void notesViewLoadsAndPersistsUnifiedWysiwygEdits() {
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
            QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml"));
        component.loadUrl(viewUrl);
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "refreshPageTree"));
        QTRY_COMPARE(root->property("selectedPageId").toString(), QString("page-one"));

        root->setProperty("activeContent", QString("<p>Unified WYSIWYG edit</p>"));
        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        QCOMPARE(controller.saveCount, 1);
        QCOMPARE(controller.lastSavedPageId, QString("page-one"));
        QCOMPARE(controller.lastSavedContent, QString("<p>Unified WYSIWYG edit</p>"));

        QVERIFY(QMetaObject::invokeMethod(root.data(), "selectPage", Q_ARG(QVariant, QString("page-two"))));
        QCOMPARE(root->property("selectedPageId").toString(), QString("page-two"));
        QVERIFY(root->property("pinnedPages").toList().size() >= 1);
        QVERIFY(root->property("pageTree").toList().size() >= 2);
        QVERIFY(root->property("allPageTree").toList().size() >= 2);
        QVERIFY(QMetaObject::invokeMethod(root.data(), "toggleNodeCollapse", Q_ARG(QVariant, QString("page-one"))));
        QVERIFY(root->property("collapsedNodeMap").toMap().value("page-one").toBool());
    }

};

int main(int argc, char **argv) {
    QGuiApplication application(argc, argv);
    qmlRegisterType<NotesAudioTestPlayer>("Synapse.Media", 1, 0, "MpvPlayerItem");
    qmlRegisterType<NotesAudioTestPlayer>("Synapse.Media", 1, 0, "MpvVideoPlayer");
    NativeRichQmlTest test;
    if (argc > 1 && QByteArray(argv[1]) == QByteArrayLiteral("--suite=audio-preview")) {
        char correlationTest[] = "notesAudioPreviewCorrelatesAndReleasesItsTemporaryPath";
        char cancellationTest[] = "notesAudioPreviewCancelsOnlyItsPendingRequest";
        char errorTest[] = "notesAudioPreviewShowsControllerErrorsAndClosesOnEscape";
        char *correlationArguments[] = {argv[0], correlationTest};
        char *cancellationArguments[] = {argv[0], cancellationTest};
        char *errorArguments[] = {argv[0], errorTest};
        return QTest::qExec(&test, 2, correlationArguments) |
            QTest::qExec(&test, 2, cancellationArguments) |
            QTest::qExec(&test, 2, errorArguments);
    }
    if (argc > 1 && QByteArray(argv[1]) == QByteArrayLiteral("--suite=file-preview")) {
        char correlationTest[] = "notesFilePreviewCorrelatesResultsAndReleasesTemporaryFiles";
        char invalidationTest[] = "notesFilePreviewCancelsPendingRequestAndClosesOnVaultInvalidation";
        char pdfTest[] = "notesFilePreviewKeepsPdfPageResultsScopedToItsRequest";
        char *correlationArguments[] = {argv[0], correlationTest};
        char *invalidationArguments[] = {argv[0], invalidationTest};
        char *pdfArguments[] = {argv[0], pdfTest};
        return QTest::qExec(&test, 2, correlationArguments) |
            QTest::qExec(&test, 2, invalidationArguments) |
            QTest::qExec(&test, 2, pdfArguments);
    }
    if (argc > 1 && QByteArray(argv[1]) == QByteArrayLiteral("--suite=reading-progress")) {
        char progressTest[] = "notesFilePreviewRestoresReadingProgressAndBookmarks";
        char *progressArguments[] = {argv[0], progressTest};
        return QTest::qExec(&test, 2, progressArguments);
    }
    if (argc > 1 && QByteArray(argv[1]) == QByteArrayLiteral("--suite=markdown-editor")) {
        char editorTest[] = "notesMarkdownEditorProtectsDiscardAndEmitsChangedText";
        char *editorArguments[] = {argv[0], editorTest};
        return QTest::qExec(&test, 2, editorArguments);
    }
    const int richResult = QTest::qExec(&test, argc, argv);
    return richResult | runNativeNotesLinkPreviewQmlTest() | runNativeNotesLinkColorQmlTest(argc, argv) |
        runNativeNotesSlashMenuQmlTest(argc, argv) |
        runNativeNotesPageReferenceQmlTest(argc, argv) |
        runNativeNotesPageReferenceSlashQmlTest(argc, argv) |
        runNativeNotesReferenceSearchQmlTest(argc, argv) |
        runNativeNotesReferenceActionsQmlTest(argc, argv) |
        runNativeNotesCalloutQmlTest(argc, argv) |
        runNativeNotesCodeLanguageQmlTest(argc, argv) |
        runNativeNotesDividerDragQmlTest(argc, argv) |
        runNativeNotesRichImagesQmlTest(argc, argv) |
        runNativeNotesRichImageMovementQmlTest(argc, argv) |
        runNativeNotesRichImageClipboardQmlTest(argc, argv) |
        runNativeNotesRichImageDeletionQmlTest(argc, argv) |
        runNativeNotesRichImageDropQmlTest(argc, argv);
}

#include "native_rich_qml_test.moc"
