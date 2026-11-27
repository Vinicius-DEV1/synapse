#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtGui/QAccessible>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QtTest>

class NativeNotesPageHeaderActionTest final : public QObject {
    Q_OBJECT

private slots:
    void historyActionIsAccessibleAndKeyboardActivatable() {
        QQmlEngine engine;
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("activePillBg"), QStringLiteral("#202020")},
            {QStringLiteral("brand300"), QStringLiteral("#a78bfa")},
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
        });
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/page-view/PageHeaderActionButton.qml")));
        QScopedPointer<QObject> action(component.createWithInitialProperties({
            {QStringLiteral("actionKey"), QStringLiteral("history")},
            {QStringLiteral("actionIcon"), QStringLiteral("clock")},
            {QStringLiteral("actionLabel"), QStringLiteral("Histórico")},
            {QStringLiteral("tooltipText"), QStringLiteral("Histórico de edições")},
        }));
        QVERIFY2(action, qPrintable(component.errorString()));
        auto *actionItem = qobject_cast<QQuickItem *>(action.data());
        QVERIFY(actionItem);
        QAccessibleInterface *accessibleAction = QAccessible::queryAccessibleInterface(action.data());
        QVERIFY(accessibleAction);
        QCOMPARE(accessibleAction->role(), QAccessible::Button);
        QCOMPARE(accessibleAction->text(QAccessible::Name), QStringLiteral("Histórico"));

        QQuickWindow window;
        window.resize(800, 600);
        actionItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());
        actionItem->forceActiveFocus();
        QVERIFY(actionItem->hasActiveFocus());
        QSignalSpy triggered(action.data(), SIGNAL(triggered(QString,QQuickItem*)));
        QVERIFY(triggered.isValid());
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_COMPARE(triggered.count(), 1);
        QCOMPARE(triggered.first().first().toString(), QStringLiteral("history"));
    }
};

int runNativeNotesPageHeaderActionTest(int argc, char **argv) {
    NativeNotesPageHeaderActionTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_header_action_test.moc"
