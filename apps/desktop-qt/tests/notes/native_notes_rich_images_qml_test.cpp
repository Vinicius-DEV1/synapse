#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>

namespace {

QQuickItem *findQuickItem(QQuickItem *parent, const QString &objectName) {
    if (!parent) return nullptr;
    if (parent->objectName() == objectName) return parent;
    for (QQuickItem *child : parent->childItems()) {
        if (QQuickItem *match = findQuickItem(child, objectName)) return match;
    }
    return nullptr;
}


}

class MockNotesImageController final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    void finish(const QVariantMap &result) { emit fileOperationFinished(result); }

signals:
    void fileOperationFinished(const QVariantMap &result);
};

class NativeNotesRichImagesQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void preparedImageInsertionUsesRichEditorUndoPath() {
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
        QQuickItem *captionInput = rootItem->findChild<QQuickItem *>("notesRichImageCaptionInput");
        QVERIFY(imageActions);
        QVERIFY(imageEditor);
        QVERIFY(imageToolbar);
        QVERIFY(captionInput);
        MockNotesImageController controller;
        imageActions->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        imageActions->setProperty("pageId", "page-one");
        imageActions->setProperty("savedStart", 6);
        imageActions->setProperty("savedEnd", 6);
        imageActions->setProperty("savedPageId", "page-one");
        imageActions->setProperty("savedDocumentSource", imageEditor->property("text"));

        QImage image(40, 20, QImage::Format_ARGB32);
        image.fill(QColor("#a78bfa"));
        QByteArray bytes;
        QBuffer buffer(&bytes);
        QVERIFY(buffer.open(QIODevice::WriteOnly));
        QVERIFY(image.save(&buffer, "PNG"));
        const QString dataUrl = QStringLiteral("data:image/png;base64,%1")
            .arg(QString::fromLatin1(bytes.toBase64()));

