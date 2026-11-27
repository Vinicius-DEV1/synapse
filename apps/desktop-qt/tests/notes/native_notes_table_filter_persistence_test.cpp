#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtTest/QtTest>

namespace {

class FailingFilterMockController final : public QObject {
    Q_OBJECT
public:
    bool failNextFilter = false;
    int filterCalls = 0;

    Q_INVOKABLE QVariantList parseTableColumnsAt(const QString &, int) const {
        return {
            QVariantMap{{QStringLiteral("col_type"), QStringLiteral("text")}},
            QVariantMap{{QStringLiteral("col_type"), QStringLiteral("number")}},
        };
    }

    Q_INVOKABLE QVariantList validateTableCellsAt(const QString &, int) const {
        return {};
    }

    Q_INVOKABLE QVariantMap filterTableRowsForView(const QString &, int, const QString &) {
        filterCalls += 1;
        if (failNextFilter) {
            return {};
        }
        return QVariantMap{
            {QStringLiteral("html"),
             QStringLiteral("<h2>Section</h2><table><tbody>"
                            "<tr><th><p>Name</p></th><th><p>Score</p></th></tr>"
                            "<tr><td><p>KeepA</p></td><td><p>10</p></td></tr>"
                            "</tbody></table>")},
            {QStringLiteral("visibleRowCount"), 1},
        };
    }
};

QQuickItem *findVisualChildByObjectName(QQuickItem *root, const QString &name) {
    if (!root) return nullptr;
    if (root->objectName() == name) return root;
    const QList<QQuickItem *> children = root->childItems();
    for (QQuickItem *child : children) {
        if (QQuickItem *found = findVisualChildByObjectName(child, name)) {
            return found;
        }
    }
    return nullptr;
}

QQuickItem *findRichEditorItem(QQuickItem *root) {
    return findVisualChildByObjectName(root, QStringLiteral("notesRichTextEditorRoot"));
}

QQuickItem *findGripsItem(QQuickItem *richEditor) {
    if (!richEditor) return nullptr;
    const QList<QQuickItem *> children = richEditor->childItems();
    for (QQuickItem *child : children) {
        if (child->property("activeFilters").isValid() && child->property("unfilteredSourceHtml").isValid()) {
            return child;
        }
    }
    return nullptr;
}

} // namespace

