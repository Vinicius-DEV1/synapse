#include "synapse_controller.h"

#include <QtCore/QFileInfo>
#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeSettingsTest final : public QObject {
    Q_OBJECT

private slots:
    void systemDiagnosticsAndTelemetry() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-settings.sqlite");
        QVERIFY(controller.openDatabase(dbPath));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        const QVariantMap diag = controller.getSystemDiagnostics();
        QCOMPARE(diag.value("db_path").toString(), dbPath);
        QVERIFY(diag.value("db_size_bytes").toLongLong() > 0);
        QVERIFY(diag.value("wal_size_bytes").toLongLong() >= 0);
        QVERIFY(!diag.value("qt_version").toString().isEmpty());
        QVERIFY(!diag.value("os_name").toString().isEmpty());
        QVERIFY(!diag.value("cpu_arch").toString().isEmpty());
        QVERIFY(diag.value("table_count").toInt() > 20);
    }

    void databaseMaintenanceAndBackup() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-settings-bkp.sqlite");
        QVERIFY(controller.openDatabase(dbPath));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        const QString backupDir = sandbox.filePath("backups");
        const QString backupPath = controller.exportDatabaseBackup(backupDir);
        QVERIFY(!backupPath.isEmpty());
        QVERIFY(QFile::exists(backupPath));
        QVERIFY(QFileInfo(backupPath).size() > 0);

        // Database optimization
        QVERIFY(controller.optimizeDatabase());
    }

    void autoLockConfiguration() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-autolock.sqlite")));

        // Test auto-lock getter/setter
        controller.setAutoLockMinutes(5);
        QCOMPARE(controller.autoLockMinutes(), 5);

        controller.setAutoLockMinutes(30);
        QCOMPARE(controller.autoLockMinutes(), 30);

        controller.setAutoLockMinutes(0);
        QCOMPARE(controller.autoLockMinutes(), 0);
    }
};

int runNativeSettingsTest(int argc, char **argv) {
    NativeSettingsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_settings_test.moc"