        QSignalSpy changed(imageActions, SIGNAL(contentModified()));
        QVariantMap payload{{"success", true}, {"operation", "notes-rich-image"},
                            {"imageDataUrl", dataUrl},
                            {"width", 40}, {"height", 20}, {"fileName", "photo.png"}};
        QVariantMap unrelated = payload;
        unrelated.insert("operation", "other-file-operation");
        controller.finish(unrelated);
        QCoreApplication::processEvents();
        QCOMPARE(imageActions->property("errorMessage").toString(), QString());
        QCOMPARE(changed.count(), 0);
        controller.finish(payload);
        QTRY_COMPARE(changed.count(), 1);

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(imageEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        NotesTextOperations serializer;
        const QVariantMap saved = serializer.serializeRich(quickDocument);
        QVERIFY2(saved.value("ok").toBool(), qPrintable(quickDocument->textDocument()->toHtml()));
        QVERIFY(saved.value("html").toString().contains("<img src=\"data:image/png;base64,"));
        QVERIFY(saved.value("html").toString().contains("alt=\"photo.png\""));

        int imagePosition = -1;
        for (QTextBlock block = quickDocument->textDocument()->begin(); block.isValid(); block = block.next()) {
            for (auto fragment = block.begin(); !fragment.atEnd(); ++fragment) {
                const QTextFragment textFragment = fragment.fragment();
                if (textFragment.isValid() && textFragment.charFormat().isImageFormat())
                    imagePosition = textFragment.position();
            }
        }
        QVERIFY(imagePosition >= 0);
        imageEditor->setProperty("cursorPosition", imagePosition);
        QVERIFY(QMetaObject::invokeMethod(imageActions, "refreshImageState", Qt::DirectConnection));
        QVariantMap selectedImage = imageActions->property("imageState").toMap();
        QVERIFY(selectedImage.value("valid").toBool());
        QVERIFY(imageToolbar->property("richImageSelected").toBool());
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageAlignmentRequested", Qt::DirectConnection,
                                          Q_ARG(QString, QString("center"))));
        QCOMPARE(changed.count(), 1);
        selectedImage = imageActions->property("imageState").toMap();
        QVERIFY(selectedImage.value("valid").toBool());
        QCOMPARE(selectedImage.value("alignment").toString(), QString("center"));
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageAlignmentRequested", Qt::DirectConnection,
                                          Q_ARG(QString, QString("right"))));
        QCOMPARE(changed.count(), 2);
        imageActions->setProperty("captionDraft", "A quiet evening");
        QVariant captioned;
        QVERIFY(QMetaObject::invokeMethod(imageActions, "commitCaption", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, captioned)));
        QVERIFY(captioned.toBool());
        QCOMPARE(changed.count(), 3);
        const QVariantMap formatted = serializer.serializeRich(quickDocument);
        QVERIFY(formatted.value("html").toString().contains("data-align=\"right\""));
        QVERIFY(formatted.value("html").toString().contains("data-caption=\"A quiet evening\""));
        const int afterPosition = quickDocument->textDocument()->find(QStringLiteral("After")).position();
        QVERIFY(afterPosition >= 0);
        root->setProperty("afterPosition", afterPosition);
        const QRectF afterTextRect = root->property("afterTextRect").toRectF();
        QVERIFY2(captionInput->y() + captionInput->height() <= afterTextRect.y(),
                 qPrintable(QStringLiteral("Caption input bottom %1 overlaps following text at %2")
                                .arg(captionInput->y() + captionInput->height())
                                .arg(afterTextRect.y())));

        QObject *resizeOverlay = root->findChild<QObject *>("notesRichImageResizeOverlay");
        QQuickItem *resizeHandle = findQuickItem(qobject_cast<QQuickItem *>(resizeOverlay),
                                                 "notesRichImageResizeHandle_se");
        QVERIFY(resizeOverlay);
        QVERIFY(resizeHandle);
        const QPoint dragStart = resizeHandle->mapToScene(
            QPointF(resizeHandle->width() / 2, resizeHandle->height() / 2)).toPoint();
        const QPoint dragEnd = dragStart + QPoint(20, 0);
        QTest::mousePress(&window, Qt::LeftButton, Qt::NoModifier, dragStart);
        QTRY_VERIFY(resizeOverlay->property("resizing").toBool());
        QTest::mouseMove(&window, dragEnd, 10);
        QTRY_COMPARE(resizeOverlay->property("previewWidth").toInt(), 60);
        QTRY_VERIFY(resizeOverlay->property("previewReady").toBool());
        QCOMPARE(changed.count(), 3);
        QVERIFY(serializer.serializeRich(quickDocument).value("html").toString().contains("width=\"40\""));
        QTest::mouseRelease(&window, Qt::LeftButton, Qt::NoModifier, dragEnd);
        QTRY_COMPARE(changed.count(), 4);
        QVariantMap resized = serializer.serializeRich(quickDocument);
        QVERIFY(resized.value("html").toString().contains("width=\"60\""));
        QVERIFY(!resized.value("html").toString().contains("height=\""));

        const QPoint proportionalStart = resizeHandle->mapToScene(
            QPointF(resizeHandle->width() / 2, resizeHandle->height() / 2)).toPoint();
        QTest::mousePress(&window, Qt::LeftButton, Qt::NoModifier, proportionalStart);
        QTRY_VERIFY(resizeOverlay->property("resizing").toBool());
        QVERIFY(resizeOverlay->property("activeFocus").toBool());
        QTest::keyPress(&window, Qt::Key_Shift);
        QTRY_VERIFY(resizeOverlay->property("previewHasExplicitHeight").toBool());
        const QPoint freeResizeEnd = proportionalStart + QPoint(20, 10);
        QTest::mouseMove(&window, freeResizeEnd, 10);
        QTRY_COMPARE(resizeOverlay->property("previewWidth").toInt(), 80);
        QTRY_COMPARE(resizeOverlay->property("previewHeight").toInt(), 60);
        QVERIFY(resizeOverlay->property("previewHasExplicitHeight").toBool());
        QCOMPARE(changed.count(), 4);
        QTest::mouseRelease(&window, Qt::LeftButton, Qt::ShiftModifier, freeResizeEnd);
        QTest::keyRelease(&window, Qt::Key_Shift);
        QTRY_COMPARE(changed.count(), 5);
        resized = serializer.serializeRich(quickDocument);
        QVERIFY(resized.value("html").toString().contains("width=\"80\" height=\"60\""));

        QQuickItem *eastHandle = findQuickItem(qobject_cast<QQuickItem *>(resizeOverlay),
                                               "notesRichImageResizeHandle_e");
        QVERIFY(eastHandle);
        const QPoint cancelStart = eastHandle->mapToScene(
            QPointF(eastHandle->width() / 2, eastHandle->height() / 2)).toPoint();
        const QPoint cancelEnd = cancelStart + QPoint(30, 0);
        QTest::mousePress(&window, Qt::LeftButton, Qt::NoModifier, cancelStart);
        QTRY_VERIFY(resizeOverlay->property("resizing").toBool());
        QTest::mouseMove(&window, cancelEnd, 10);
        QTRY_COMPARE(resizeOverlay->property("previewWidth").toInt(), 110);
        QCOMPARE(changed.count(), 5);
        QTest::keyPress(&window, Qt::Key_Escape);
        QTRY_VERIFY(!resizeOverlay->property("resizing").toBool());
        QCOMPARE(changed.count(), 5);
        QVERIFY(serializer.serializeRich(quickDocument).value("html").toString()
                    .contains("width=\"80\" height=\"60\""));
        QTest::mouseRelease(&window, Qt::LeftButton, Qt::NoModifier, cancelEnd);

        const QPoint pointerCancelStart = eastHandle->mapToScene(
            QPointF(eastHandle->width() / 2, eastHandle->height() / 2)).toPoint();
        const QPoint pointerCancelEnd = pointerCancelStart + QPoint(25, 0);
        QTest::mousePress(&window, Qt::LeftButton, Qt::NoModifier, pointerCancelStart);
        QTRY_VERIFY(resizeOverlay->property("resizing").toBool());
        QTest::mouseMove(&window, pointerCancelEnd, 10);
        QTRY_VERIFY(resizeOverlay->property("previewWidth").toInt() > 80);
        QCOMPARE(changed.count(), 5);
        eastHandle->ungrabMouse();
        QTRY_VERIFY(!resizeOverlay->property("resizing").toBool());
        QCOMPARE(changed.count(), 5);
        QTest::mouseRelease(&window, Qt::LeftButton, Qt::NoModifier, pointerCancelEnd);
        QVERIFY(serializer.serializeRich(quickDocument).value("html").toString()
                    .contains("width=\"80\" height=\"60\""));

        const QPoint resetStart = resizeHandle->mapToScene(
            QPointF(resizeHandle->width() / 2, resizeHandle->height() / 2)).toPoint();
        QTest::mouseDClick(&window, Qt::LeftButton, Qt::NoModifier, resetStart);
        QTRY_COMPARE(changed.count(), 6);
        resized = serializer.serializeRich(quickDocument);
        QVERIFY(!resized.value("html").toString().contains("width=\""));
        QVERIFY(!resized.value("html").toString().contains("height=\""));

        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageFitRequested", Qt::DirectConnection));
        QCOMPARE(changed.count(), 7);
        resized = serializer.serializeRich(quickDocument);
        QVERIFY(resized.value("html").toString().contains("width=\"800\""));
        QVERIFY(!resized.value("html").toString().contains("height=\""));
        QVERIFY(QMetaObject::invokeMethod(imageToolbar, "richImageResetRequested", Qt::DirectConnection));
        QCOMPARE(changed.count(), 8);
        resized = serializer.serializeRich(quickDocument);
        QVERIFY(!resized.value("html").toString().contains("width=\""));
        QVERIFY(!resized.value("html").toString().contains("height=\""));

        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        QVariantMap undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(undone.value("html").toString().contains("width=\"800\""));
        QVERIFY(undone.value("html").toString().contains("data-caption=\"A quiet evening\""));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(!undone.value("html").toString().contains("width=\""));
        QVERIFY(undone.value("html").toString().contains("data-caption=\"A quiet evening\""));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(undone.value("html").toString().contains("width=\"80\" height=\"60\""));
        QVERIFY(undone.value("html").toString().contains("data-caption=\"A quiet evening\""));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(undone.value("html").toString().contains("width=\"60\""));
        QVERIFY(!undone.value("html").toString().contains("height=\""));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(undone.value("html").toString().contains("width=\"40\" height=\"20\""));
        QVERIFY(undone.value("html").toString().contains("data-caption=\"A quiet evening\""));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(undone.value("html").toString().contains("data-align=\"right\""));
        QVERIFY(!undone.value("html").toString().contains("data-caption="));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QVERIFY(!undone.value("html").toString().contains("data-align="));
        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QCOMPARE(undone.value("html").toString(), QString("<p>BeforeAfter</p>"));
        QCOMPARE(changed.count(), 8);

        imageActions->setProperty("pageId", "page-two");
        controller.finish(payload);
        QTRY_VERIFY(imageActions->property("errorMessage").toString().contains("note changed"));
        QCOMPARE(changed.count(), 8);
    }
};

int runNativeNotesRichImagesQmlTest(int argc, char **argv) {
    NativeNotesRichImagesQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_images_qml_test.moc"
