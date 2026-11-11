#include "synapse_controller.h"
#include "native_book_reader.h"
#include "native_book_search.h"
#include "controllers/library/library_metadata_controller.h"

#include <archive.h>
#include <archive_entry.h>
#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QTemporaryDir>
#include <QtGui/QColor>
#include <QtGui/QImage>
#include <QtCore/QStandardPaths>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
static bool writeEpubEntry(struct archive *writer, const QByteArray &name, const QByteArray &content) {
    struct archive_entry *entry = archive_entry_new();
    if (!entry) return false;
    archive_entry_set_pathname(entry, name.constData());
    archive_entry_set_filetype(entry, AE_IFREG);
    archive_entry_set_perm(entry, 0644);
    archive_entry_set_size(entry, content.size());
    const bool written = archive_write_header(writer, entry) == ARCHIVE_OK &&
                         archive_write_data(writer, content.constData(), static_cast<size_t>(content.size())) == content.size();
    archive_entry_free(entry);
    return written;
}

static bool createEpubFixture(const QString &path) {
    QImage cover(40, 60, QImage::Format_ARGB32);
    cover.fill(QColor("#6d28d9"));
    QByteArray coverBytes;
    QBuffer coverBuffer(&coverBytes);
    if (!coverBuffer.open(QIODevice::WriteOnly) || !cover.save(&coverBuffer, "PNG")) return false;

    struct archive *writer = archive_write_new();
    if (!writer) return false;
    archive_write_set_format_zip(writer);
    archive_write_set_options(writer, "zip:compression=store");
    const QByteArray pathBytes = path.toUtf8();
    bool success = archive_write_open_filename(writer, pathBytes.constData()) == ARCHIVE_OK;
    success = success && writeEpubEntry(writer, "mimetype", "application/epub+zip");
    success = success && writeEpubEntry(writer, "META-INF/container.xml",
        "<container><rootfiles><rootfile full-path=\"OEBPS/content.opf\"/></rootfiles></container>");
    success = success && writeEpubEntry(writer, "OEBPS/content.opf",
        "<package xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><metadata><dc:title>Native Reader</dc:title>"
        "<dc:creator>Ada</dc:creator><meta name=\"cover\" content=\"cover\"/></metadata><manifest>"
        "<item id=\"cover\" href=\"images/cover.png\" media-type=\"image/png\" properties=\"cover-image\"/>"
        "<item id=\"one\" href=\"text/chapter-one.xhtml\" media-type=\"application/xhtml+xml\"/>"
        "<item id=\"two\" href=\"text/chapter-two.xhtml\" media-type=\"application/xhtml+xml\"/>"
        "</manifest><spine><itemref idref=\"one\"/><itemref idref=\"two\"/></spine></package>");
    success = success && writeEpubEntry(writer, "OEBPS/images/cover.png", coverBytes);
    success = success && writeEpubEntry(writer, "OEBPS/text/chapter-one.xhtml",
        "<html><head><title>Chapter One</title></head><body><h1>Chapter One</h1><p>First native chapter.</p>"
        "<script>alert('blocked')</script></body></html>");
    success = success && writeEpubEntry(writer, "OEBPS/text/chapter-two.xhtml",
        "<html><head><title>Chapter Two</title></head><body><h1>Chapter Two</h1><p>Second native chapter.</p></body></html>");
    success = success && archive_write_close(writer) == ARCHIVE_OK;
    archive_write_free(writer);
    return success;
}

