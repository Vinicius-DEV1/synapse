#include "synapse_controller.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_images.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>

namespace {

QString pngDataUrl(const QSize &size = QSize(32, 16)) {
    QImage image(size, QImage::Format_ARGB32);
    image.fill(QColor("#8b5cf6"));
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) return {};
    return QStringLiteral("data:image/png;base64,%1").arg(QString::fromLatin1(bytes.toBase64()));
}

}

class NativeNotesRichImagesTest final : public QObject {
    Q_OBJECT
private slots:
    void reactImageMarkupLoadsAndRoundTripsSafeAttributes() {
        const QString sourceUrl = pngDataUrl();
        QVERIFY(!sourceUrl.isEmpty());
        const QString source = QStringLiteral(
            "<p>Before</p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"Photo &amp; place\" title=\"Sunset\"/><p>After</p>")
            .arg(sourceUrl);
        QVERIFY(NotesRichDocument::supportsSource(source));

        NotesTextOperations operations;
        const QString editorSource = operations.richSourceForEditor(source);
        QVERIFY(editorSource.contains("<p><img"));
        QTextDocument document;
        document.setHtml(editorSource);
        QVERIFY(NotesRichImages::prepare(document));
        QVERIFY(document.resource(QTextDocument::ImageResource, QUrl(sourceUrl)).isValid());
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>Before</p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"Photo &amp; place\" title=\"Sunset\"/><p>After</p>")
            .arg(sourceUrl));

        QVERIFY(!NotesRichDocument::supportsSource("<p><img src=\"https://example.com/image.png\"/></p>"));
        QVERIFY(!NotesRichDocument::supportsSource(source.left(source.indexOf(" title=")) + " data-caption=\"Caption\"/></p>"));
        QVERIFY(!NotesRichDocument::supportsSource(QStringLiteral(
            "<p><img src=\"data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=\"/></p>")));
    }

    void imageInsertionSplitsParagraphAndUndoRestoresSource() {
        const QString dataUrl = pngDataUrl();
        QTextDocument document;
        document.setHtml("<p>BeforeAfter</p>");
        QVERIFY(NotesRichImages::canInsertAt(document, 6));
        const int insertionPosition = NotesRichImages::insert(document, 6, 6, dataUrl,
                                                               QStringLiteral("photo.png"), 32, 16);
        QVERIFY(insertionPosition >= 0);
        const QString inserted = NotesRichDocument::serialize(document);
        QVERIFY(inserted.startsWith("<p>Before</p><img"));
        QVERIFY(inserted.contains("alt=\"photo.png\""));
        QVERIFY(inserted.endsWith("<p>After</p>"));
        QVERIFY(NotesRichDocument::supportsSource(inserted));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral("<p>BeforeAfter</p>"));

        QTextDocument listDocument;
        listDocument.setHtml("<ul><li><p>List item</p></li></ul>");
        QVERIFY(!NotesRichImages::canInsertAt(listDocument, 1));
        QVERIFY(NotesRichImages::insert(listDocument, 1, 1, dataUrl, "", 32, 16) < 0);
    }

    void imageInsertionRejectsSelectionAcrossBlocks() {
        QTextDocument document;
        document.setHtml("<p>First</p><ul><li><p>Second</p></li></ul>");
        const int firstBlockStart = document.begin().position();
        const int listBlockPosition = document.findBlockByNumber(1).position();
        QVERIFY(NotesRichImages::canInsertAt(document, firstBlockStart + 2));
        QVERIFY(NotesRichImages::insert(document, firstBlockStart + 2, listBlockPosition + 2,
                                         pngDataUrl(), "photo.png", 32, 16) < 0);
        QVERIFY(NotesRichDocument::serialize(document).contains("<ul><li><p>Second</p></li></ul>"));
    }

    void controllerImportsVerifiedLocalImagesWithinBounds() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString imagePath = sandbox.filePath("real-image.png");
        QImage image(48, 24, QImage::Format_ARGB32);
        image.fill(QColor("#22c55e"));
        QVERIFY(image.save(imagePath, "PNG"));

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-rich-image.sqlite")));
        QSignalSpy operations(&controller, &SynapseDataController::fileOperationFinished);
        controller.processNotesRichImage(QUrl::fromLocalFile(imagePath));
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 10000);
        const QVariantMap result = operations.takeFirst().at(0).toMap();
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("operation").toString(), QString("notes-rich-image"));
        QCOMPARE(result.value("width").toInt(), 48);
        QCOMPARE(result.value("height").toInt(), 24);
        QCOMPARE(result.value("fileName").toString(), QString("real-image.png"));
        const QString dataUrl = result.value("imageDataUrl").toString();
        QVERIFY(NotesRichImages::supportsDataUrl(dataUrl));

        const QString largePath = sandbox.filePath("too-large.png");
        QFile largeFile(largePath);
        QVERIFY(largeFile.open(QIODevice::WriteOnly));
        QVERIFY(largeFile.write(QByteArray(2 * 1024 * 1024 + 1, 'x')) > 0);
        largeFile.close();
        controller.processNotesRichImage(QUrl::fromLocalFile(largePath));
        QTRY_COMPARE_WITH_TIMEOUT(operations.count(), 1, 1000);
        const QVariantMap rejected = operations.takeFirst().at(0).toMap();
        QVERIFY(!rejected.value("success").toBool());
        QCOMPARE(rejected.value("operation").toString(), QString("notes-rich-image"));
    }
};

int runNativeNotesRichImagesTest(int argc, char **argv) {
    NativeNotesRichImagesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_images_test.moc"
