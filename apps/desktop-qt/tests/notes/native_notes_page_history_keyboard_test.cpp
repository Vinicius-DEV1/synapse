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
        QQuickItem *closeButton = nullptr;
        QTRY_VERIFY((closeButton = findVisualItem(modalItem, QStringLiteral("historyCloseButton"))));
        QAccessibleInterface *accessibleClose = QAccessible::queryAccessibleInterface(closeButton);
        QVERIFY(accessibleClose);
        QCOMPARE(accessibleClose->role(), QAccessible::Button);
        QCOMPARE(accessibleClose->text(QAccessible::Name), QStringLiteral("Fechar histórico de edições"));
        QCOMPARE(qRound(closeButton->width()), 34);
        QCOMPARE(qRound(closeButton->height()), 34);
        QQuickItem *closeIcon = findVisualItem(modalItem, QStringLiteral("historyCloseIcon"));
        QVERIFY(closeIcon);
        QCOMPARE(qRound(closeIcon->width()), 18);
        QCOMPARE(qRound(closeIcon->height()), 18);
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

        window.resize(360, 900);
        modal->setProperty("visible", true);
        QTRY_COMPARE(qRound(modalItem->width()), 360);
        QTRY_VERIFY(closeButton->isVisible());
        const QPointF closeTopRight = closeButton->mapToItem(modalItem, closeButton->width(), 0);
        QVERIFY(closeTopRight.x() <= modalItem->width() - 20);
        QQuickItem *overflowButton = findVisualItem(modalItem, QStringLiteral("historyHeaderOverflowButton"));
        QQuickItem *diffButton = findVisualItem(modalItem, QStringLiteral("historyDiffToggleButton"));
        QQuickItem *restoreButton = findVisualItem(modalItem, QStringLiteral("historyRestoreButton"));
        QVERIFY(overflowButton && overflowButton->isVisible());
        QVERIFY(diffButton && restoreButton);
        QVERIFY(!diffButton->isVisible());
        QVERIFY(!restoreButton->isVisible());
        QAccessibleInterface *accessibleOverflow = QAccessible::queryAccessibleInterface(overflowButton);
        QVERIFY(accessibleOverflow);
        QCOMPARE(accessibleOverflow->text(QAccessible::Name), QStringLiteral("Mais ações do histórico"));
        overflowButton->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Space);
        QObject *overflowMenu = modal->findChild<QObject *>(QStringLiteral("historyHeaderOverflowMenu"));
        QVERIFY(overflowMenu);
        QTRY_VERIFY(overflowMenu->property("visible").toBool());
        QObject *diffAction = overflowMenu->findChild<QObject *>(QStringLiteral("historyDiffMenuItem"));
        QObject *restoreAction = overflowMenu->findChild<QObject *>(QStringLiteral("historyRestoreMenuItem"));
        QVERIFY(diffAction && restoreAction);
        QVERIFY(diffAction->property("enabled").toBool());
        QVERIFY(!restoreAction->property("enabled").toBool());
    }
};

int runNativeNotesPageHistoryKeyboardTest(int argc, char **argv) {
    NativeNotesPageHistoryKeyboardTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_history_keyboard_test.moc"