static bool createPdfFixture(const QString &path) {
    const QByteArray stream("BT /F1 12 Tf 72 720 Td (Native PDF sample text for selection.) Tj ET\n");
    const QList<QByteArray> objects{
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        "<< /Length " + QByteArray::number(stream.size()) + " >>\nstream\n" + stream + "endstream"
    };
    QByteArray pdf("%PDF-1.4\n");
    QList<qint64> offsets;
    for (qsizetype index = 0; index < objects.size(); ++index) {
        offsets.append(pdf.size());
        pdf += QByteArray::number(index + 1) + " 0 obj\n" + objects.at(index) + "\nendobj\n";
    }
    const qint64 xrefOffset = pdf.size();
    pdf += "xref\n0 6\n0000000000 65535 f \n";
    for (qint64 offset : offsets) {
        pdf += QByteArray::number(offset).rightJustified(10, '0') + " 00000 n \n";
    }
    pdf += "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + QByteArray::number(xrefOffset) + "\n%%EOF\n";
    QFile file(path);
    if (!file.open(QIODevice::WriteOnly)) return false;
    const bool written = file.write(pdf) == pdf.size();
    file.close();
    return written && QFileInfo(path).size() == pdf.size();
}
class NativeLibraryTest final : public QObject {
    Q_OBJECT

private slots:
    void openLibraryMetadataParserMapsOpenLibraryFields() {
        const QByteArray response = R"({"docs":[{"title":"Native Library Fixture",
            "author_name":["Ada Example","Bob Writer"],"publisher":["North Press"],
            "first_publish_year":2024,"cover_i":12345,"language":["eng","por"]}]})";
        const QVariantMap parsed = parseOpenLibraryMetadata(response);
        QVERIFY(parsed.value("success").toBool());
        QVERIFY(parsed.value("found").toBool());
        const QVariantMap metadata = parsed.value("metadata").toMap();
        QCOMPARE(metadata.value("title").toString(), QString("Native Library Fixture"));
        QCOMPARE(metadata.value("author").toString(), QString("Ada Example, Bob Writer"));
        QCOMPARE(metadata.value("publisher").toString(), QString("North Press"));
        QCOMPARE(metadata.value("publishedYear").toInt(), 2024);
        QCOMPARE(metadata.value("language").toString(), QString("pt"));
        QCOMPARE(metadata.value("coverImage").toString(),
                 QString("https://covers.openlibrary.org/b/id/12345-L.jpg"));

        const QVariantMap empty = parseOpenLibraryMetadata(R"({"docs":[]})");
        QVERIFY(empty.value("success").toBool());
        QVERIFY(!empty.value("found").toBool());
        QVERIFY(!parseOpenLibraryMetadata(QByteArray("invalid-json")).value("success").toBool());
    }

    void nativeEpubSearchFindsChapterAndSnippet() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString epubPath = sandbox.filePath("Search Fixture.epub");
        QVERIFY(createEpubFixture(epubPath));

        const QVariantMap result = searchNativeBookText(epubPath, "epub", "SECOND NATIVE CHAPTER");
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("totalMatches").toLongLong(), 1LL);
        const QVariantList matches = result.value("results").toList();
        QCOMPARE(matches.size(), 1);
        QCOMPARE(matches.first().toMap().value("pageNumber").toInt(), 2);
        QCOMPARE(matches.first().toMap().value("pageTitle").toString(), QString("Chapter Two"));
        QVERIFY(matches.first().toMap().value("snippet").toString().contains("Second native chapter."));
    }

    void nativePdfSearchFindsPageText() {
        if (QStandardPaths::findExecutable("pdftotext").isEmpty()) QSKIP("Poppler pdftotext is unavailable.");
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString pdfPath = sandbox.filePath("Search Fixture.pdf");
        QVERIFY(createPdfFixture(pdfPath));

        const QVariantMap result = searchNativeBookText(pdfPath, "pdf", "PDF sample text");
        QVERIFY2(result.value("success").toBool(), qPrintable(result.value("error").toString()));
        QCOMPARE(result.value("totalMatches").toLongLong(), 1LL);
        const QVariantList matches = result.value("results").toList();
        QCOMPARE(matches.size(), 1);
        QCOMPARE(matches.first().toMap().value("pageNumber").toInt(), 1);
        QVERIFY(matches.first().toMap().value("snippet").toString().contains("Native PDF sample text"));
    }

    void nativeLibraryStatusAndArchiveActions() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-library-actions.sqlite")));
        QVERIFY(controller.createLibraryBook("Action Fixture", "Test Author", 40));
        const QString bookId = controller.getLibraryBooks().first().toMap().value("id").toString();
        QVERIFY(!bookId.isEmpty());

        QVERIFY(controller.updateLibraryBookMetadata(bookId, "Edited Fixture", "New Author", "North Press",
                                                      2021, "en", "Updated description.", "reading",
                                                      "data:image/jpeg;base64,ZmFrZQ=="));
        QVariantMap book = controller.getLibraryBooks().first().toMap();
        QCOMPARE(book.value("title").toString(), QString("Edited Fixture"));
        QCOMPARE(book.value("author").toString(), QString("New Author"));
        QCOMPARE(book.value("publisher").toString(), QString("North Press"));
        QCOMPARE(book.value("published_year").toInt(), 2021);
        QCOMPARE(book.value("language").toString(), QString("en"));
        QCOMPARE(book.value("description").toString(), QString("Updated description."));
        QCOMPARE(book.value("cover_image").toString(), QString("data:image/jpeg;base64,ZmFrZQ=="));
        QVERIFY(!controller.updateLibraryBookMetadata(bookId, "", "", "", QVariant(), "", "", "reading", ""));

        QVERIFY(controller.updateLibraryBookStatus(bookId, "reading"));
        QCOMPARE(controller.getLibraryBooks().first().toMap().value("reading_status").toString(), QString("reading"));
        QVERIFY(controller.updateLibraryBookStatus(bookId, "finished"));
        QCOMPARE(controller.getLibraryBooks().first().toMap().value("reading_status").toString(), QString("finished"));
        QVERIFY(!controller.updateLibraryBookStatus(bookId, "archived"));

        QVERIFY(controller.setLibraryBookArchived(bookId, true));
        book = controller.getLibraryBooks().first().toMap();
        QVERIFY(book.value("is_archived").toBool());
        QVERIFY(!book.value("archived_at").toString().isEmpty());
        QVERIFY(controller.setLibraryBookArchived(bookId, false));
        book = controller.getLibraryBooks().first().toMap();
        QVERIFY(!book.value("is_archived").toBool());
        QVERIFY(book.value("archived_at").isNull());
    }

    void nativeLibraryCollectionCrudAndAssignments() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-library-collections.sqlite")));
        QVERIFY(controller.createLibraryBook("Collection Fixture", "Test Author", 40));
        const QString bookId = controller.getLibraryBooks().first().toMap().value("id").toString();
        QVERIFY(!bookId.isEmpty());

        const QString firstId = controller.createLibraryCollection("Reading", "#8b5cf6");
        const QString secondId = controller.createLibraryCollection("Reference", "#10b981");
        QVERIFY(!firstId.isEmpty());
        QVERIFY(!secondId.isEmpty());
        QVERIFY(controller.createLibraryCollection("", "#ffffff").isEmpty());
        QCOMPARE(controller.getLibraryCollections().size(), 2);

        QVERIFY(controller.setBookCollections(bookId, {firstId, secondId, firstId}));
        QVariantList assigned = controller.getLibraryBooks().first().toMap().value("collections").toList();
        QCOMPARE(assigned.size(), 2);
        QVERIFY(!controller.setBookCollections(bookId, {firstId, QStringLiteral("missing-collection")}));
        QCOMPARE(controller.getLibraryBooks().first().toMap().value("collections").toList().size(), 2);

        QVERIFY(controller.updateLibraryCollection(firstId, "Reading List", "#6366f1"));
        assigned = controller.getLibraryBooks().first().toMap().value("collections").toList();
        QCOMPARE(assigned.first().toMap().value("name").toString(), QString("Reading List"));
        QCOMPARE(assigned.first().toMap().value("color").toString(), QString("#6366f1"));

        QVERIFY(controller.setBookCollections(bookId, {secondId}));
        assigned = controller.getLibraryBooks().first().toMap().value("collections").toList();
        QCOMPARE(assigned.size(), 1);
        QCOMPARE(assigned.first().toMap().value("id").toString(), secondId);
        QVERIFY(controller.deleteLibraryCollection(secondId));
        QCOMPARE(controller.getLibraryCollections().size(), 1);
        QVERIFY(controller.getLibraryBooks().first().toMap().value("collections").toList().isEmpty());
        QVERIFY(!controller.deleteLibraryCollection(secondId));
    }

    void nativeLibraryReadingSessionsAndStats() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-library-reading-stats.sqlite")));
        QVERIFY(controller.createLibraryBook("Reading Stats Fixture", "Test Author", 100));
        const QString bookId = controller.getLibraryBooks().first().toMap().value("id").toString();
        QVERIFY(!bookId.isEmpty());
        QVERIFY(controller.updateLibraryBookStatus(bookId, "reading"));

        const QString sessionId = controller.startLibraryReadingSession(bookId, 10);
        QVERIFY(!sessionId.isEmpty());
        QTest::qWait(20);
        QVERIFY(controller.updateBookProgress(bookId, 13, 100));
        QVERIFY(controller.endLibraryReadingSession(sessionId, 13));
        QVERIFY(!controller.endLibraryReadingSession(sessionId, 13));

        QVariantMap stats = controller.getLibraryReadingStats();
        QCOMPARE(stats.value("totalBooksStarted").toInt(), 1);
        QCOMPARE(stats.value("totalPagesRead").toLongLong(), 4LL);
        QCOMPARE(stats.value("currentStreak").toInt(), 1);
        QCOMPARE(stats.value("readingDays").toList().size(), 1);

        const QString lockedSessionId = controller.startLibraryReadingSession(bookId, 13);
        QVERIFY(!lockedSessionId.isEmpty());
        controller.lockVault();
        stats = controller.getLibraryReadingStats();
        QCOMPARE(stats.value("totalPagesRead").toLongLong(), 5LL);
        QVERIFY(!controller.startLibraryReadingSession(bookId, 13).isEmpty());
    }

    void nativeLibraryImportProgressAndPasswordRemoval() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath("Native Reader - Ada.epub");
        QVERIFY(createEpubFixture(sourcePath));
        const QVariantMap epubMetadata = inspectNativeEpubMetadata(sourcePath);
        QVERIFY2(epubMetadata.value("success").toBool(), qPrintable(epubMetadata.value("error").toString()));
        QCOMPARE(epubMetadata.value("title").toString(), QString("Native Reader"));
        QCOMPARE(epubMetadata.value("author").toString(), QString("Ada"));
        QCOMPARE(epubMetadata.value("totalPages").toInt(), 2);
        QVERIFY(epubMetadata.value("coverImage").toString().startsWith("data:image/jpeg;base64,"));
        QFile sourceFile(sourcePath);
        QVERIFY(sourceFile.open(QIODevice::ReadOnly));
        const QByteArray sourceBytes = sourceFile.readAll();
        sourceFile.close();

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-library.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeLibraryPassword42!"));

        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.importLibraryBook(sourcePath);
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap importResult = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(importResult.value("success").toBool(), qPrintable(importResult.value("error").toString()));
        QCOMPARE(importResult.value("operation").toString(), QString("library-import"));

        QVariantList books = controller.getLibraryBooks("Native Reader");
        QCOMPARE(books.size(), 1);
        QVariantMap book = books.first().toMap();
        QCOMPARE(book.value("title").toString(), QString("Native Reader"));
        QCOMPARE(book.value("author").toString(), QString("Ada"));
        QCOMPARE(book.value("total_pages").toInt(), 2);
        QVERIFY(book.value("cover_image").toString().startsWith("data:image/jpeg;base64,"));
        QCOMPARE(book.value("original_name").toString(), QString("Native Reader - Ada.epub"));
        QCOMPARE(book.value("reading_status").toString(), QString("not_started"));
        QVERIFY(book.value("is_local").toBool());

        const QString relativePath = book.value("file_path").toString();
        const QString storedPath = sandbox.filePath(relativePath);
        QFile encryptedBook(storedPath);
        QVERIFY(encryptedBook.open(QIODevice::ReadOnly));
        QCOMPARE(encryptedBook.read(4), QByteArray("ENC1"));
        encryptedBook.close();

        const QString bookId = book.value("id").toString();
        QSignalSpy bookReadySpy(&controller, &SynapseDataController::libraryBookReady);
        controller.openLibraryBook(bookId);
        QTRY_COMPARE_WITH_TIMEOUT(bookReadySpy.count(), 1, 15000);
        const QVariantMap openedBook = bookReadySpy.takeFirst().at(0).toMap();
        QVERIFY2(openedBook.value("success").toBool(), qPrintable(openedBook.value("error").toString()));
        QCOMPARE(openedBook.value("format").toString(), QString("epub"));
        QCOMPARE(openedBook.value("totalPages").toInt(), 2);
        const QVariantList chapters = openedBook.value("chapters").toList();
        QCOMPARE(chapters.size(), 2);
        QCOMPARE(chapters.first().toMap().value("title").toString(), QString("Chapter One"));
        QVERIFY(!chapters.first().toMap().value("html").toString().contains("<script", Qt::CaseInsensitive));
        QSignalSpy searchSpy(&controller, &SynapseDataController::libraryBookSearchReady);
        controller.searchLibraryBookText(openedBook.value("path").toString(), "epub", "second native chapter", 71);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 15000);
        const QVariantMap epubSearch = searchSpy.takeFirst().at(0).toMap();
        QVERIFY2(epubSearch.value("success").toBool(), qPrintable(epubSearch.value("error").toString()));
        QCOMPARE(epubSearch.value("requestId").toInt(), 71);
        QCOMPARE(epubSearch.value("totalMatches").toLongLong(), 1LL);
        QCOMPARE(epubSearch.value("results").toList().first().toMap().value("pageNumber").toInt(), 2);
        QVERIFY(controller.createLibraryBookmark(bookId, 1, "Chapter One"));
        QCOMPARE(controller.getLibraryBookmarks(bookId).size(), 1);
        const QString bookmarkId = controller.getLibraryBookmarks(bookId).first().toMap().value("id").toString();
        QVERIFY(controller.updateLibraryBookmark(bookmarkId, "Chapter One's return"));
        QCOMPARE(controller.getLibraryBookmarks(bookId).first().toMap().value("label").toString(),
                 QString("Chapter One's return"));
        QVERIFY(controller.createLibraryHighlight(bookId, 1, "First native chapter.", "yellow", "Key idea"));
        QCOMPARE(controller.getLibraryHighlights(bookId).size(), 1);
        const QString highlightId = controller.getLibraryHighlights(bookId).first().toMap().value("id").toString();
        QVERIFY(controller.updateLibraryHighlight(highlightId, "Teacher's annotation", "orange"));
        const QVariantMap updatedHighlight = controller.getLibraryHighlights(bookId).first().toMap();
        QCOMPARE(updatedHighlight.value("note").toString(), QString("Teacher's annotation"));
        QCOMPARE(updatedHighlight.value("color").toString(), QString("orange"));
        QVERIFY(controller.deleteLibraryHighlight(highlightId));
        QVERIFY(controller.deleteLibraryBookmark(bookmarkId));
        QVERIFY(controller.getLibraryHighlights(bookId).isEmpty());
        QVERIFY(controller.getLibraryBookmarks(bookId).isEmpty());
        QVERIFY(controller.createLibraryHighlight(bookId, 1, "First native chapter.", "yellow", "First note"));
        QVERIFY(controller.createLibraryHighlight(bookId, 2, "Second native chapter.", "blue", "Second note"));
        QCOMPARE(controller.getLibraryHighlights(bookId).size(), 2);
        QVERIFY(controller.deleteLibraryHighlightsForBook(bookId));
        QVERIFY(controller.getLibraryHighlights(bookId).isEmpty());
        QVERIFY(!controller.updateLibraryHighlight(QString(), "ignored", "yellow"));
        QVERIFY(!controller.deleteLibraryBookmark(QString()));
        QVERIFY(!controller.deleteLibraryHighlightsForBook(QString()));
        const QString readerTemporaryPath = openedBook.value("path").toString();
        QVERIFY(QFile::exists(readerTemporaryPath));
        controller.closeLibraryBook(readerTemporaryPath);
        QVERIFY(!QFile::exists(readerTemporaryPath));

        const QString pdfSourcePath = sandbox.filePath("Native Paper.pdf");
        QVERIFY(createPdfFixture(pdfSourcePath));
        controller.importLibraryBook(pdfSourcePath);
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap pdfImportResult = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(pdfImportResult.value("success").toBool(), qPrintable(pdfImportResult.value("error").toString()));
        const QVariantMap pdfBook = controller.getLibraryBooks("Native Paper").first().toMap();
        const QString pdfBookId = pdfBook.value("id").toString();
        controller.openLibraryBook(pdfBookId);
        QTRY_COMPARE_WITH_TIMEOUT(bookReadySpy.count(), 1, 15000);
        const QVariantMap openedPdf = bookReadySpy.takeFirst().at(0).toMap();
        QVERIFY2(openedPdf.value("success").toBool(), qPrintable(openedPdf.value("error").toString()));
        QCOMPARE(openedPdf.value("format").toString(), QString("pdf"));
        QCOMPARE(openedPdf.value("totalPages").toInt(), 1);
        const QString pdfTemporaryPath = openedPdf.value("path").toString();

        if (!QStandardPaths::findExecutable("pdftotext").isEmpty()) {
            controller.searchLibraryBookText(pdfTemporaryPath, "pdf", "PDF sample text", 72);
            QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 15000);
            const QVariantMap pdfSearch = searchSpy.takeFirst().at(0).toMap();
            QVERIFY2(pdfSearch.value("success").toBool(), qPrintable(pdfSearch.value("error").toString()));
            QCOMPARE(pdfSearch.value("requestId").toInt(), 72);
            QCOMPARE(pdfSearch.value("totalMatches").toLongLong(), 1LL);
            QCOMPARE(pdfSearch.value("results").toList().first().toMap().value("pageNumber").toInt(), 1);
        }

        QSignalSpy pdfPageSpy(&controller, &SynapseDataController::libraryPdfPageReady);
        controller.renderLibraryPdfPage(pdfTemporaryPath, 1, 1200);
        QTRY_COMPARE_WITH_TIMEOUT(pdfPageSpy.count(), 1, 15000);
        const QVariantMap renderedPage = pdfPageSpy.takeFirst().at(0).toMap();
        QVERIFY2(renderedPage.value("success").toBool(), qPrintable(renderedPage.value("error").toString()));
        QVERIFY(QFile::exists(renderedPage.value("path").toString()));
        QVERIFY(renderedPage.value("text").toString().contains("Native PDF sample text"));
        controller.closeLibraryBook(renderedPage.value("path").toString());
        controller.closeLibraryBook(pdfTemporaryPath);

        QVERIFY(controller.updateBookProgress(bookId, 12, 20));
        books = controller.getLibraryBooks();
        book = books.first().toMap();
        QCOMPARE(book.value("current_page").toInt(), 12);
        QCOMPARE(book.value("reading_status").toString(), QString("reading"));
        QVERIFY(controller.updateBookProgress(bookId, 20, 20));
        QCOMPARE(controller.getLibraryBooks().first().toMap().value("reading_status").toString(), QString("finished"));

        QVERIFY(controller.removeMasterPassword("NativeLibraryPassword42!"));
        QFile migratedBook(storedPath);
        QVERIFY(migratedBook.open(QIODevice::ReadOnly));
        QVERIFY(migratedBook.read(4) != QByteArray("ENC1"));
        QCOMPARE(migratedBook.readAll(), sourceBytes.mid(4));
        migratedBook.close();

        QVERIFY(controller.deleteLibraryBook(bookId));
        const QVariantList remainingBooks = controller.getLibraryBooks();
        QCOMPARE(remainingBooks.size(), 1);
        QCOMPARE(remainingBooks.first().toMap().value("id").toString(), pdfBookId);
        QVERIFY(QFile::exists(storedPath));
    }
};

int runNativeLibraryTest(int argc, char **argv) {
    NativeLibraryTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_library_test.moc"
