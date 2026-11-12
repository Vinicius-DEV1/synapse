#include "synapse_controller.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_image_editing.h"
#include "controllers/notes/notes_rich_images.h"

#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QMimeData>
#include <QtCore/QTemporaryDir>
#include <QtGui/QClipboard>
#include <QtGui/QImage>
#include <QtGui/QImageReader>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesRichImageClipboardTest final : public QObject {
    Q_OBJECT
private slots:
    void adjacentImageDeletionIsConfirmedByTheCallerAndUndoable() {
        QImage image(32, 16, QImage::Format_ARGB32);
        image.fill(QColor("#22c55e"));
        QByteArray bytes;
        QBuffer buffer(&bytes);
        QVERIFY(buffer.open(QIODevice::WriteOnly));
        QVERIFY(image.save(&buffer, "PNG"));
        const QString dataUrl = QStringLiteral("data:image/png;base64,%1")
            .arg(QString::fromLatin1(bytes.toBase64()));
        const QString source = QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"photo.png\"/></p><p>After</p>")
            .arg(dataUrl);
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichImages::prepare(document, source));
        const QString original = NotesRichDocument::serialize(document);
        const QTextBlock imageBlock = document.findBlockByNumber(1);
        const QTextBlock beforeBlock = document.findBlockByNumber(0);
        const QTextBlock afterBlock = document.findBlockByNumber(2);
        int imagePosition = -1;
        for (auto it = imageBlock.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.charFormat().isImageFormat())
                imagePosition = fragment.position();
        }
        QVERIFY(imagePosition >= 0);
        QVERIFY(NotesRichImageEditing::adjacentImagePosition(
                    document, afterBlock.position(), true) == imagePosition);
        QVERIFY(NotesRichImageEditing::adjacentImagePosition(
                    document, beforeBlock.position() + beforeBlock.text().size(), false) == imagePosition);
        QCOMPARE(NotesRichImageEditing::adjacentImagePosition(
                     document, beforeBlock.position() + 3, true), -1);
        QCOMPARE(NotesRichImageEditing::adjacentImagePosition(
                     document, afterBlock.position() + 2, false), -1);
        QVERIFY(!NotesRichImageEditing::removeAt(document, imagePosition + 1));
        QVERIFY(NotesRichImageEditing::removeAt(document, imagePosition));
        const QString removed = NotesRichDocument::serialize(document);
        QVERIFY(!removed.contains("<img"));
        QVERIFY(removed.contains("Before"));
        QVERIFY(removed.contains("After"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void imageBatchCanInsertAfterSelectedImageWithOneUndo() {
        QImage originalImage(32, 16, QImage::Format_ARGB32);
        originalImage.fill(QColor("#22c55e"));
        QByteArray originalBytes;
        QBuffer originalBuffer(&originalBytes);
        QVERIFY(originalBuffer.open(QIODevice::WriteOnly));
        QVERIFY(originalImage.save(&originalBuffer, "PNG"));
        const QString originalDataUrl = QStringLiteral("data:image/png;base64,%1")
            .arg(QString::fromLatin1(originalBytes.toBase64()));
        const QString source = QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"existing.png\"/></p><p>After</p>")
            .arg(originalDataUrl);
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichImages::prepare(document, source));
        const QString original = NotesRichDocument::serialize(document);
        const int selectedImagePosition = document.findBlockByNumber(1).position();
        const int insertionPosition = NotesRichImages::insertionPositionAfter(document, selectedImagePosition);
        QVERIFY(insertionPosition >= 0);
        QVERIFY(NotesRichImages::canInsertAt(document, insertionPosition));
        const QVariantList images{
            QVariantMap{{"imageDataUrl", originalDataUrl}, {"fileName", "pasted-1.png"}, {"width", 32}, {"height", 16}},
            QVariantMap{{"imageDataUrl", originalDataUrl}, {"fileName", "pasted-2.png"}, {"width", 32}, {"height", 16}}
        };
        QVERIFY(NotesRichImages::insertMany(document, insertionPosition, insertionPosition, images) >= 0);
        const QString inserted = NotesRichDocument::serialize(document);
        QVERIFY(inserted.indexOf("alt=\"existing.png\"") < inserted.indexOf("alt=\"pasted-1.png\""));
        QVERIFY(inserted.indexOf("alt=\"pasted-1.png\"") < inserted.indexOf("alt=\"pasted-2.png\""));
        QVERIFY(inserted.indexOf("alt=\"pasted-2.png\"") < inserted.indexOf("After"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

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

        const QString secondPath = sandbox.filePath("second-image.png");
        QVERIFY(image.save(secondPath, "PNG"));
        auto *multiMimeData = new QMimeData;
        multiMimeData->setUrls({QUrl::fromLocalFile(imagePath), QUrl::fromLocalFile(secondPath)});
        multiMimeData->setText(imagePath + "\n" + secondPath + "\n" + imagePath);
        clipboard->setMimeData(multiMimeData);
        QVERIFY(controller.hasClipboardNotesRichImage());
        controller.processClipboardNotesRichImage();
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        const QVariantList images = result.value("images").toList();
        QCOMPARE(images.size(), 2);
        QCOMPARE(images.at(0).toMap().value("fileName").toString(), QString("local-image.png"));
        QCOMPARE(images.at(1).toMap().value("fileName").toString(), QString("second-image.png"));

        const QString corruptPath = sandbox.filePath("corrupt.png");
        QFile corrupt(corruptPath);
        QVERIFY(corrupt.open(QIODevice::WriteOnly));
        QVERIFY(corrupt.write("not an image") > 0);
        corrupt.close();
        controller.processNotesRichImages({QUrl::fromLocalFile(imagePath),
                                           QUrl::fromLocalFile(corruptPath),
                                           QUrl::fromLocalFile(sandbox.filePath("notes.txt"))});
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY(result.value("success").toBool());
        QCOMPARE(result.value("images").toList().size(), 1);
        QVERIFY(result.value("warning").toString().contains("Skipped 2"));

        QVariantList oversizedBatch;
        for (int index = 0; index <= NotesRichImages::MaximumBatchSize; ++index) {
            const QString copyPath = sandbox.filePath(QStringLiteral("batch-%1.png").arg(index));
            QVERIFY(QFile::copy(imagePath, copyPath));
            oversizedBatch.append(QVariant::fromValue(QUrl::fromLocalFile(copyPath)));
        }
        controller.processNotesRichImages(oversizedBatch);
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY(result.value("success").toBool());
        QCOMPARE(result.value("images").toList().size(), NotesRichImages::MaximumBatchSize);
        QVERIFY(result.value("warning").toString().contains("Skipped 1"));

        clipboard->setText(QStringLiteral("ordinary text"));
        QVERIFY(!controller.hasClipboardNotesRichImage());
        controller.processClipboardNotesRichImage();
        QCOMPARE(operations.count(), 1);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY(!result.value("success").toBool());
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image"));
        clipboard->clear();
    }

    void selectedImageCopiesAsPixelsAndDownloadsInItsOriginalFormat() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("image-export.sqlite")));
        QSignalSpy operations(&controller, &SynapseDataController::fileOperationFinished);
        QClipboard *clipboard = QGuiApplication::clipboard();
        QVERIFY(clipboard);

        QImage original(36, 18, QImage::Format_ARGB32);
        original.fill(QColor("#7c3aed"));
        QByteArray jpegBytes;
        QBuffer jpegBuffer(&jpegBytes);
        QVERIFY(jpegBuffer.open(QIODevice::WriteOnly));
        QVERIFY(original.save(&jpegBuffer, "JPEG"));
        const QString jpegDataUrl = QStringLiteral("data:image/jpeg;base64,%1")
            .arg(QString::fromLatin1(jpegBytes.toBase64()));

        controller.copyNotesRichImage(jpegDataUrl);
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        QVariantMap result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image-copy"));
        const QImage copiedImage = clipboard->image();
        QCOMPARE(copiedImage.size(), original.size());
        QVERIFY(clipboard->mimeData()->hasImage());
        QVERIFY(clipboard->mimeData()->formats().contains(QStringLiteral("image/png")));

        const QString selectedPath = sandbox.filePath("evening-photo");
        controller.saveNotesRichImage(jpegDataUrl, QUrl::fromLocalFile(selectedPath));
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image-download"));
        QCOMPARE(result.value("fileName").toString(), QString("evening-photo.jpg"));
        QCOMPARE(QFileInfo(controller.suggestedNotesRichImageSaveUrl(jpegDataUrl, "Evening")
                           .toLocalFile()).fileName(), QString("imagem_Evening.jpg"));
        QCOMPARE(QFileInfo(controller.suggestedNotesRichImageSaveUrl(jpegDataUrl, "")
                           .toLocalFile()).fileName(), QString("imagem_secreta.jpg"));
        QVERIFY(controller.suggestedNotesRichImageSaveUrl(QStringLiteral("invalid"), "Evening").isEmpty());
        const QString savedPath = sandbox.filePath("evening-photo.jpg");
        QVERIFY(QFile::exists(savedPath));
        QImageReader savedReader(savedPath);
        QCOMPARE(savedReader.format().toLower(), QByteArray("jpeg"));
        QCOMPARE(savedReader.read().size(), original.size());

        const QString rejectedPath = sandbox.filePath("unsupported.svg");
        controller.saveNotesRichImage(QStringLiteral("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="),
                                      QUrl::fromLocalFile(rejectedPath));
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        result = operations.takeFirst().at(0).toMap();
        QVERIFY(!result.value("success").toBool());
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image-download"));
        QVERIFY(!QFile::exists(rejectedPath));
        clipboard->clear();
    }
};

int runNativeNotesRichImageClipboardTest(int argc, char **argv) {
    NativeNotesRichImageClipboardTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_clipboard_test.moc"
