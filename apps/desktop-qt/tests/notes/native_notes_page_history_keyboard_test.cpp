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
            QVariantMap{{QStringLiteral("id"), QStringLiteral("undecryptable")},
                        {QStringLiteral("content"), QString()},
                        {QStringLiteral("decryption_error"), true},
                        {QStringLiteral("created_at"), QStringLiteral("2026-08-31T18:00:00Z")}},
        }));
        modal->setProperty("visible", true);
        window.show();
        QTRY_VERIFY(window.isVisible());
        QSignalSpy closeRequested(modal.data(), SIGNAL(closeRequested()));
        QVERIFY(closeRequested.isValid());
        QSignalSpy restoreRequested(modal.data(), SIGNAL(restoreRevisionRequested(QString)));
        QVERIFY(restoreRequested.isValid());

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
        modal->setProperty("selectedIndex", 2);
        QQuickItem *decryptionError = findVisualItem(modalItem, QStringLiteral("historyDecryptionError"));
        QTRY_VERIFY(decryptionError && decryptionError->isVisible());
        QAccessibleInterface *accessibleDecryptionError = QAccessible::queryAccessibleInterface(decryptionError);
        QVERIFY(accessibleDecryptionError);
        QCOMPARE(accessibleDecryptionError->role(), QAccessible::AlertMessage);
        QVERIFY(accessibleDecryptionError->text(QAccessible::Name).contains(QStringLiteral("descriptografar")));
        QQuickItem *revisionContent = findVisualItem(modalItem, QStringLiteral("historyRevisionContent"));
        QVERIFY(revisionContent && !revisionContent->isVisible());
        QQuickItem *restoreButton = findVisualItem(modalItem, QStringLiteral("historyRestoreButton"));
        QQuickItem *diffButton = findVisualItem(modalItem, QStringLiteral("historyDiffToggleButton"));
        QVERIFY(restoreButton && diffButton);
        QVERIFY(!restoreButton->property("enabled").toBool());
        QVERIFY(!diffButton->property("enabled").toBool());
        QSignalSpy errorRestoreRequested(modal.data(), SIGNAL(restoreRevisionRequested(QString)));
        QVERIFY(QMetaObject::invokeMethod(modal.data(), "restoreSelectedRevision", Qt::DirectConnection));
        QCOMPARE(errorRestoreRequested.count(), 0);
        QCOMPARE(closeRequested.count(), 0);
        modal->setProperty("selectedIndex", 0);
        currentRevision->forceActiveFocus();
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
        modal->setProperty("selectedIndex", 2);
        QVERIFY(!diffAction->property("enabled").toBool());
        QVERIFY(!restoreAction->property("enabled").toBool());
        modal->setProperty("selectedIndex", 1);
        QTRY_VERIFY(restoreAction->property("enabled").toBool());
        QTest::keyClick(&window, Qt::Key_Down);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_COMPARE(restoreRequested.count(), 1);
        QCOMPARE(restoreRequested.first().first().toString(), QStringLiteral("<p>Older revision</p>"));
        QTRY_COMPARE(closeRequested.count(), 2);
        modal->setProperty("visible", false);
        QTRY_VERIFY(focusReturnTarget->hasActiveFocus());
        window.resize(639, 900);
        QTRY_COMPARE(qRound(modalItem->width()), 639);
        modal->setProperty("visible", true);
        QTRY_VERIFY(overflowButton->isVisible());
        QVERIFY(!diffButton->isVisible());
        QVERIFY(!restoreButton->isVisible());
        QQuickItem *revisionCount = findVisualItem(modalItem, QStringLiteral("historyRevisionCount"));
        QVERIFY(revisionCount && !revisionCount->isVisible());
        const QPointF closeAt639 = closeButton->mapToItem(modalItem, closeButton->width(), 0);
        QVERIFY(closeAt639.x() <= modalItem->width() - 20);

        modal->setProperty("selectedIndex", 0);
        window.resize(640, 900);
        QTRY_COMPARE(qRound(modalItem->width()), 640);
        QVERIFY(overflowButton->isVisible());
        QVERIFY(!diffButton->isVisible());
        QVERIFY(!restoreButton->isVisible());
        const QPointF closeAt640 = closeButton->mapToItem(modalItem, closeButton->width(), 0);
        QVERIFY(closeAt640.x() <= modalItem->width() - 20);
        QQuickItem *headerTitle = findVisualItem(modalItem, QStringLiteral("historyModalTitle"));
        QVERIFY(headerTitle && revisionCount && revisionCount->isVisible());

        window.resize(767, 900);
        QTRY_COMPARE(qRound(modalItem->width()), 767);
        QVERIFY(overflowButton->isVisible());
        QVERIFY(!diffButton->isVisible());
        QVERIFY(!restoreButton->isVisible());

        window.resize(768, 900);
        QTRY_COMPARE(qRound(modalItem->width()), 768);
        QVERIFY(!overflowButton->isVisible());
        QVERIFY(diffButton->isVisible());
        const QPointF titlePosition = headerTitle->mapToItem(modalItem, 0, 0);
        const QPointF countPosition = revisionCount->mapToItem(modalItem, 0, 0);
        QVERIFY(titlePosition.x() + headerTitle->width() <= countPosition.x());
        const QPointF diffPosition = diffButton->mapToItem(modalItem, 0, 0);
        const QPointF closePosition = closeButton->mapToItem(modalItem, 0, 0);
        QVERIFY(countPosition.x() + revisionCount->width() <= diffPosition.x());
        QVERIFY(diffPosition.x() + diffButton->width() <= closePosition.x());

        modal->setProperty("selectedIndex", 1);
        QTRY_VERIFY(restoreButton->isVisible());
        QVERIFY(!diffButton->isVisible());
        QTRY_VERIFY(restoreButton->mapToItem(modalItem, 0, 0).x()
                    >= countPosition.x() + revisionCount->width());
        const QPointF restorePosition = restoreButton->mapToItem(modalItem, 0, 0);
        QVERIFY(restorePosition.x() + restoreButton->width() <= closePosition.x());
        QVERIFY(restorePosition.x() + restoreButton->width() <= closePosition.x());
    }
};

int runNativeNotesPageHistoryKeyboardTest(int argc, char **argv) {
    NativeNotesPageHistoryKeyboardTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_page_history_keyboard_test.moc"
