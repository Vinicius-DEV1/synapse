#include "synapse_controller.h"

#include <QtCore/QFile>
#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeFilesTest final : public QObject {
    Q_OBJECT

private slots:
    void encryptedFileImportPreviewAndExportSurvivePasswordRemoval() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString sourcePath = sandbox.filePath("study-notes.txt");
        const QString exportPath = sandbox.filePath("exported-notes.txt");
        const QByteArray content("Native file preview remains protected while the vault is locked.\n");
        QFile sourceFile(sourcePath);
        QVERIFY(sourceFile.open(QIODevice::WriteOnly));
        QCOMPARE(sourceFile.write(content), static_cast<qint64>(content.size()));
        sourceFile.close();

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-files.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeFilesPassword42!"));
        const QString folderId = controller.createFileFolder("Research");
        QVERIFY(!folderId.isEmpty());

        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.importLocalFile(sourcePath, folderId);
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap importResult = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(importResult.value("success").toBool(), qPrintable(importResult.value("error").toString()));

        const QVariantList files = controller.getFiles(folderId);
        QCOMPARE(files.size(), 1);
        const QVariantMap file = files.first().toMap();
        const QString fileId = file.value("id").toString();

        QSignalSpy previewSpy(&controller, &SynapseDataController::filePreviewReady);
        controller.previewLocalFile(fileId, QStringLiteral("notes-audio-request"));
        controller.cancelFilePreview(QStringLiteral("unrelated-audio-request"));
        QTRY_COMPARE_WITH_TIMEOUT(previewSpy.count(), 1, 15000);
        const QVariantMap preview = previewSpy.takeFirst().at(0).toMap();
        QVERIFY2(preview.value("success").toBool(), qPrintable(preview.value("error").toString()));
        QCOMPARE(preview.value("request_id").toString(), QStringLiteral("notes-audio-request"));
        const QString previewPath = preview.value("path").toString();
        const QVariantMap previewText = controller.readFilePreviewText(previewPath);
        QVERIFY2(previewText.value("success").toBool(), qPrintable(previewText.value("error").toString()));
        QCOMPARE(previewText.value("text").toString(), QString::fromUtf8(content));
        controller.closeFilePreview(previewPath);
        QVERIFY(!QFile::exists(previewPath));

        controller.previewLocalFile(QStringLiteral("missing-file"),
                                    QStringLiteral("notes-audio-missing-request"));
        QCOMPARE(previewSpy.count(), 1);
        const QVariantMap missingPreview = previewSpy.takeFirst().at(0).toMap();
        QVERIFY(!missingPreview.value("success").toBool());
        QCOMPARE(missingPreview.value("request_id").toString(),
                 QStringLiteral("notes-audio-missing-request"));

        controller.exportLocalFile(fileId, exportPath);
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap exportResult = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(exportResult.value("success").toBool(), qPrintable(exportResult.value("error").toString()));
        QFile exportedFile(exportPath);
        QVERIFY(exportedFile.open(QIODevice::ReadOnly));
        QCOMPARE(exportedFile.readAll(), content);
        exportedFile.close();

        QVERIFY(controller.removeMasterPassword("NativeFilesPassword42!"));
        const QString localPath = controller.getFiles(folderId).first().toMap().value("local_path").toString();
        QFile migratedFile(sandbox.filePath(localPath));
        QVERIFY(migratedFile.open(QIODevice::ReadOnly));
        QCOMPARE(migratedFile.readAll(), content);
    }

    void folderManagementAndFileOperations() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-files-folders.sqlite")));

        // Create root folder
        const QString rootFolderId = controller.createFileFolder("Documents", "", "#3b82f6");
        QVERIFY(!rootFolderId.isEmpty());

        // Create subfolder
        const QString subFolderId = controller.createFileFolder("Research", rootFolderId, "#10b981");
        QVERIFY(!subFolderId.isEmpty());

        // Verify folder hierarchy
        QVariantList rootFolders = controller.getFileFolders("");
        QCOMPARE(rootFolders.size(), 1);
        QCOMPARE(rootFolders.first().toMap().value("name").toString(), QString("Documents"));

        QVariantList subFolders = controller.getFileFolders(rootFolderId);
        QCOMPARE(subFolders.size(), 1);
        QCOMPARE(subFolders.first().toMap().value("name").toString(), QString("Research"));

        // Rename subfolder
        QVERIFY(controller.renameFileFolder(subFolderId, "Deep Research"));
        subFolders = controller.getFileFolders(rootFolderId);
        QCOMPARE(subFolders.first().toMap().value("name").toString(), QString("Deep Research"));

        // Move subfolder to root
        QVERIFY(controller.moveFileFolder(subFolderId, ""));
        rootFolders = controller.getFileFolders("");
        QCOMPARE(rootFolders.size(), 2);

        // Delete folder
        QVERIFY(controller.deleteFileFolder(subFolderId));
        rootFolders = controller.getFileFolders("");
        QCOMPARE(rootFolders.size(), 1);
        QCOMPARE(rootFolders.first().toMap().value("id").toString(), rootFolderId);
    }
};

int runNativeFilesTest(int argc, char **argv) {
    NativeFilesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_files_test.moc"
