#include "synapse_controller.h"
#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_rich_image_editing.h"
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
            "<p>Before</p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"Photo &amp; place\" title=\"Sunset\" data-caption=\"Late light\" data-align=\"right\"/><p>After</p>")
            .arg(sourceUrl);
        QVERIFY(NotesRichDocument::supportsSource(source));

        NotesTextOperations operations;
        const QString editorSource = operations.richSourceForEditor(source);
        QVERIFY(editorSource.contains("<p><img"));
        QTextDocument document;
        document.setHtml(editorSource);
        QVERIFY(NotesRichImages::prepare(document, editorSource));
        QVERIFY(document.resource(QTextDocument::ImageResource, QUrl(sourceUrl)).isValid());
        QCOMPARE(NotesRichDocument::serialize(document), QStringLiteral(
            "<p>Before</p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"Photo &amp; place\" title=\"Sunset\" data-caption=\"Late light\" data-align=\"right\"/><p>After</p>")
            .arg(sourceUrl));

        const int imagePosition = document.findBlockByNumber(1).position();
        const QVariantMap state = NotesRichImages::imageAt(document, imagePosition,
                                                           imagePosition, imagePosition);
        QVERIFY(state.value("valid").toBool());
        QCOMPARE(state.value("alignment").toString(), QString("right"));
        QCOMPARE(state.value("caption").toString(), QString("Late light"));
        QSignalSpy contentChanges(&document, &QTextDocument::contentsChanged);
        QVERIFY(NotesRichImages::setAlignment(document, imagePosition, "right"));
        QVERIFY(NotesRichImages::setCaption(document, imagePosition, " Late light "));
        QCOMPARE(contentChanges.count(), 0);
        QVERIFY(NotesRichImages::setAlignment(document, imagePosition, "left"));
        QVERIFY(NotesRichDocument::serialize(document).contains("data-align=\"left\""));
        document.undo();
        QVERIFY(NotesRichDocument::serialize(document).contains("data-align=\"right\""));
        QVERIFY(NotesRichImages::setCaption(document, imagePosition, "Evening sky"));
        QVERIFY(NotesRichDocument::serialize(document).contains("data-caption=\"Evening sky\""));
        document.undo();
        QVERIFY(NotesRichDocument::serialize(document).contains("data-caption=\"Late light\""));

        QVERIFY(!NotesRichDocument::supportsSource("<p><img src=\"https://example.com/image.png\"/></p>"));
        QVERIFY(!NotesRichDocument::supportsSource(source.left(source.indexOf(" title=")) + " data-custom=\"Caption\"/></p>"));
        QVERIFY(!NotesRichDocument::supportsSource(QStringLiteral(
            "<p><img src=\"%1\" data-align=\"diagonal\"/></p>").arg(sourceUrl)));
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

    void imageSizeEditsPreserveAttributeModesAndUndo() {
        const QString dataUrl = pngDataUrl();
        const QString source = QStringLiteral("<p><img src=\"%1\" width=\"32\" height=\"16\"/></p>")
            .arg(dataUrl);
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichImages::prepare(document, source));
        const int imagePosition = document.begin().position();
        QCOMPARE(NotesRichImages::imageData(document, imagePosition), dataUrl);

        QSignalSpy contentChanges(&document, &QTextDocument::contentsChanged);
        QVERIFY(NotesRichImages::setSize(document, imagePosition, 32, 16));
        QCOMPARE(contentChanges.count(), 0);
        QVERIFY(NotesRichImages::setSize(document, imagePosition, 64, -1));
        QString resized = NotesRichDocument::serialize(document);
        QVERIFY(resized.contains("width=\"64\""));
        QVERIFY(!resized.contains("height=\""));
        QVariantMap image = NotesRichImages::imageAt(document, imagePosition, imagePosition, imagePosition);
        QCOMPARE(image.value("width").toInt(), 64);
        QCOMPARE(image.value("height").toInt(), 32);
        QVERIFY(image.value("hasWidth").toBool());
        QVERIFY(!image.value("hasHeight").toBool());
        document.undo();
        QVERIFY(NotesRichDocument::serialize(document).contains("width=\"32\" height=\"16\""));

        QVERIFY(NotesRichImages::setSize(document, imagePosition, 80, 60));
        QVERIFY(NotesRichDocument::serialize(document).contains("width=\"80\" height=\"60\""));
        document.undo();
        QVERIFY(NotesRichImages::setSize(document, imagePosition, -1, -1));
        resized = NotesRichDocument::serialize(document);
        QVERIFY(!resized.contains("width=\""));
        QVERIFY(!resized.contains("height=\""));
        image = NotesRichImages::imageAt(document, imagePosition, imagePosition, imagePosition);
        QCOMPARE(image.value("width").toInt(), 32);
        QCOMPARE(image.value("height").toInt(), 16);
        document.undo();
        QVERIFY(NotesRichDocument::serialize(document).contains("width=\"32\" height=\"16\""));
        QVERIFY(!NotesRichImages::setSize(document, imagePosition, 59, -1));
        QVERIFY(!NotesRichImages::setSize(document, imagePosition, 60, 8193));
    }

    void imageBlockMovesPreserveMetadataAndUndo() {
        const QString source = QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"photo.png\" data-caption=\"Evening\" data-align=\"right\"/></p><h2>After</h2>")
            .arg(pngDataUrl());
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichImages::prepare(document, source));
        const QString original = NotesRichDocument::serialize(document);
        const int imagePosition = document.findBlockByNumber(1).position();
        QVERIFY(NotesRichImageEditing::canMove(document, imagePosition, true));
        QVERIFY(NotesRichImageEditing::canMove(document, imagePosition, false));

        int movedPosition = NotesRichImageEditing::move(document, imagePosition, true);
        QVERIFY(movedPosition >= 0);
        QString moved = NotesRichDocument::serialize(document);
        QVERIFY(moved.indexOf("<img") < moved.indexOf("<p>Before</p>"));
        QVERIFY(moved.contains("data-caption=\"Evening\""));
        QVERIFY(moved.contains("data-align=\"right\""));
        QVERIFY(moved.indexOf("After") > moved.indexOf("<h2"));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        movedPosition = NotesRichImageEditing::move(document, imagePosition, false);
        QVERIFY(movedPosition >= 0);
        moved = NotesRichDocument::serialize(document);
        QVERIFY(moved.indexOf("After") < moved.indexOf("<img"));
        QVERIFY(moved.contains("data-caption=\"Evening\""));
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);
    }

    void imageMovementRespectsStructureAndParagraphInsertionIsUndoable() {
        const QString image = QStringLiteral("<img src=\"%1\" width=\"32\" height=\"16\"/>")
            .arg(pngDataUrl());
        const QString structuredSource = "<p>" + image + "</p><ul><li><p>List item</p></li></ul>";
        QTextDocument structured;
        structured.setHtml(structuredSource);
        QVERIFY(NotesRichImages::prepare(structured, structuredSource));
        const int structuredImagePosition = structured.begin().position();
        QVERIFY(!NotesRichImageEditing::canMove(structured, structuredImagePosition, true));
        QVERIFY(!NotesRichImageEditing::canMove(structured, structuredImagePosition, false));
        QCOMPARE(NotesRichImageEditing::move(structured, structuredImagePosition, false), -1);

        const QString source = QStringLiteral("<p>Before</p><p>%1</p><p>After</p>").arg(image);
        QTextDocument document;
        document.setHtml(source);
        QVERIFY(NotesRichImages::prepare(document, source));
        const QString original = NotesRichDocument::serialize(document);
        const int imagePosition = document.findBlockByNumber(1).position();
        const int paragraphPosition = NotesRichImageEditing::insertParagraphBelow(document, imagePosition);
        QVERIFY(paragraphPosition >= 0);
        QString inserted = NotesRichDocument::serialize(document);
        QVERIFY(inserted.indexOf("<img") < inserted.indexOf("<p>After</p>"));
        const QTextBlock afterBlock = document.findBlock(document.find("After").position());
        QVERIFY(afterBlock.previous().text().isEmpty());
        document.undo();
        QCOMPARE(NotesRichDocument::serialize(document), original);

        const QString edgeSource = QStringLiteral("<p>%1</p><p>After</p>").arg(image);
        QTextDocument edges;
        edges.setHtml(edgeSource);
        QVERIFY(NotesRichImages::prepare(edges, edgeSource));
        int edgeImagePosition = edges.begin().position();
        QVERIFY(!NotesRichImageEditing::canMove(edges, edgeImagePosition, true));
        QVERIFY(NotesRichImageEditing::canMove(edges, edgeImagePosition, false));
        edgeImagePosition = NotesRichImageEditing::move(edges, edgeImagePosition, false);
        QVERIFY(edgeImagePosition >= 0);
        QVERIFY(NotesRichImageEditing::canMove(edges, edgeImagePosition, true));
        QVERIFY(!NotesRichImageEditing::canMove(edges, edgeImagePosition, false));
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
