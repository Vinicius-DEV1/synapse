#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QtTest>

namespace {

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

QQuickItem *findBlockListItem(QQuickItem *root) {
    if (!root) return nullptr;
    if (root->property("blocks").isValid() && root->property("looseFileWidgetsRevision").isValid()) {
        return root;
    }
    for (QQuickItem *child : root->childItems()) {
        if (QQuickItem *found = findBlockListItem(child)) {
            return found;
        }
    }
    return nullptr;
}

QList<QQuickItem *> findBundleWidgets(QQuickItem *root) {
    QList<QQuickItem *> result;
    if (!root) return result;
    if (root->property("itemsState").isValid() && root->property("itemsInvalid").isValid()) {
        result.append(root);
    }
    for (QQuickItem *child : root->childItems()) {
        result.append(findBundleWidgets(child));
    }
    return result;
}

} // namespace

class NativeNotesDocumentBundleTest final : public QObject {
    Q_OBJECT

private slots:
    void bundlePercentFilenamesMalformedGuardUngroupAndNestedAbsorption() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        const QString pageId = controller.createSubPage(QString(), QStringLiteral("Bundle Page"));
        QVERIFY(!pageId.isEmpty());

        const QString validItemsJson = QStringLiteral(
            "[{\"id\":\"f-pct\",\"fileId\":\"f-pct\",\"name\":\"100% Notes.pdf\",\"fileType\":\"pdf\",\"fileSize\":2048},"
            "{\"id\":\"f-two\",\"fileId\":\"f-two\",\"name\":\"Second.txt\",\"fileType\":\"text\",\"fileSize\":64}]");
        const QString validItemsAttr = validItemsJson.toHtmlEscaped();

        const QString html = QStringLiteral(
            "<div data-type=\"document-bundle\" data-title=\"Pack\" data-color=\"#3b82f6\" data-items=\"%1\"></div>"
            "<div data-type=\"document-bundle\" data-title=\"Broken\" data-items=\"{bad-json\"></div>"
            "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"f-top\" data-name=\"Top.md\" data-file-type=\"markdown\" data-file-size=\"120\"></div>"
            "<div data-type=\"columnGroup\" data-columns=\"2\" class=\"group-layout column-group\">"
            "<div data-type=\"columnBlock\" data-width=\"50\" class=\"column-block\" style=\"--group-flex: 50;\">"
            "<p>Col keep</p>"
            "<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"f-col\" data-name=\"Nested.pdf\" data-file-type=\"pdf\" data-file-size=\"512\"></div>"
            "</div>"
            "<div data-type=\"columnBlock\" data-width=\"50\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Col 2</p></div>"
            "</div>")
            .arg(validItemsAttr);
        QVERIFY(controller.savePage(pageId, QStringLiteral("Bundle Page"), html, QStringLiteral("📄")));

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

        QList<QQuickItem *> bundles;
        QTRY_COMPARE((bundles = findBundleWidgets(pageViewItem)).size(), 2);

        // Bundle 0: percent-containing filename parses cleanly.
        const QVariantMap validState = bundles[0]->property("itemsState").toMap();
        QVERIFY(validState.value(QStringLiteral("valid")).toBool());
        const QVariantList validItems = validState.value(QStringLiteral("items")).toList();
        QCOMPARE(validItems.size(), 2);
        QCOMPARE(validItems[0].toMap().value(QStringLiteral("name")).toString(), QStringLiteral("100% Notes.pdf"));

        // Bundle 1: malformed metadata is flagged invalid and cannot be overwritten by rename.
        const QVariantMap brokenState = bundles[1]->property("itemsState").toMap();
        QVERIFY(!brokenState.value(QStringLiteral("valid")).toBool());
        QVERIFY(!brokenState.value(QStringLiteral("error")).toString().isEmpty());

        QQuickItem *blockList = findBlockListItem(pageViewItem);
        QVERIFY(blockList);

        const QVariantList nestedPath{3, 0, 1};
        const QVariantList topPath{2};

        // Stale absorption path must fail without mutating the bundle.
        QVariant absorbResult;
        QVERIFY(QMetaObject::invokeMethod(blockList, "absorbLooseDocumentBundleFile",
                                          Q_RETURN_ARG(QVariant, absorbResult),
                                          Q_ARG(QVariant, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(topPath)),
                                          Q_ARG(QVariant, QStringLiteral("wrong-id")),
                                          Q_ARG(QVariant, QVariant::fromValue(validItems))));
        QVERIFY(!absorbResult.toBool());

