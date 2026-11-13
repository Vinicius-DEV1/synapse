#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeTrashTest final : public QObject {
    Q_OBJECT

private slots:
    void trashLifecycleAndRestoration() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-trash.sqlite")));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        // Initially empty
        QCOMPARE(controller.getTrashItems().size(), 0);

        const QString ts = QDateTime::currentDateTimeUtc().toString(Qt::ISODate);

        // Insert deleted items across multiple tables
        QVERIFY(controller.executeSql(QString(
            "INSERT INTO pages (id, title, content, updated_at, deleted_at) "
            "VALUES ('page-trash-1', 'Trash Note', '<p>Trashed</p>', '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO library_books (id, title, original_name, updated_at, deleted_at) "
            "VALUES ('book-trash-1', 'Trash Book', 'book.pdf', '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO files (id, name, file_type, updated_at, deleted_at) "
            "VALUES ('file-trash-1', 'trash_doc.pdf', 'document', '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO transactions (id, description, amount, type, category, date, updated_at, deleted_at) "
            "VALUES ('tx-trash-1', 'Trash Expense', 15.5, 'expense', 'Food', '2026-11-13', '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO habits (id, title, color, icon, target_days_per_week, updated_at, deleted_at) "
            "VALUES ('habit-trash-1', 'Trash Habit', 'emerald', 'check', 7, '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO culture_items (id, title, type, updated_at, deleted_at) "
            "VALUES ('culture-trash-1', 'Trash Anime', 'anime', '%1', '%1')").arg(ts)));

        QVERIFY(controller.executeSql(QString(
            "INSERT INTO calendar_events (id, title, updated_at, deleted_at) "
            "VALUES ('event-trash-1', 'Trash Meeting', '%1', '%1')").arg(ts)));

        QVariantList trash = controller.getTrashItems();
        QCOMPARE(trash.size(), 7);

        // Verify item_type values are present
        QSet<QString> expectedTypes = {"page", "book", "file", "finance", "habit", "culture", "calendar"};
        QSet<QString> foundTypes;
        for (const QVariant &itemVar : trash) {
            foundTypes.insert(itemVar.toMap().value("item_type").toString());
        }
        QCOMPARE(foundTypes, expectedTypes);

        // Restore single item (page)
        QVERIFY(controller.restoreTrashItem("page-trash-1", "page"));
        trash = controller.getTrashItems();
        QCOMPARE(trash.size(), 6);

        const QVariantMap restoredPage = controller.getPage("page-trash-1");
        QCOMPARE(restoredPage.value("id").toString(), QString("page-trash-1"));
        QCOMPARE(restoredPage.value("title").toString(), QString("Trash Note"));

        // Restore file
        QVERIFY(controller.restoreTrashItem("file-trash-1", "file"));
        trash = controller.getTrashItems();
        QCOMPARE(trash.size(), 5);

        // Permanently delete transaction
        QVERIFY(controller.deleteTrashItemPermanently("tx-trash-1", "finance"));
        trash = controller.getTrashItems();
        QCOMPARE(trash.size(), 4);

        const QVariantList txList = controller.getTransactions();
        for (const QVariant &txVar : txList) {
            QVERIFY(txVar.toMap().value("id").toString() != "tx-trash-1");
        }

        // Empty trash
        QVERIFY(controller.emptyTrash());
        trash = controller.getTrashItems();
        QCOMPARE(trash.size(), 0);
    }
};

int runNativeTrashTest(int argc, char **argv) {
    NativeTrashTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_trash_test.moc"
