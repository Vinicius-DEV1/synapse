#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QFile>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

namespace {

QList<QQuickItem *> findAllVisualItemsWithProp(QQuickItem *root, const char *propName) {
    QList<QQuickItem *> result;
    if (!root) return result;
    if (root->property(propName).isValid()) result.append(root);
    for (QQuickItem *child : root->childItems()) {
        result.append(findAllVisualItemsWithProp(child, propName));
    }
    return result;
}

QQuickItem *findVisualItemByName(QQuickItem *root, const QString &name) {
    if (!root) return nullptr;
    if (root->objectName() == name) return root;
    for (QQuickItem *child : root->childItems()) {
        if (QQuickItem *found = findVisualItemByName(child, name)) {
            return found;
        }
    }
    return nullptr;
}

} // namespace

class NativeNotesFileWidgetLifecycleTest final : public QObject {
    Q_OBJECT

private slots:
    void fileWidgetNestedLookupRenameSiblingSyncRestoreAndDeferredTrash() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath(QStringLiteral("study-guide.md"));
        {
            QFile f(sourcePath);
            QVERIFY(f.open(QIODevice::WriteOnly));
            QCOMPARE(f.write("# Guide\nHello"), 13);
        }

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        QVERIFY(controller.setupMasterPassword(QStringLiteral("FileWidgetPass42!")));

        const QString folderId = controller.createFileFolder(QStringLiteral("NestedFolder"));
        QVERIFY(!folderId.isEmpty());

        QSignalSpy opSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.importLocalFile(sourcePath, folderId, QStringLiteral("req-1"));
        QTRY_COMPARE_WITH_TIMEOUT(opSpy.count(), 1, 15000);
        const QVariantMap imported = opSpy.takeFirst().at(0).toMap();
        QVERIFY2(imported.value(QStringLiteral("success")).toBool(),
                 qPrintable(imported.value(QStringLiteral("error")).toString()));
        const QString fileId = imported.value(QStringLiteral("id")).toString();
        QVERIFY(!fileId.isEmpty());

        const QString pageId = controller.createSubPage(QString(), QStringLiteral("Attachments Page"));
        QVERIFY(!pageId.isEmpty());
        const QString initialHtml = QStringLiteral(
            "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"%1\" data-name=\"study-guide.md\" data-file-name=\"study-guide.md\" data-file-type=\"markdown\" data-file-size=\"13\"></div>"
            "<p>Between</p>"
            "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"%1\" data-name=\"study-guide.md\" data-file-name=\"study-guide.md\" data-file-type=\"markdown\" data-file-size=\"13\"></div>")
            .arg(fileId);
        QVERIFY(controller.savePage(pageId, QStringLiteral("Attachments Page"), initialHtml, QStringLiteral("📄")));

