#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtCore/QFileInfo>
#include <QtCore/QUrl>
#include <QtQml/QQmlEngine>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtTest/QtTest>

class NativeLayoutTest final : public QObject {
    Q_OBJECT

private slots:
    void backgroundTaskLifecycle() {
        SynapseDataController controller(nullptr, false);

        // 1. Initially no background tasks
        QCOMPARE(controller.getActiveTasks().size(), 0);

        // 2. Start a task
        const QString taskId = controller.startTask("Exporting Database Backup", "backup");
        QVERIFY(!taskId.isEmpty());
        QCOMPARE(controller.getActiveTasks().size(), 1);

        QVariantMap task = controller.getActiveTasks().first().toMap();
        QCOMPARE(task.value("id").toString(), taskId);
        QCOMPARE(task.value("title").toString(), "Exporting Database Backup");
        QCOMPARE(task.value("type").toString(), "backup");
        QCOMPARE(task.value("status").toString(), "running");
        QCOMPARE(task.value("progress").toInt(), 0);

        // 3. Update task progress
        controller.updateTaskProgress(taskId, 45);
        task = controller.getActiveTasks().first().toMap();
        QCOMPARE(task.value("progress").toInt(), 45);
        QCOMPARE(task.value("status").toString(), "running");

        // 4. Complete task
        controller.updateTaskProgress(taskId, 100, "completed");
        task = controller.getActiveTasks().first().toMap();
        QCOMPARE(task.value("progress").toInt(), 100);
        QCOMPARE(task.value("status").toString(), "completed");

        // 5. Start a second task and cancel it
        const QString task2Id = controller.startTask("Uploading Media Asset", "upload");
        QCOMPARE(controller.getActiveTasks().size(), 2);

        controller.cancelTask(task2Id);
        bool foundCancelled = false;
        for (const QVariant &tVar : controller.getActiveTasks()) {
            const QVariantMap tMap = tVar.toMap();
            if (tMap.value("id").toString() == task2Id) {
                QCOMPARE(tMap.value("status").toString(), "cancelled");
                foundCancelled = true;
            }
        }
        QVERIFY(foundCancelled);

        // 6. Remove completed task
        controller.removeTask(taskId);
        QCOMPARE(controller.getActiveTasks().size(), 1);
        QCOMPARE(controller.getActiveTasks().first().toMap().value("id").toString(), task2Id);

        // 7. Remove cancelled task
        controller.removeTask(task2Id);
        QCOMPARE(controller.getActiveTasks().size(), 0);
    }

    void pageTreeHierarchyAndMoveInTree() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-layout.sqlite");
        QVERIFY(controller.openDatabase(dbPath));
        QVERIFY(controller.setupMasterPassword("TestPassword123!"));

        // 1. Create two root pages
        const QString page1Id = controller.createSubPage("", "Root Project Plan", "📁");
        QVERIFY(!page1Id.isEmpty());

        const QString page2Id = controller.createSubPage("", "Architecture Design", "📄");
        QVERIFY(!page2Id.isEmpty());

        QVariantMap p2Before = controller.getPage(page2Id);
        QVERIFY(p2Before.value("parent_id").toString().isEmpty());

        // 2. Move page2 into page1 (tree nesting)
        QVERIFY(controller.movePage(page2Id, page1Id));
        QVariantMap p2After = controller.getPage(page2Id);
        QCOMPARE(p2After.value("parent_id").toString(), page1Id);

        // 3. Move page2 back to root
        QVERIFY(controller.movePage(page2Id, ""));
        QVariantMap p2Root = controller.getPage(page2Id);
        QVERIFY(p2Root.value("parent_id").toString().isEmpty());

        // 4. Pinning / unpinning verification
        QVERIFY(controller.togglePinPage(page1Id));
        QVariantList pinned = controller.getPinnedPages();
        QVERIFY(pinned.size() >= 1);
        bool foundPinned = false;
        for (const QVariant &pVar : pinned) {
            if (pVar.toMap().value("id").toString() == page1Id) {
                foundPinned = true;
                break;
            }
        }
        QVERIFY(foundPinned);
    }

    void qmlLayoutAndUiComponentsInstantiateSuccessfully() {
        QQmlEngine engine;
        SynapseDataController controller(nullptr, false);
        engine.rootContext()->setContextProperty("dataController", &controller);

        const QString qmlBase = QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR "/qml");

        // Verify UI primitives
        const QStringList uiComponents = {
            qmlBase + "/ui/Theme.qml",
            qmlBase + "/ui/AppIcon.qml",
            qmlBase + "/ui/AppConfirmDialog.qml"
        };
        for (const QString &path : uiComponents) {
            QQmlComponent comp(&engine, QUrl::fromLocalFile(path));
            QVERIFY2(comp.isReady(), qPrintable(QString("Component failed to load %1: %2").arg(path, comp.errorString())));
            QScopedPointer<QObject> obj(comp.create());
            QVERIFY2(obj, qPrintable(QString("Component failed to instantiate %1: %2").arg(path, comp.errorString())));
        }

        // Verify Layout components
        const QStringList layoutComponents = {
            qmlBase + "/layout/WindowControls.qml",
            qmlBase + "/layout/WindowResizeHandles.qml",
            qmlBase + "/layout/SyncStatusToast.qml",
            qmlBase + "/layout/BackgroundTaskWidget.qml",
            qmlBase + "/layout/AppGlobalShortcuts.qml",
            qmlBase + "/layout/AppContextMenu.qml",
            qmlBase + "/layout/AppNavList.qml",
            qmlBase + "/layout/AppTopTabBar.qml",
            qmlBase + "/layout/AppSidebar.qml",
            qmlBase + "/layout/CommandPalette.qml",
            qmlBase + "/layout/GlobalModalsHost.qml"
        };
        for (const QString &path : layoutComponents) {
            QQmlComponent comp(&engine, QUrl::fromLocalFile(path));
            QVERIFY2(comp.isReady(), qPrintable(QString("Component failed to load %1: %2").arg(path, comp.errorString())));
            QScopedPointer<QObject> obj(comp.create());
            QVERIFY2(obj, qPrintable(QString("Component failed to instantiate %1: %2").arg(path, comp.errorString())));
        }
    }
};

int runNativeLayoutTest(int argc, char **argv) {
    NativeLayoutTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_layout_test.moc"
