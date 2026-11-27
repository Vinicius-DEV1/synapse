#include <QtCore/QUrl>
#include <QtGui/QColor>
#include <QtGui/QAccessible>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesPageHistoryKeyboardTest final : public QObject {
    Q_OBJECT

private:
    static QQuickItem *findVisualItem(QQuickItem *root, const QString &objectName) {
        if (!root) return nullptr;
        if (root->objectName() == objectName) return root;
        for (QQuickItem *child : root->childItems()) {
            if (QQuickItem *match = findVisualItem(child, objectName)) return match;
        }
        return nullptr;
    }

private slots:
    void historyRevisionButtonsRespondToKeyboard() {
        QQmlEngine engine;
        engine.rootContext()->setContextProperty(QStringLiteral("theme"), QVariantMap{
            {QStringLiteral("textSubtext"), QStringLiteral("#a7a9be")},
            {QStringLiteral("textDark"), QStringLiteral("#fffffe")},
            {QStringLiteral("textMuted"), QStringLiteral("#71717a")},
            {QStringLiteral("fontMono"), QStringLiteral("monospace")},
        });
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                             + QStringLiteral("/qml/notes/PageHistoryModal.qml")));
        QScopedPointer<QObject> modal(component.create());
        QVERIFY2(modal, qPrintable(component.errorString()));
        auto *modalItem = qobject_cast<QQuickItem *>(modal.data());
        QVERIFY(modalItem);
        QQuickWindow window;
        window.resize(1280, 900);
        modalItem->setParentItem(window.contentItem());
        auto *focusReturnTarget = new QQuickItem(window.contentItem());
        focusReturnTarget->setFocus(true);
        modal->setProperty("focusReturnItem", QVariant::fromValue(focusReturnTarget));
        modal->setProperty("history", QVariant::fromValue(QVariantList{
            QVariantMap{{QStringLiteral("id"), QStringLiteral("current")},
                        {QStringLiteral("content"), QStringLiteral("<p>Current revision</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-02T18:00:00Z")}},
            QVariantMap{{QStringLiteral("id"), QStringLiteral("older")},
                        {QStringLiteral("content"), QStringLiteral("<p>Older revision</p>")},
                        {QStringLiteral("created_at"), QStringLiteral("2026-09-01T18:00:00Z")}},
        }));
        modal->setProperty("visible", true);
        window.show();
        QTRY_VERIFY(window.isVisible());
        QSignalSpy closeRequested(modal.data(), SIGNAL(closeRequested()));
        QVERIFY(closeRequested.isValid());

        QQuickItem *currentRevision = nullptr;
        QTRY_VERIFY((currentRevision = findVisualItem(modalItem, QStringLiteral("historyRevisionCard-0"))));
        QQuickItem *olderRevision = nullptr;
        QTRY_VERIFY((olderRevision = findVisualItem(modalItem, QStringLiteral("historyRevisionCard-1"))));
        QAccessibleInterface *accessibleRevision = QAccessible::queryAccessibleInterface(currentRevision);
        QVERIFY(accessibleRevision);
        QCOMPARE(accessibleRevision->role(), QAccessible::Button);
        QVERIFY(accessibleRevision->text(QAccessible::Name).contains(QStringLiteral("Versão Atual")));
        QVERIFY(accessibleRevision->text(QAccessible::Name).contains(QStringLiteral("2026")));
        QTRY_VERIFY(currentRevision->hasActiveFocus());
        currentRevision->forceActiveFocus();
        QVERIFY(currentRevision->hasActiveFocus());
        QCOMPARE(qvariant_cast<QColor>(currentRevision->property("revisionBorderColor")), QColor(QStringLiteral("#6d28d9")));
        QTest::keyClick(&window, Qt::Key_Tab);
        QTRY_VERIFY(olderRevision->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_COMPARE(modal->property("selectedIndex").toInt(), 1);

        currentRevision->forceActiveFocus();
        QVERIFY(currentRevision->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_COMPARE(modal->property("selectedIndex").toInt(), 0);
        QVERIFY(currentRevision->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Escape);
        QTRY_COMPARE(closeRequested.count(), 1);
        modal->setProperty("visible", false);
        QTRY_VERIFY(focusReturnTarget->hasActiveFocus());
    }
};

int runNativeNotesPageHistoryKeyboardTest(int argc, char **argv) {
    NativeNotesPageHistoryKeyboardTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_history_keyboard_test.moc"
