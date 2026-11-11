#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

namespace {

QJsonArray queryDatabase(const QString &path, const QString &sql) {
    const QByteArray pathBytes = path.toUtf8();
    const QByteArray sqlBytes = sql.toUtf8();
    Database *database = synapse_db_open(pathBytes.constData());
    if (!database) return {};
    char *raw = synapse_db_query_json(database, sqlBytes.constData());
    QJsonArray result;
    if (raw) {
        result = QJsonDocument::fromJson(QByteArray(raw)).array();
        synapse_free_string(raw);
    }
    synapse_db_close(database);
    return result;
}

}

class NativeVaultCryptoTest final : public QObject {
    Q_OBJECT

private slots:
    void setupEncryptsPreExistingManagedMediaAndRecoveryRestoresIt() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString databasePath = sandbox.filePath("vault-assets.sqlite");
        const QString filesDirectory = sandbox.filePath("files");
        const QString libraryDirectory = sandbox.filePath("library");
        const QString videosDirectory = sandbox.filePath("videos");
        QVERIFY(QDir().mkpath(filesDirectory));
        QVERIFY(QDir().mkpath(libraryDirectory));
        QVERIFY(QDir().mkpath(videosDirectory));

        const QString attachmentPath = sandbox.filePath("files/attachment.bin");
        const QString bookPath = sandbox.filePath("library/book.pdf");
        const QString videoPath = sandbox.filePath("videos/video.mp4");
        const QString subtitlePath = sandbox.filePath("videos/subtitle.srt");
        const QMap<QString, QByteArray> assets = {
            {attachmentPath, QByteArray("private attachment payload")},
            {bookPath, QByteArray("private book payload")},
            {videoPath, QByteArray("private video payload")},
            {subtitlePath, QByteArray("private subtitle payload")},
        };
        for (auto it = assets.cbegin(); it != assets.cend(); ++it) {
            QFile file(it.key());
            QVERIFY(file.open(QIODevice::WriteOnly));
            QCOMPARE(file.write(it.value()), qint64(it.value().size()));
        }

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(databasePath));
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO files (id, name, file_type, local_path) VALUES ('attachment-1', 'Attachment', 'document', '%1')")
                                      .arg(attachmentPath)));
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO library_books (id, title, file_path, original_name) VALUES ('book-1', 'Book', '%1', 'book.pdf')")
                                      .arg(bookPath)));
        const QString subtitleJson = QString("[{\"id\":\"subtitle-1\",\"local_path\":\"%1\"}]")
                                         .arg(subtitlePath);
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO videos (id, title, original_name, file_path, subtitles_json) "
            "VALUES ('video-1', 'Video', 'video.mp4', '%1', '%2')")
                                      .arg(videoPath, subtitleJson)));
        const QString password = "NativeAssetEncryptionPassword42!";
        QVERIFY(controller.setupMasterPassword(password));
        QCOMPARE(queryDatabase(databasePath, "SELECT COUNT(*) AS count FROM vault_asset_migrations")
                     .first().toObject().value("count").toInt(), 0);

        for (auto it = assets.cbegin(); it != assets.cend(); ++it) {
            QFile file(it.key());
            QVERIFY(file.open(QIODevice::ReadOnly));
            QCOMPARE(file.read(4), QByteArray("ENC1"));
            QVERIFY(!file.readAll().contains(it.value()));
        }
        const QString storedAttachmentPath = queryDatabase(databasePath,
            "SELECT local_path FROM files WHERE id = 'attachment-1'")
                                                 .first().toObject().value("local_path").toString();
        QVERIFY(!storedAttachmentPath.contains("attachment.bin"));

        const QString recoveryStagePath = attachmentPath + ".vault-setup-stage-recovery";
        QVERIFY(QFile::copy(attachmentPath, recoveryStagePath));
        QFile interruptedTarget(attachmentPath);
        QVERIFY(interruptedTarget.open(QIODevice::WriteOnly | QIODevice::Truncate));
        QCOMPARE(interruptedTarget.write(assets.value(attachmentPath)),
                 qint64(assets.value(attachmentPath).size()));
        interruptedTarget.close();
        const QString relativeTarget = QDir(sandbox.path()).relativeFilePath(attachmentPath);
        const QString relativeStage = QDir(sandbox.path()).relativeFilePath(recoveryStagePath);
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO vault_asset_migrations (id, target_path, staged_path) VALUES "
            "('recovery-1', '%1', '%2')").arg(relativeTarget, relativeStage)));
        controller.lockVault();
        QVERIFY(controller.unlockVault(password));
        QFile recoveredTarget(attachmentPath);
        QVERIFY(recoveredTarget.open(QIODevice::ReadOnly));
        QCOMPARE(recoveredTarget.read(4), QByteArray("ENC1"));
        QVERIFY(!recoveredTarget.readAll().contains(assets.value(attachmentPath)));
        QVERIFY(!QFile::exists(recoveryStagePath));

        QVERIFY(controller.removeMasterPassword(password));
        for (auto it = assets.cbegin(); it != assets.cend(); ++it) {
            QFile file(it.key());
            QVERIFY(file.open(QIODevice::ReadOnly));
            QCOMPARE(file.readAll(), it.value());
        }
        QCOMPARE(queryDatabase(databasePath,
            "SELECT local_path FROM files WHERE id = 'attachment-1'")
                     .first().toObject().value("local_path").toString(), attachmentPath);
    }

    void setupRejectsUnmanagedAssetsWithoutChangingExistingData() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString databasePath = sandbox.filePath("vault-unmanaged.sqlite");
        const QString externalPath = sandbox.filePath("external-attachment.txt");
        QFile externalFile(externalPath);
        QVERIFY(externalFile.open(QIODevice::WriteOnly));
        QCOMPARE(externalFile.write("do not alter external source"), qint64(28));
        externalFile.close();

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(databasePath));
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO files (id, name, file_type, local_path) VALUES ('external-1', 'External', 'document', '%1')")
                                      .arg(externalPath)));
        QVERIFY(!controller.setupMasterPassword("NativeUnmanagedAssetPassword42!"));
        QVERIFY(!controller.isVaultConfigured());
        QCOMPARE(queryDatabase(databasePath,
            "SELECT local_path FROM files WHERE id = 'external-1'")
                     .first().toObject().value("local_path").toString(), externalPath);
        QVERIFY(externalFile.open(QIODevice::ReadOnly));
        QCOMPARE(externalFile.readAll(), QByteArray("do not alter external source"));
    }

    void setupEncryptsExistingContentAndRemovalRestoresIt() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString databasePath = sandbox.filePath("vault-crypto.sqlite");
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(databasePath));
        QVERIFY(controller.executeSql(
            "INSERT INTO pages (id, title, content) VALUES ('page-1', 'Private note', 'note secret')"));
        QVERIFY(controller.executeSql(
            "INSERT INTO page_history (id, page_id, content) VALUES ('history-1', 'page-1', 'revision secret')"));
        QVERIFY(controller.executeSql(
            "INSERT INTO diagrams (id, title, content) VALUES ('diagram-1', 'Private diagram', 'diagram secret')"));
        QVERIFY(controller.executeSql(
            "INSERT INTO vault_items (id, label, username, password, custom_fields, created_at, updated_at) "
            "VALUES ('vault-1', 'Email', 'private-user', 'private-password', '{\"recovery\":\"private-recovery\"}', 'now', 'now')"));
        QVERIFY(controller.executeSql(
            "INSERT INTO vault_groups (id, name, icon, color, position, created_at, updated_at) "
            "VALUES ('group-1', 'Private group', '🔐', '#123456', 0, 'now', 'now')"));
        QVERIFY(controller.executeSql(
            "INSERT INTO vault_password_history (id, item_id, password, changed_at) "
            "VALUES ('password-history-1', 'vault-1', 'old-private-password', 'now')"));

        const QString password = "NativeEncryptionPassword42!";
        QVERIFY(controller.setupMasterPassword(password));

        const QJsonObject storedPage = queryDatabase(databasePath,
            "SELECT content, encrypted_content FROM pages WHERE id = 'page-1'").first().toObject();
        QCOMPARE(storedPage.value("content").toString(), QString());
        QVERIFY(!storedPage.value("encrypted_content").toString().isEmpty());
        QCOMPARE(controller.getPage("page-1").value("content").toString(), QString("note secret"));

        const QJsonObject storedRevision = queryDatabase(databasePath,
            "SELECT content, encrypted_content FROM page_history WHERE id = 'history-1'").first().toObject();
        QCOMPARE(storedRevision.value("content").toString(), QString());
        QVERIFY(!storedRevision.value("encrypted_content").toString().isEmpty());
        QCOMPARE(controller.getPageHistory("page-1").first().toMap().value("content").toString(),
                 QString("revision secret"));

        const QJsonObject storedDiagram = queryDatabase(databasePath,
            "SELECT content, encrypted_content FROM diagrams WHERE id = 'diagram-1'").first().toObject();
        QCOMPARE(storedDiagram.value("content").toString(), QString());
        QVERIFY(!storedDiagram.value("encrypted_content").toString().isEmpty());
        QCOMPARE(controller.getDiagram("diagram-1").value("content").toString(), QString("diagram secret"));

        const QJsonObject storedVaultItem = queryDatabase(databasePath,
            "SELECT label, username, password, custom_fields FROM vault_items WHERE id = 'vault-1'").first().toObject();
        QVERIFY(!storedVaultItem.value("password").toString().contains("private-password"));
        QVERIFY(!storedVaultItem.value("custom_fields").toString().contains("private-recovery"));
        QCOMPARE(controller.getVaultItems().first().toMap().value("password").toString(),
                 QString("private-password"));
        QCOMPARE(controller.getVaultGroups().first().toMap().value("name").toString(),
                 QString("Private group"));
        const QJsonObject storedGroup = queryDatabase(databasePath,
            "SELECT name, icon, color FROM vault_groups WHERE id = 'group-1'").first().toObject();
        QVERIFY(!storedGroup.value("name").toString().contains("Private group"));

        const QString encryptedHistory = queryDatabase(databasePath,
            "SELECT password FROM vault_password_history WHERE id = 'password-history-1'")
                                             .first().toObject().value("password").toString();
        QVERIFY(!encryptedHistory.contains("old-private-password"));

        controller.lockVault();
        QVERIFY(!controller.savePage("page-1", "Private note", "must not leak", "file"));
        QVERIFY(!controller.saveDiagram("diagram-1", "Private diagram", "must not leak", "🎨"));
        QVERIFY(!controller.saveVaultItem("vault-1", "", "Email", "user", "", "must not leak", "", ""));
        QCOMPARE(queryDatabase(databasePath, "SELECT content FROM pages WHERE id = 'page-1'")
                     .first().toObject().value("content").toString(), QString());

        QVERIFY(controller.changeMasterPassword(password, "NewNativeEncryptionPassword42!"));
        QVERIFY(controller.executeSql("UPDATE keychain SET auth_hash = 'legacy-sha256-verifier'"));
        controller.lockVault();
        QVERIFY(!controller.unlockVault(password));
        QVERIFY(controller.unlockVault("NewNativeEncryptionPassword42!"));
        const QString upgradedVerifier = queryDatabase(databasePath, "SELECT auth_hash FROM keychain")
                                             .first().toObject().value("auth_hash").toString();
        QVERIFY(upgradedVerifier.startsWith("v2:"));
        QVERIFY(controller.removeMasterPassword("NewNativeEncryptionPassword42!"));

        QCOMPARE(queryDatabase(databasePath, "SELECT content FROM pages WHERE id = 'page-1'")
                     .first().toObject().value("content").toString(), QString("note secret"));
        QCOMPARE(queryDatabase(databasePath, "SELECT content FROM page_history WHERE id = 'history-1'")
                     .first().toObject().value("content").toString(), QString("revision secret"));
        QCOMPARE(queryDatabase(databasePath, "SELECT content FROM diagrams WHERE id = 'diagram-1'")
                     .first().toObject().value("content").toString(), QString("diagram secret"));
        QCOMPARE(queryDatabase(databasePath, "SELECT password FROM vault_items WHERE id = 'vault-1'")
                     .first().toObject().value("password").toString(), QString("private-password"));
        QCOMPARE(queryDatabase(databasePath, "SELECT name FROM vault_groups WHERE id = 'group-1'")
                     .first().toObject().value("name").toString(), QString("Private group"));
        QCOMPARE(queryDatabase(databasePath, "SELECT custom_fields FROM vault_items WHERE id = 'vault-1'")
                     .first().toObject().value("custom_fields").toString(),
                 QString("{\"recovery\":\"private-recovery\"}"));
        QCOMPARE(queryDatabase(databasePath,
                     "SELECT password FROM vault_password_history WHERE id = 'password-history-1'")
                     .first().toObject().value("password").toString(), QString("old-private-password"));
    }
};

int runNativeVaultCryptoTest(int argc, char **argv) {
    NativeVaultCryptoTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_vault_crypto_test.moc"
