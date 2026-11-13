#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeDiagramsTest final : public QObject {
    Q_OBJECT

private slots:
    void diagramLifecyclePlaintext() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-diagrams.sqlite");
        QVERIFY(controller.openDatabase(dbPath));

        // Create diagram
        const QString id = controller.createDiagram("Architecture Mindmap", "🎨");
        QVERIFY(!id.isEmpty());

        // Get diagram
        QVariantMap diag = controller.getDiagram(id);
        QCOMPARE(diag.value("id").toString(), id);
        QCOMPARE(diag.value("title").toString(), QString("Architecture Mindmap"));
        QCOMPARE(diag.value("icon").toString(), QString("🎨"));
        QCOMPARE(diag.value("content").toString(), QString("[]"));

        // Save diagram with shapes
        const QString shapes = "[{\"type\":\"rect\",\"x\":10,\"y\":20,\"w\":100,\"h\":50,\"color\":\"#8b5cf6\"}]";
        QVERIFY(controller.saveDiagram(id, "Updated Architecture", shapes, "📐"));

        diag = controller.getDiagram(id);
        QCOMPARE(diag.value("title").toString(), QString("Updated Architecture"));
        QCOMPARE(diag.value("icon").toString(), QString("📐"));
        QCOMPARE(diag.value("content").toString(), shapes);

        // List diagrams
        QVariantList list = controller.getDiagrams();
        QCOMPARE(list.size(), 1);
        QCOMPARE(list.first().toMap().value("id").toString(), id);

        // Delete diagram
        QVERIFY(controller.deleteDiagram(id));
        list = controller.getDiagrams();
        QCOMPARE(list.size(), 0);
    }

    void diagramE2EELifecycleAndLock() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-diagrams-e2ee.sqlite");
        QVERIFY(controller.openDatabase(dbPath));
        const QString password = "MasterSecret42!";
        QVERIFY(controller.setupMasterPassword(password));

        // Create encrypted diagram
        const QString id = controller.createDiagram("Confidential Infrastructure", "🔒");
        QVERIFY(!id.isEmpty());

        // Save confidential shapes
        const QString secretContent = "[{\"type\":\"sticky\",\"x\":50,\"y\":50,\"text\":\"Cluster Vault Credentials\",\"color\":\"#f43f5e\"}]";
        QVERIFY(controller.saveDiagram(id, "Confidential Infrastructure", secretContent, "🔒"));

        // Verify transparent decryption while unlocked
        QVariantMap diag = controller.getDiagram(id);
        QCOMPARE(diag.value("content").toString(), secretContent);

        // Lock vault
        controller.lockVault();
        QVariantMap lockedDiag = controller.getDiagram(id);
        QVERIFY(lockedDiag.value("content").toString().contains("🔒"));

        // Unlock vault
        QVERIFY(controller.unlockVault(password));
        QVariantMap unlockedDiag = controller.getDiagram(id);
        QCOMPARE(unlockedDiag.value("content").toString(), secretContent);
    }
};

int runNativeDiagramsTest(int argc, char **argv) {
    NativeDiagramsTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_diagrams_test.moc"
