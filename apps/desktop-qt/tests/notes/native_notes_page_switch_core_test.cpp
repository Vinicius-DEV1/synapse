#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QTemporaryDir>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtCore/QUrl>
#include <QtTest/QtTest>

class NativeNotesPageSwitchCoreTest final : public QObject {
    Q_OBJECT

private slots:
    void coreConflictReachesDialogAndKeepsLocalEditAfterRetry() {
        QTemporaryDir databaseDirectory;
        QVERIFY(databaseDirectory.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(databaseDirectory.filePath(QStringLiteral("notes.sqlite"))));
        const QString firstPageId = controller.createSubPage(QString(), QStringLiteral("First"));
        const QString secondPageId = controller.createSubPage(QString(), QStringLiteral("Second"));
        QVERIFY(!firstPageId.isEmpty());
        QVERIFY(!secondPageId.isEmpty());
        QVERIFY(controller.savePage(firstPageId, QStringLiteral("First"),
                                   QStringLiteral("<p>Initial content</p>"), QStringLiteral("📄")));
        const QString baseTimestamp = controller.getPage(firstPageId).value("updated_at").toString();
        QVERIFY(!baseTimestamp.isEmpty());
        const QString remoteEdit = QStringLiteral("<p>Newer remote edit</p>");

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
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));

        pageView->setProperty("selectedPageId", firstPageId);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "loadActivePage"));
        QCOMPARE(pageView->property("activeContent").toString(), QStringLiteral("<p>Initial content</p>"));
        QTest::qWait(20);
        QVERIFY(controller.savePage(firstPageId, QStringLiteral("First"), remoteEdit,
                                   QStringLiteral("📄"), baseTimestamp));
        QVariant selectionResult;
        const QString localEdit = QStringLiteral("<p>Local edit survives Core conflict</p>");
        pageView->setProperty("activeContent", localEdit);
        pageView->setProperty("isDirty", true);
        pageView->setProperty("saveStatus", QStringLiteral("dirty"));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(secondPageId))));
        QVERIFY(!selectionResult.toBool());
        QCOMPARE(pageView->property("selectedPageId").toString(), firstPageId);
        QCOMPARE(pageView->property("activeContent").toString(), localEdit);
        QVERIFY(pageView->property("isDirty").toBool());
        QVERIFY(pageView->property("pageConflictDialogOpen").toBool());

        QVariant choiceResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "keepLocalVersionAfterConflict",
                                          Q_RETURN_ARG(QVariant, choiceResult)));
        QVERIFY(choiceResult.toBool());
        QCOMPARE(pageView->property("activeUpdatedAt").toString(),
                 controller.getPage(firstPageId).value("updated_at").toString());
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selectionResult),
                                          Q_ARG(QVariant, QVariant(secondPageId))));
        QVERIFY(selectionResult.toBool());
        QCOMPARE(controller.getPage(firstPageId).value("content").toString(), localEdit);
        QCOMPARE(pageView->property("selectedPageId").toString(), secondPageId);
    }
};

int runNativeNotesPageSwitchCoreTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesPageSwitchCoreTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_switch_core_test.moc"
