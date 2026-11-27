#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

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

QQuickItem *findColumnLayoutItem(QQuickItem *root) {
    if (!root) return nullptr;
    if (root->property("columnsHtmlList").isValid() && root->property("columnWidths").isValid()) {
        return root;
    }
    for (QQuickItem *child : root->childItems()) {
        if (QQuickItem *found = findColumnLayoutItem(child)) {
            return found;
        }
    }
    return nullptr;
}

} // namespace

class NativeNotesBlockColorAndColumnTest final : public QObject {
    Q_OBJECT

private slots:
    void emptyAndPopulatedBlockColorsPersistAcrossCoreSaveAndClear() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        const QString pageId = controller.createSubPage(QString(), QStringLiteral("Color Page"));
        QVERIFY(!pageId.isEmpty());
        QVERIFY(controller.savePage(pageId, QStringLiteral("Color Page"), QStringLiteral("<p></p>"), QStringLiteral("📄")));

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

        QQuickItem *richEditor = nullptr;
        QTRY_VERIFY((richEditor = findVisualItemByName(pageViewItem, QStringLiteral("notesRichTextEditorRoot"))) != nullptr);
        QQuickItem *textEditor = findVisualItemByName(richEditor, QStringLiteral("notesRichTextEditor"));
        QVERIFY(textEditor);
        QTRY_VERIFY(richEditor->property("active").toBool());
        QTRY_VERIFY(!richEditor->property("isLoading").toBool());

        // Unsafe color must be rejected.
        QVariant colorRes;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "setBlockColor", Q_RETURN_ARG(QVariant, colorRes),
                                          Q_ARG(QVariant, QStringLiteral("red;position:fixed")),
                                          Q_ARG(QVariant, false)));
        QVERIFY(!colorRes.toBool());

        // Empty block: stored foreground + background colors apply to subsequently typed text.
        QVERIFY(QMetaObject::invokeMethod(richEditor, "setBlockColor", Q_RETURN_ARG(QVariant, colorRes),
                                          Q_ARG(QVariant, QStringLiteral("#f87171")),
                                          Q_ARG(QVariant, false)));
        QVERIFY(colorRes.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "setBlockColor", Q_RETURN_ARG(QVariant, colorRes),
                                          Q_ARG(QVariant, QStringLiteral("#fef08a")),
                                          Q_ARG(QVariant, true)));
        QVERIFY(colorRes.toBool());

        QVERIFY(QMetaObject::invokeMethod(textEditor, "insert", Q_ARG(int, 0), Q_ARG(QString, QStringLiteral("Colored"))));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());

        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());
        const QString persisted = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(persisted.contains(QStringLiteral("#f87171")), qPrintable(persisted));
        QVERIFY2(persisted.contains(QStringLiteral("#fef08a")), qPrintable(persisted));
        QVERIFY2(persisted.contains(QStringLiteral("Colored")), qPrintable(persisted));

        // Clear foreground color while keeping background color.
        QVERIFY(QMetaObject::invokeMethod(richEditor, "setBlockColor", Q_RETURN_ARG(QVariant, colorRes),
                                          Q_ARG(QVariant, QStringLiteral("inherit")),
                                          Q_ARG(QVariant, false)));
        QVERIFY(colorRes.toBool());
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        const QString afterClearFg = richEditor->property("sourceHtml").toString();
        QVERIFY2(!afterClearFg.contains(QStringLiteral("#f87171")), qPrintable(afterClearFg));
        QVERIFY2(afterClearFg.contains(QStringLiteral("#fef08a")), qPrintable(afterClearFg));
    }

    void columnResizeAndTableColumnMovePreserveMetadataAndMergedCells() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        const QString pageId = controller.createSubPage(QString(), QStringLiteral("Columns Page"));
        QVERIFY(!pageId.isEmpty());

        const QString colsHtml = QStringLiteral(
            "<div data-type=\"columnGroup\" data-columns=\"2\" data-custom-group=\"keep-me\" class=\"group-layout column-group\">"
            "<div data-type=\"columnBlock\" data-width=\"50\" data-custom-col=\"col-a\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Left</p></div>"
            "<div data-type=\"columnBlock\" data-width=\"50\" data-custom-col=\"col-b\" class=\"column-block\" style=\"--group-flex: 50;\"><p>Right</p></div>"
            "</div>");
        QVERIFY(controller.savePage(pageId, QStringLiteral("Columns Page"), colsHtml, QStringLiteral("📄")));

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

        QQuickItem *colLayout = nullptr;
        QTRY_VERIFY((colLayout = findColumnLayoutItem(pageViewItem)) != nullptr);
        QCOMPARE(colLayout->property("columnCount").toInt(), 2);

        // Resize columns via saveColumns and verify group + child custom attributes survive save/reload.
        const QVariantList currentSlices = colLayout->property("columnsHtmlList").toList();
        const QVariantList newWidths{65.0, 35.0};
        QVERIFY(QMetaObject::invokeMethod(colLayout, "saveColumns",
                                          Q_ARG(QVariant, QVariant::fromValue(currentSlices)),
                                          Q_ARG(QVariant, QVariant::fromValue(newWidths)),
                                          Q_ARG(QVariant, QVariant())));

        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());

        const QString savedCols = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(savedCols.contains(QStringLiteral("data-custom-group=\"keep-me\"")), qPrintable(savedCols));
        QVERIFY2(savedCols.contains(QStringLiteral("data-custom-col=\"col-a\"")), qPrintable(savedCols));
        QVERIFY2(savedCols.contains(QStringLiteral("data-custom-col=\"col-b\"")), qPrintable(savedCols));
        QVERIFY2(savedCols.contains(QStringLiteral("data-width=\"65\"")), qPrintable(savedCols));
        QVERIFY2(savedCols.contains(QStringLiteral("data-width=\"35\"")), qPrintable(savedCols));

        // Verify Core table column movement preserves row attributes and rejects merged cells.
        const QString rowAttrTable = QStringLiteral(
            "<table><tbody>"
            "<tr class=\"hdr\" data-row-id=\"r0\"><th><p>A</p></th><th><p>B</p></th></tr>"
            "<tr class=\"body\" data-row-id=\"r1\"><td><p>1</p></td><td><p>2</p></td></tr>"
            "</tbody></table>");
        const QString movedTable = controller.moveTableColumnAt(rowAttrTable, 0, 0, 1);
        QVERIFY2(movedTable.contains(QStringLiteral("data-row-id=\"r0\"")), qPrintable(movedTable));
        QVERIFY2(movedTable.contains(QStringLiteral("data-row-id=\"r1\"")), qPrintable(movedTable));
        QVERIFY(movedTable.indexOf(QStringLiteral("<p>B</p>")) < movedTable.indexOf(QStringLiteral("<p>A</p>")));

        const QString mergedTable = QStringLiteral(
            "<table><tbody>"
            "<tr><th colspan=\"2\"><p>Merged</p></th></tr>"
            "<tr><td><p>1</p></td><td><p>2</p></td></tr>"
            "</tbody></table>");
        QCOMPARE(controller.moveTableColumnAt(mergedTable, 0, 0, 1), mergedTable);
    }
};

int runNativeNotesBlockColorAndColumnTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesBlockColorAndColumnTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_block_color_and_column_test.moc"