        // Absorb nested file inside columnBlock ([3, 0, 1]) into bundle 0.
        QVERIFY(QMetaObject::invokeMethod(blockList, "absorbLooseDocumentBundleFile",
                                          Q_RETURN_ARG(QVariant, absorbResult),
                                          Q_ARG(QVariant, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(nestedPath)),
                                          Q_ARG(QVariant, QStringLiteral("f-col")),
                                          Q_ARG(QVariant, QVariant::fromValue(validItems))));
        QVERIFY(absorbResult.toBool());

        // Absorb top-level file (index 2) into bundle 0.
        QTRY_COMPARE((bundles = findBundleWidgets(pageViewItem)).size(), 2);
        QVariantList afterColItems;
        QTRY_COMPARE((afterColItems = bundles[0]->property("itemsState").toMap().value(QStringLiteral("items")).toList()).size(), 3);
        QVERIFY(QMetaObject::invokeMethod(blockList, "absorbLooseDocumentBundleFile",
                                          Q_RETURN_ARG(QVariant, absorbResult),
                                          Q_ARG(QVariant, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(topPath)),
                                          Q_ARG(QVariant, QStringLiteral("f-top")),
                                          Q_ARG(QVariant, QVariant::fromValue(afterColItems))));
        QVERIFY(absorbResult.toBool());

        QTRY_COMPARE((bundles = findBundleWidgets(pageViewItem)).size(), 2);
        QVariantList afterBothItems;
        QTRY_COMPARE((afterBothItems = bundles[0]->property("itemsState").toMap().value(QStringLiteral("items")).toList()).size(), 4);

        // Save and verify column wrappers, sibling paragraph, and 4 bundle items persist in SQLite.
        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        const QString savedHtml = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY(savedHtml.contains(QStringLiteral("100% Notes.pdf")));
        QVERIFY(savedHtml.contains(QStringLiteral("f-col")));
        QVERIFY(savedHtml.contains(QStringLiteral("f-top")));
        QVERIFY(savedHtml.contains(QStringLiteral("Col keep")));
        QVERIFY(savedHtml.contains(QStringLiteral("data-type=\"columnBlock\"")));

        // Ungroup one item ("f-two") and verify bundle retains 3 items + 1 loose file-widget.
        QVariant ungroupOneRes;
        QVERIFY(QMetaObject::invokeMethod(blockList, "unwrapDocumentBundleItem",
                                          Q_RETURN_ARG(QVariant, ungroupOneRes),
                                          Q_ARG(QVariant, 0),
                                          Q_ARG(QVariant, QStringLiteral("f-two")),
                                          Q_ARG(QVariant, QVariant::fromValue(afterBothItems)),
                                          Q_ARG(QVariant, QStringLiteral("#3b82f6"))));
        QVERIFY(ungroupOneRes.toBool());
        QTRY_COMPARE((bundles = findBundleWidgets(pageViewItem)).size(), 2);
        QVariantList remainingThree;
        QTRY_COMPARE((remainingThree = bundles[0]->property("itemsState").toMap().value(QStringLiteral("items")).toList()).size(), 3);

        // Ungroup remaining 3 items into 3 file-widget blocks.
        QVariant ungroupAllRes;
        QVERIFY(QMetaObject::invokeMethod(blockList, "unwrapDocumentBundle",
                                          Q_RETURN_ARG(QVariant, ungroupAllRes),
                                          Q_ARG(QVariant, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(remainingThree)),
                                          Q_ARG(QVariant, QStringLiteral("#3b82f6"))));
        QVERIFY(ungroupAllRes.toBool());
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        const QString finalHtml = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY(finalHtml.contains(QStringLiteral("data-file-id=\"f-pct\"")));
        QVERIFY(finalHtml.contains(QStringLiteral("data-file-id=\"f-col\"")));
        QVERIFY(finalHtml.contains(QStringLiteral("data-file-id=\"f-top\"")));
        QVERIFY(finalHtml.contains(QStringLiteral("data-file-id=\"f-two\"")));
    }
};

int runNativeNotesDocumentBundleTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesDocumentBundleTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_document_bundle_test.moc"