        QQmlEngine engine;
        NotesTextOperations textOperations;
        engine.rootContext()->setContextProperty(QStringLiteral("notesTextOperations"), &textOperations);
        engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &controller);
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("bgDarkBg"), QStringLiteral("#0f0e17")},
            {QStringLiteral("fontFamily"), QStringLiteral("Inter, sans-serif")},
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
            {QStringLiteral("textDark"), QStringLiteral("#fffffe")},
            {QStringLiteral("brand600"), QStringLiteral("#7c3aed")},
            {QStringLiteral("textMuted"), QStringLiteral("#71717a")},
            {QStringLiteral("fontMono"), QStringLiteral("monospace")},
        });

        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> pageView(component.create());
        QVERIFY2(pageView, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(1100, 800);
        auto *pageViewItem = qobject_cast<QQuickItem *>(pageView.data());
        QVERIFY(pageViewItem);
        pageViewItem->setParentItem(window.contentItem());
        pageViewItem->setWidth(1100);
        pageViewItem->setHeight(800);
        window.show();
        QTRY_VERIFY(window.isVisible());

        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        pageView->setProperty("selectedPageId", pageId);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "loadActivePage"));

        QList<QQuickItem *> widgets;
        QTRY_COMPARE((widgets = findAllVisualItemsWithProp(pageViewItem, "isSyncingAttributesFromCore")).size(), 2);

        // Nested folder file resolves cleanly in both widgets.
        QVERIFY(!widgets[0]->property("isNotFound").toBool());
        QVERIFY(!widgets[1]->property("isNotFound").toBool());
        QCOMPARE(widgets[0]->property("fileName").toString(), QStringLiteral("study-guide.md"));
        QCOMPARE(widgets[0]->property("fileSize").toInt(), 13);

        // Soft-delete in Core -> filesChanged updates both widgets to missing; restore brings them back.
        QVERIFY(controller.deleteFile(fileId));
        QTRY_VERIFY(widgets[0]->property("isNotFound").toBool());
        QTRY_VERIFY(widgets[1]->property("isNotFound").toBool());
        QVERIFY(controller.restoreTrashItem(fileId, QStringLiteral("file")));
        QTRY_VERIFY(!widgets[0]->property("isNotFound").toBool());
        QTRY_VERIFY(!widgets[1]->property("isNotFound").toBool());

        // Rename via widget 0 -> Core updates and sibling widget 1 syncs automatically.
        QVERIFY(QMetaObject::invokeMethod(widgets[0], "startRename"));
        QVERIFY(widgets[0]->property("renaming").toBool());
        QQuickItem *renameInput = findVisualItemByName(widgets[0], QStringLiteral("fileAttachmentRenameInput"));
        if (renameInput) {
            QCOMPARE(renameInput->property("selectedText").toString(), QStringLiteral("study-guide"));
        }
        QVERIFY(QMetaObject::invokeMethod(widgets[0], "commitRename", Q_ARG(QVariant, QStringLiteral("renamed-guide.md"))));
        QVERIFY(!widgets[0]->property("renaming").toBool());
        QTRY_COMPARE(widgets[0]->property("fileName").toString(), QStringLiteral("renamed-guide.md"));
        QTRY_COMPARE(widgets[1]->property("fileName").toString(), QStringLiteral("renamed-guide.md"));
        QCOMPARE(controller.getFileWidgetMetadata(fileId).value(QStringLiteral("name")).toString(),
                 QStringLiteral("renamed-guide.md"));

        // Save note with renamed attributes.
        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());

        // Selection state must stay presentation-only (not serialized to Core).
        QQuickItem *blockList = findVisualItemByName(pageViewItem, QStringLiteral("notesEditorCanvas"));
        QVERIFY(blockList);
        widgets[0]->setProperty("isSelected", true);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        QVERIFY(!controller.getPage(pageId).value(QStringLiteral("content")).toString().contains(QStringLiteral("isSelected")));

        // Delete widget 0 locally: since widget 1 still references fileId, Core must keep the file active!
        QVERIFY(QMetaObject::invokeMethod(widgets[0], "deleteLocalRequested", Q_ARG(QString, fileId)));
        QVERIFY(QMetaObject::invokeMethod(widgets[0], "removeRequested"));
        QTRY_COMPARE(findAllVisualItemsWithProp(pageViewItem, "isSyncingAttributesFromCore").size(), 1);
        QVERIFY(!controller.getFileWidgetMetadata(fileId).value(QStringLiteral("id")).toString().isEmpty());

        // Delete widget 1 locally while save fails (stale conflict) -> file must remain active!
        const QString currentTs = controller.getPage(pageId).value(QStringLiteral("updated_at")).toString();
        QTest::qWait(20);
        QVERIFY(controller.savePage(pageId, QStringLiteral("Attachments Page"),
                                   controller.getPage(pageId).value(QStringLiteral("content")).toString(),
                                   QStringLiteral("📄"), currentTs));
        QList<QQuickItem *> remainingWidgets = findAllVisualItemsWithProp(pageViewItem, "isSyncingAttributesFromCore");
        QCOMPARE(remainingWidgets.size(), 1);
        QVERIFY(QMetaObject::invokeMethod(remainingWidgets[0], "deleteLocalRequested", Q_ARG(QString, fileId)));
        QVERIFY(QMetaObject::invokeMethod(remainingWidgets[0], "removeRequested"));
        QTRY_COMPARE(findAllVisualItemsWithProp(pageViewItem, "isSyncingAttributesFromCore").size(), 0);
        QVERIFY(!controller.getFileWidgetMetadata(fileId).value(QStringLiteral("id")).toString().isEmpty());

        // Resolve conflict by keeping local version and retrying save -> now Core soft-deletes fileId!
        QVariant kept;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "keepLocalVersionAfterConflict", Q_RETURN_ARG(QVariant, kept)));
        QVERIFY(kept.toBool());
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        QVERIFY(controller.getFileWidgetMetadata(fileId).value(QStringLiteral("id")).toString().isEmpty());
    }
};

int runNativeNotesFileWidgetLifecycleTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesFileWidgetLifecycleTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_file_widget_lifecycle_test.moc"
