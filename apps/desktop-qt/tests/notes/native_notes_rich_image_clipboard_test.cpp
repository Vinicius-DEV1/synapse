#include "synapse_controller.h"
#include "controllers/notes/notes_rich_images.h"

#include <QtCore/QBuffer>
#include <QtCore/QMimeData>
#include <QtCore/QTemporaryDir>
#include <QtGui/QClipboard>
#include <QtGui/QImage>
#include <QtGui/QGuiApplication>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesRichImageClipboardTest final : public QObject {
    Q_OBJECT
private slots:
    void clipboardImagesAndLocalPathsProduceValidatedImagePayloads() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("clipboard.sqlite")));
        QSignalSpy operations(&controller, &SynapseDataController::fileOperationFinished);
        QClipboard *clipboard = QGuiApplication::clipboard();
        QVERIFY(clipboard);

        QImage image(48, 24, QImage::Format_ARGB32);
        image.fill(QColor("#22c55e"));
        clipboard->setImage(image);
        QVERIFY(controller.hasClipboardNotesRichImage());
        controller.processClipboardNotesRichImage();
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        QVariantMap result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("width").toInt(), 48);
        QCOMPARE(result.value("height").toInt(), 24);
        QCOMPARE(result.value("fileName").toString(), QString("clipboard-image.png"));
        QVERIFY(NotesRichImages::supportsDataUrl(result.value("imageDataUrl").toString()));

        const QString imagePath = sandbox.filePath("local-image.png");
        QVERIFY(image.save(imagePath, "PNG"));
        auto *mimeData = new QMimeData;
        mimeData->setText(imagePath);
        clipboard->setMimeData(mimeData);
        QVERIFY(controller.hasClipboardNotesRichImage());
        controller.processClipboardNotesRichImage();
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("fileName").toString(), QString("local-image.png"));
        QVERIFY(NotesRichImages::supportsDataUrl(result.value("imageDataUrl").toString()));

        clipboard->setText(QStringLiteral("ordinary text"));
        QVERIFY(!controller.hasClipboardNotesRichImage());
        controller.processClipboardNotesRichImage();
        QCOMPARE(operations.count(), 1);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY(!result.value("success").toBool());
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image"));
        clipboard->clear();
    }
};

int runNativeNotesRichImageClipboardTest(int argc, char **argv) {
    NativeNotesRichImageClipboardTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_clipboard_test.moc"