class NativeNotesTableFilterPersistenceTest final : public QObject {
    Q_OBJECT

private slots:
    void filteredTablePreservesHiddenRowsAcrossSaveAutosavePageSwitchAndReload() {
        QTemporaryDir databaseDirectory;
        QVERIFY(databaseDirectory.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(databaseDirectory.filePath(QStringLiteral("notes.sqlite"))));
        const QString pageOneId = controller.createSubPage(QString(), QStringLiteral("Table Filter Page"));
        const QString pageTwoId = controller.createSubPage(QString(), QStringLiteral("Second Page"));
        QVERIFY(!pageOneId.isEmpty());
        QVERIFY(!pageTwoId.isEmpty());

        const QString twoTablesHtml = QStringLiteral(
            "<h2>Section</h2>"
            "<table><tbody>"
            "<tr><th><p>Item</p></th><th><p>Qty</p></th></tr>"
            "<tr><td><p>Alpha</p></td><td><p>1</p></td></tr>"
            "<tr><td><p>Beta</p></td><td><p>2</p></td></tr>"
            "</tbody></table>"
            "<p>Middle</p>"
            "<table><tbody>"
            "<tr><th><p>Name</p></th><th><p>Score</p></th></tr>"
            "<tr><td><p>KeepA</p></td><td><p>10</p></td></tr>"
            "<tr><td><p>HideB</p></td><td><p>20</p></td></tr>"
            "<tr><td><p>KeepC</p></td><td><p>30</p></td></tr>"
            "</tbody></table>");
        QVERIFY(controller.savePage(pageOneId, QStringLiteral("Table Filter Page"), twoTablesHtml, QStringLiteral("📄")));
        QVERIFY(controller.savePage(pageTwoId, QStringLiteral("Second Page"), QStringLiteral("<p>Other</p>"), QStringLiteral("📄")));

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
        pageView->setProperty("selectedPageId", pageOneId);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "loadActivePage"));

        QQuickItem *richEditor = nullptr;
        QTRY_VERIFY((richEditor = findRichEditorItem(pageViewItem)) != nullptr);
        QQuickItem *textEditor = findVisualChildByObjectName(richEditor, QStringLiteral("notesRichTextEditor"));
        QVERIFY(textEditor);
        QTRY_VERIFY(richEditor->property("active").toBool());
        QTRY_VERIFY(!richEditor->property("isLoading").toBool());

        auto *quickDoc = qobject_cast<QQuickTextDocument *>(textEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDoc);
        QList<QTextTable *> tables;
        for (QTextFrame *frame : quickDoc->textDocument()->rootFrame()->childFrames()) {
            if (auto *table = qobject_cast<QTextTable *>(frame)) {
                tables.append(table);
            }
        }
        QCOMPARE(tables.size(), 2);

        // Place caret inside the second table (tableIndex == 1) and verify geometry targets it.
        const int secondTableCellPos = tables[1]->cellAt(1, 0).firstCursorPosition().position();
        textEditor->forceActiveFocus();
        textEditor->setProperty("cursorPosition", secondTableCellPos);
        QCoreApplication::processEvents();

        QQuickItem *grips = findGripsItem(richEditor);
        QVERIFY(grips);
        QTRY_COMPARE(grips->property("tableGeom").toMap().value(QStringLiteral("tableIndex")).toInt(), 1);

        // Simulate a pending rich-text edit right before applying a filter; it must not be lost.
        const int middlePos = quickDoc->textDocument()->toPlainText().indexOf(QStringLiteral("Middle"));
        QVERIFY(middlePos >= 0);
        QVERIFY(QMetaObject::invokeMethod(textEditor, "insert", Q_ARG(int, middlePos), Q_ARG(QString, QStringLiteral("Edited "))));
        QVERIFY(richEditor->property("hasPendingChanges").toBool());

        // Apply filter on column 0 of Table 1: keep rows containing "Keep".
        QObject *popover = grips->findChild<QObject *>(QStringLiteral("notesTableColumnTypePopover"));
        QVERIFY(popover);
        const QVariantMap filterObj{
            {QStringLiteral("colType"), QStringLiteral("text")},
            {QStringLiteral("operator"), QStringLiteral("contains")},
            {QStringLiteral("value"), QStringLiteral("Keep")},
        };
        QVERIFY(QMetaObject::invokeMethod(popover, "filterUpdated",
                                          Q_ARG(int, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(filterObj))));
        QCoreApplication::processEvents();

        QVERIFY(richEditor->property("hasVisualTableFilter").toBool());
        QVERIFY(textEditor->property("readOnly").toBool());
        QCOMPARE(grips->property("visibleFilteredRowCount").toInt(), 2);

        const QString projectedPlain = textOperations.richPlainText(quickDoc);
        QVERIFY(projectedPlain.contains(QStringLiteral("Alpha")));
        QVERIFY(projectedPlain.contains(QStringLiteral("Beta")));
        QVERIFY(projectedPlain.contains(QStringLiteral("KeepA")));
        QVERIFY(projectedPlain.contains(QStringLiteral("KeepC")));
        QVERIFY(!projectedPlain.contains(QStringLiteral("HideB")));
        QVERIFY(projectedPlain.contains(QStringLiteral("Edited Middle")));

        // Explicit save while filtered must persist all unfiltered rows and the pre-filter edit.
        QVariant savedResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, savedResult)));
        QVERIFY(savedResult.toBool());
        QString persistedHtml = controller.getPage(pageOneId).value(QStringLiteral("content")).toString();
        QVERIFY(persistedHtml.contains(QStringLiteral("HideB")));
        QVERIFY(persistedHtml.contains(QStringLiteral("Alpha")));
        QVERIFY(persistedHtml.contains(QStringLiteral("Beta")));
        QVERIFY(persistedHtml.contains(QStringLiteral("Edited Middle")));

        // Trigger autosave timer while filtered and verify hidden rows are still preserved.
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "scheduleAutoSave"));
        QTRY_COMPARE(pageView->property("saveStatus").toString(), QStringLiteral("saved"));
        persistedHtml = controller.getPage(pageOneId).value(QStringLiteral("content")).toString();
        QVERIFY(persistedHtml.contains(QStringLiteral("HideB")));

        // Switch away to page 2 while filter is active, then switch back to page 1.
        QVariant selectResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectResult),
                                          Q_ARG(QVariant, QVariant(pageTwoId))));
        QVERIFY(selectResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), pageTwoId);
        persistedHtml = controller.getPage(pageOneId).value(QStringLiteral("content")).toString();
        QVERIFY(persistedHtml.contains(QStringLiteral("HideB")));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectResult),
                                          Q_ARG(QVariant, QVariant(pageOneId))));
        QVERIFY(selectResult.toBool());
        QTRY_VERIFY((richEditor = findRichEditorItem(pageViewItem)) != nullptr);
        QQuickItem *reloadedTextEditor = findVisualChildByObjectName(richEditor, QStringLiteral("notesRichTextEditor"));
        QVERIFY(reloadedTextEditor);
        QTRY_VERIFY(!richEditor->property("hasVisualTableFilter").toBool());
        QVERIFY(!reloadedTextEditor->property("readOnly").toBool());
        auto *reloadedDoc = qobject_cast<QQuickTextDocument *>(reloadedTextEditor->property("textDocument").value<QObject *>());
        QVERIFY(reloadedDoc);
        const QString reloadedPlain = textOperations.richPlainText(reloadedDoc);
        QVERIFY(reloadedPlain.contains(QStringLiteral("HideB")));
        QVERIFY(reloadedPlain.contains(QStringLiteral("Alpha")));
        QVERIFY(reloadedPlain.contains(QStringLiteral("Beta")));
        QVERIFY(reloadedPlain.contains(QStringLiteral("Edited Middle")));
    }

    void failedFilterProjectionRestoresCanonicalContentAndEditing() {
        QQmlEngine engine;
        NotesTextOperations textOperations;
        FailingFilterMockController mockController;
        engine.rootContext()->setContextProperty(QStringLiteral("notesTextOperations"), &textOperations);

        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/notes/NotesRichTextEditor.qml")));
        QScopedPointer<QObject> richObj(component.create());
        QVERIFY2(richObj, qPrintable(component.errorString()));

        auto *richItem = qobject_cast<QQuickItem *>(richObj.data());
        QVERIFY(richItem);
        QQuickWindow window;
        window.resize(900, 600);
        richItem->setParentItem(window.contentItem());
        richItem->setWidth(860);
        richItem->setHeight(560);
        window.show();
        QTRY_VERIFY(window.isVisible());

        const QString canonicalHtml = QStringLiteral(
            "<h2>Section</h2><table><tbody>"
            "<tr><th><p>Name</p></th><th><p>Score</p></th></tr>"
            "<tr><td><p>KeepA</p></td><td><p>10</p></td></tr>"
            "<tr><td><p>HideB</p></td><td><p>20</p></td></tr>"
            "</tbody></table>");
        richItem->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&mockController)));
        richItem->setProperty("sourceHtml", canonicalHtml);
        richItem->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richItem, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        QQuickItem *textEditor = findVisualChildByObjectName(richItem, QStringLiteral("notesRichTextEditor"));
        QVERIFY(textEditor);
        QQuickItem *grips = findGripsItem(richItem);
        QVERIFY(grips);
        QObject *popover = grips->findChild<QObject *>(QStringLiteral("notesTableColumnTypePopover"));
        QVERIFY(popover);

        const QVariantMap firstFilter{
            {QStringLiteral("colType"), QStringLiteral("text")},
            {QStringLiteral("operator"), QStringLiteral("contains")},
            {QStringLiteral("value"), QStringLiteral("Keep")},
        };
        QVERIFY(QMetaObject::invokeMethod(popover, "filterUpdated",
                                          Q_ARG(int, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(firstFilter))));
        QCoreApplication::processEvents();
        QVERIFY(richItem->property("hasVisualTableFilter").toBool());
        QVERIFY(textEditor->property("readOnly").toBool());
        QCOMPARE(mockController.filterCalls, 1);

        // Next filter evaluation returns empty (failure): editor must restore canonical HTML and unlock.
        mockController.failNextFilter = true;
        const QVariantMap secondFilter{
            {QStringLiteral("colType"), QStringLiteral("text")},
            {QStringLiteral("operator"), QStringLiteral("contains")},
            {QStringLiteral("value"), QStringLiteral("Missing")},
        };
        QVERIFY(QMetaObject::invokeMethod(popover, "filterUpdated",
                                          Q_ARG(int, 0),
                                          Q_ARG(QVariant, QVariant::fromValue(secondFilter))));
        QCoreApplication::processEvents();

        QCOMPARE(mockController.filterCalls, 2);
        QVERIFY(!richItem->property("hasVisualTableFilter").toBool());
        QVERIFY(!textEditor->property("readOnly").toBool());
        QVERIFY(!richItem->property("hasPendingChanges").toBool());
        QCOMPARE(richItem->property("sourceHtml").toString(), canonicalHtml);
        QCOMPARE(grips->property("activeFilters").toMap().size(), 0);
        auto *quickDoc = qobject_cast<QQuickTextDocument *>(textEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDoc);
        QVERIFY(textOperations.richPlainText(quickDoc).contains(QStringLiteral("HideB")));
        QVERIFY(textOperations.richPlainText(quickDoc).contains(QStringLiteral("Section")));
    }
};

int runNativeNotesTableFilterPersistenceTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesTableFilterPersistenceTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_filter_persistence_test.moc"
