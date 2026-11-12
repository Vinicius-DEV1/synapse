#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtCore/QTemporaryDir>
#include <QtGui/QImage>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class DropImageControllerStub final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    Q_INVOKABLE bool hasClipboardNotesRichImage() const { return false; }
    Q_INVOKABLE void processNotesRichImages(const QVariantList &fileUrls) {
        ++importCount;
        QVariantList images;
        for (int index = 0; index < fileUrls.size(); ++index) {
            const QUrl fileUrl = fileUrls.at(index).toUrl();
            importedPaths.append(fileUrl.toLocalFile());
            images.append(QVariantMap{{"imageDataUrl", QStringLiteral("data:image/png;base64,") + imageBytes},
                                      {"width", 32}, {"height", 16},
                                      {"fileName", QStringLiteral("dropped-%1.png").arg(index + 1)}});
        }
        emit fileOperationFinished({{"success", true}, {"operation", "notes-rich-image"}, {"images", images}});
    }

    int importCount = 0;
    QStringList importedPaths;
    QString imageBytes;

signals:
    void fileOperationFinished(const QVariantMap &result);
};

class NativeNotesRichImageDropQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void localRasterDropUsesPointerPositionAndUndoableImportPath() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString imagePath = sandbox.filePath("dropped image.png");
        const QString secondImagePath = sandbox.filePath("second dropped image.png");
        QImage sourceImage(32, 16, QImage::Format_ARGB32);
        sourceImage.fill(QColor("#22c55e"));
        QVERIFY(sourceImage.save(imagePath, "PNG"));
        QVERIFY(sourceImage.save(secondImagePath, "PNG"));
        QByteArray encodedImage;
        QBuffer encodedBuffer(&encodedImage);
        QVERIFY(encodedBuffer.open(QIODevice::WriteOnly));
        QVERIFY(sourceImage.save(&encodedBuffer, "PNG"));

        NotesTextOperations operations;
        DropImageControllerStub controller;
        controller.imageBytes = QString::fromLatin1(encodedImage.toBase64());
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesRichTextEditor.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        root->setProperty("sourceHtml", "<p>BeforeAfter</p>");
        root->setProperty("active", true);

        QQuickWindow window;
        window.resize(800, 360);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *editor = root->findChild<QObject *>("notesRichTextEditor");
        QObject *dropArea = root->findChild<QObject *>("notesRichImageDropArea");
        QObject *imageActions = root->findChild<QObject *>("notesRichImageActions");
        QVERIFY(editor);
        QVERIFY(dropArea);
        QVERIFY(imageActions);
        QVERIFY(dropArea->property("active").toBool());
        QTRY_VERIFY(editor->property("visible").toBool());
        QCOMPARE(dropArea->property("width").toReal(), editor->property("width").toReal());
        QCOMPARE(dropArea->property("height").toReal(), editor->property("height").toReal());

        int targetX = -1;
        const int targetY = 8;
        for (int x = 0; x < 240; ++x) {
            QVariant mappedPosition;
            QVERIFY(QMetaObject::invokeMethod(dropArea, "positionForPoint", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, mappedPosition),
                                              Q_ARG(QVariant, QVariant(x)),
                                              Q_ARG(QVariant, QVariant(targetY))));
            if (mappedPosition.toInt() == 6) {
                targetX = x;
                break;
            }
        }
        QVERIFY(targetX >= 0);

        QVariantList nonImageUrls{QVariant::fromValue(QUrl::fromLocalFile(sandbox.filePath("notes.txt"))),
                                  QVariant::fromValue(QUrl(QStringLiteral("https://example.com/remote.png")))};
        QVariant dropped;
        QVERIFY(QMetaObject::invokeMethod(dropArea, "handleImageDrop", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, dropped),
                                          Q_ARG(QVariant, QVariant(nonImageUrls)),
                                          Q_ARG(QVariant, QVariant(targetX)),
                                          Q_ARG(QVariant, QVariant(targetY))));
        QVERIFY(!dropped.toBool());
        QCOMPARE(controller.importCount, 0);

        QVariantList urls{QVariant::fromValue(QUrl::fromLocalFile(sandbox.filePath("notes.txt"))),
                          QVariant::fromValue(QUrl::fromLocalFile(imagePath)),
                          QVariant::fromValue(QUrl::fromLocalFile(secondImagePath)),
                          QVariant::fromValue(QUrl(QStringLiteral("https://example.com/remote.png")))};
        QVariant supportedImage;
        QVERIFY(QMetaObject::invokeMethod(dropArea, "supportedLocalImageUrl", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, supportedImage),
                                          Q_ARG(QVariant, urls[1])));
        QVERIFY(supportedImage.toBool());
        QVERIFY(QMetaObject::invokeMethod(dropArea, "handleImageDrop", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, dropped),
                                          Q_ARG(QVariant, QVariant(urls)),
                                          Q_ARG(QVariant, QVariant(targetX)),
                                          Q_ARG(QVariant, QVariant(targetY))));
        QVERIFY(dropped.toBool());
        QCOMPARE(controller.importCount, 1);
        QCOMPARE(controller.importedPaths, (QStringList{imagePath, secondImagePath}));
        QCOMPARE(imageActions->property("savedStart").toInt(), 6);
        QCOMPARE(imageActions->property("savedEnd").toInt(), 6);

        QVariant flushed;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        const QString inserted = root->property("sourceHtml").toString();
        QVERIFY(inserted.indexOf("Before</p>") < inserted.indexOf("<img"));
        QCOMPARE(inserted.count("<img"), 2);
        QVERIFY(inserted.indexOf("alt=\"dropped-1.png\"") < inserted.indexOf("alt=\"dropped-2.png\""));
        QVERIFY(inserted.indexOf("<img") < inserted.indexOf("After</p>"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>BeforeAfter</p>"));
    }
};

int runNativeNotesRichImageDropQmlTest(int argc, char **argv) {
    NativeNotesRichImageDropQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_drop_qml_test.moc"
