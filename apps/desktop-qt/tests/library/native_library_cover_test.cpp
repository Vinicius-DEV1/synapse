#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QColor>
#include <QtGui/QImage>

class NativeLibraryCoverTest final : public QObject {
    Q_OBJECT

private slots:
    void coverProcessingScalesImageOffTheCallerThreadAndPersistsIt() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath("large-cover.png");
        QImage source(1200, 1600, QImage::Format_RGB32);
        source.fill(QColor("#8b5cf6"));
        QVERIFY(source.save(sourcePath, "PNG"));

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-library-cover.sqlite")));
        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.processLibraryBookCover(QUrl::fromLocalFile(sourcePath));
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 10000);

        const QVariantMap operation = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(operation.value("success").toBool(), qPrintable(operation.value("error").toString()));
        QCOMPARE(operation.value("operation").toString(), QString("library-cover-process"));
        const QString coverDataUrl = operation.value("coverImage").toString();
        QVERIFY(coverDataUrl.startsWith("data:image/"));
        const QByteArray encodedBytes = QByteArray::fromBase64(coverDataUrl.section(',', 1).toLatin1());
        QImage processedImage;
        QVERIFY(processedImage.loadFromData(encodedBytes));
        QVERIFY(processedImage.width() <= 600);
        QVERIFY(processedImage.height() <= 800);

        QVERIFY(controller.createLibraryBook("Cover Test", "Author", 100));
        const QString bookId = controller.getLibraryBooks().first().toMap().value("id").toString();
        QVERIFY(controller.updateLibraryBookMetadata(bookId, "Cover Test", "Author", "Publisher",
                                                      QVariant(), "en", "Description", "not_started", coverDataUrl));
        QCOMPARE(controller.getLibraryBooks().first().toMap().value("cover_image").toString(), coverDataUrl);
    }
};

int runNativeLibraryCoverTest(int argc, char **argv) {
    NativeLibraryCoverTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_library_cover_test.moc"
