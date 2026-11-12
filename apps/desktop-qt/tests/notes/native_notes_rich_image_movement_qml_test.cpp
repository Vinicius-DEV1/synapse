#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtCore/QVariantMap>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

namespace {

QString imageDataUrl() {
    QImage image(40, 20, QImage::Format_ARGB32);
    image.fill(QColor("#a78bfa"));
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) return {};
    return QStringLiteral("data:image/png;base64,%1").arg(QString::fromLatin1(bytes.toBase64()));
}

int findImagePosition(QTextDocument *document) {
    if (!document) return -1;
    for (QTextBlock block = document->begin(); block.isValid(); block = block.next()) {
        for (auto fragment = block.begin(); !fragment.atEnd(); ++fragment) {
            const QTextFragment text = fragment.fragment();
            if (text.isValid() && text.charFormat().isImageFormat()) return text.position();
        }
    }
    return -1;
}

}

class MockRichImageExportController final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    void finish(const QVariantMap &result) { emit fileOperationFinished(result); }
    Q_INVOKABLE QUrl suggestedNotesRichImageSaveUrl(const QString &, const QString &) const {
        return QUrl::fromLocalFile(QStringLiteral("/tmp/image.png"));
    }
    Q_INVOKABLE void copyNotesRichImage(const QString &dataUrl) {
        ++copyRequests;
        lastImageDataUrl = dataUrl;
        emit fileOperationFinished({{"success", true}, {"operation", "notes-rich-image-copy"}});
    }
    Q_INVOKABLE void saveNotesRichImage(const QString &dataUrl, const QUrl &destinationUrl) {
        ++saveRequests;
        lastImageDataUrl = dataUrl;
        lastDestination = destinationUrl;
        emit fileOperationFinished({{"success", true}, {"operation", "notes-rich-image-download"}});
    }

    int copyRequests = 0;
    int saveRequests = 0;
    QString lastImageDataUrl;
    QUrl lastDestination;

signals:
    void fileOperationFinished(const QVariantMap &result);
};

class NativeNotesRichImageMovementQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void movementAndParagraphActionsRouteThroughToolbarAndUndo() {
        NotesTextOperations operations;
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichImageHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(1000, 420);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *imageActions = root->findChild<QObject *>("notesRichImageActions");
        QObject *imageEditor = root->findChild<QObject *>("notesRichImageEditor");
        QObject *imageToolbar = root->findChild<QObject *>("notesRichImageToolbar");
        QVERIFY(imageActions);
        QVERIFY(imageEditor);
        QVERIFY(imageToolbar);
        MockRichImageExportController exportController;
        QVERIFY(imageActions);
        imageActions->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&exportController)));
        const QString source = QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"40\" height=\"20\" alt=\"photo.png\" data-caption=\"Evening\" data-align=\"right\"/></p><p>After</p>")
            .arg(imageDataUrl());
        imageEditor->setProperty("text", source);
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            imageEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QVERIFY(operations.prepareRichImages(quickDocument, source));
        int imagePosition = findImagePosition(quickDocument->textDocument());
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));

        QSignalSpy changed(imageActions, SIGNAL(contentModified()));
        QVERIFY(imageToolbar->property("richImageCanMoveUp").toBool());
        QVERIFY(imageToolbar->property("richImageCanMoveDown").toBool());
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageMoveRequested", Qt::DirectConnection,
                                          Q_ARG(bool, true)));
        QCOMPARE(changed.count(), 1);
        QVariantMap saved = operations.serializeRich(quickDocument);
        const QString movedUp = saved.value("html").toString();
        QVERIFY(movedUp.indexOf("<img") < movedUp.indexOf("<p>Before</p>"));
        QVERIFY(movedUp.contains("data-caption=\"Evening\""));
        QVERIFY(movedUp.contains("data-align=\"right\""));
        QVERIFY(!imageToolbar->property("richImageCanMoveUp").toBool());

        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        imagePosition = findImagePosition(quickDocument->textDocument());
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageMoveRequested", Qt::DirectConnection,
                                          Q_ARG(bool, false)));
        QCOMPARE(changed.count(), 2);
        saved = operations.serializeRich(quickDocument);
        const QString movedDown = saved.value("html").toString();
        QVERIFY(movedDown.indexOf("<p>After</p>") < movedDown.indexOf("<img"));
        QVERIFY(movedDown.contains("data-caption=\"Evening\""));

        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        imagePosition = findImagePosition(quickDocument->textDocument());
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageParagraphBelowRequested", Qt::DirectConnection));
        QCOMPARE(changed.count(), 3);
        const int caretPosition = imageEditor->property("cursorPosition").toInt();
        QVERIFY(quickDocument->textDocument()->findBlock(caretPosition).text().isEmpty());
        const QTextCursor after = quickDocument->textDocument()->find(QStringLiteral("After"));
        QVERIFY(after.block().previous().text().isEmpty());

        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        saved = operations.serializeRich(quickDocument);
        QVERIFY(saved.value("ok").toBool());
        QVERIFY(saved.value("html").toString().contains("data-align=\"right\""));
        QVERIFY(saved.value("html").toString().contains("data-caption=\"Evening\""));
        QCOMPARE(changed.count(), 3);

        imagePosition = findImagePosition(quickDocument->textDocument());
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));
        const int changesBeforeExport = changed.count();
        QVERIFY(imageToolbar->property("richImageActionsEnabled").toBool());
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageCopyRequested", Qt::DirectConnection));
        QCOMPARE(exportController.copyRequests, 1);
        QCOMPARE(exportController.lastImageDataUrl, imageDataUrl());
        QCOMPARE(imageToolbar->property("richImageCopyState").toString(), QString("copied"));

        QObject *saveDialog = root->findChild<QObject *>("notesRichImageSaveDialog");
        QVERIFY(saveDialog);
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageDownloadRequested", Qt::DirectConnection));
        QCOMPARE(saveDialog->property("imageDataUrl").toString(), imageDataUrl());
        QCOMPARE(saveDialog->property("suggestedFileUrl").toUrl().toLocalFile(), QString("/tmp/image.png"));
        QVERIFY(QMetaObject::invokeMethod(saveDialog, "closeDialog", Qt::DirectConnection));
        const QUrl destination = QUrl::fromLocalFile(QStringLiteral("/tmp/evening.png"));
        QVERIFY(QMetaObject::invokeMethod(saveDialog, "saveRequested", Qt::DirectConnection,
                                          Q_ARG(QString, imageDataUrl()), Q_ARG(QUrl, destination)));
        QCOMPARE(exportController.saveRequests, 1);
        QCOMPARE(exportController.lastImageDataUrl, imageDataUrl());
        QCOMPARE(exportController.lastDestination, destination);
        exportController.finish({{"success", false}, {"operation", "notes-rich-image-copy"},
                                 {"error", "Clipboard denied the image."}});
        QCOMPARE(imageToolbar->property("richImageCopyState").toString(), QString("failed"));
        QCOMPARE(imageActions->property("errorMessage").toString(),
                 QString("Clipboard denied the image."));
        QCOMPARE(changed.count(), changesBeforeExport);

        imagePosition = findImagePosition(quickDocument->textDocument());
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));
        QObject *deleteDialog = root->findChild<QObject *>("notesRichImageDeleteDialog");
        QVERIFY(deleteDialog);
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageDeleteRequested", Qt::DirectConnection));
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QVERIFY(QMetaObject::invokeMethod(deleteDialog, "close", Qt::DirectConnection));
        QVERIFY(!deleteDialog->property("visible").toBool());
    }
};

int runNativeNotesRichImageMovementQmlTest(int argc, char **argv) {
    NativeNotesRichImageMovementQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_movement_qml_test.moc"
