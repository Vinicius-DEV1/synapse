#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QAccessible>
#include <QtGui/QGuiApplication>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesLinkPreviewActionMenuTest final : public QObject {
    Q_OBJECT
private slots:
    void actionMenuExposesNamedKeyboardActions() {
        QQmlEngine engine;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesLinkPreviewActionMenu.qml")));
        QScopedPointer<QObject> actionBar(component.create());
        QVERIFY2(actionBar, qPrintable(component.errorString()));
        actionBar->setProperty("actions", QVariantList{
            QVariantMap{{"label", "Mark completed: Example"}, {"url", "synapse-link://status?item=1"}},
            QVariantMap{{"label", "Copy URL: Example"}, {"url", "synapse-link://copy?item=1"}}});

        QQuickWindow window;
        window.resize(640, 240);
        auto *rootItem = qobject_cast<QQuickItem *>(actionBar.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QAccessible::setActive(true);
        QTRY_VERIFY(window.isVisible());

        QObject *trigger = actionBar->findChild<QObject *>("notesLinkPreviewActionButton");
        QObject *popup = actionBar->findChild<QObject *>("notesLinkPreviewActionPopup");
        QVERIFY(trigger);
        QVERIFY(popup);
        auto *triggerItem = qobject_cast<QQuickItem *>(trigger);
        QVERIFY(triggerItem);
        auto *accessibleTrigger = QAccessible::queryAccessibleInterface(trigger);
        QVERIFY(accessibleTrigger);
        QCOMPARE(accessibleTrigger->role(), QAccessible::Button);
        QCOMPARE(accessibleTrigger->text(QAccessible::Name), QString("Link actions"));

        QSignalSpy activated(actionBar.data(), SIGNAL(actionActivated(QString)));
        QVERIFY(activated.isValid());
        triggerItem->forceActiveFocus();
        QTRY_VERIFY(triggerItem->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Space);
        QTRY_VERIFY(popup->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_Down);
        QTest::keyClick(&window, Qt::Key_Down);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_COMPARE(activated.size(), 1);
        QCOMPARE(activated.takeFirst().at(0).toString(), QString("synapse-link://copy?item=1"));
    }
};

class NativeNotesLinkVaultController final : public QObject {
    Q_OBJECT
public:
    QVariantMap entity{
        {"canonicalUrl", "https://notes.example/resource"},
        {"title", "Saved title"}, {"notes", "Saved from Link Vault"},
        {"watched", false}, {"watching", false}, {"color", "default"}
    };

    Q_INVOKABLE QVariantMap getLinkMetadata(const QString &) const { return {}; }
    Q_INVOKABLE QVariantMap getLinkEntity(const QString &url) const {
        return url == entity.value("canonicalUrl").toString() ? entity : QVariantMap{};
    }
    Q_INVOKABLE QVariantMap setLinkEntityStatus(const QString &url, bool watched, bool watching) {
        if (url != entity.value("canonicalUrl").toString()) return {{"success", false}};
        entity.insert("watched", watched);
        entity.insert("watching", watching);
        return {{"success", true}};
    }
    Q_INVOKABLE QVariantMap setLinkEntityNotes(const QString &url, const QString &notes) {
        if (url != entity.value("canonicalUrl").toString()) return {{"success", false}};
        entity.insert("notes", notes);
        return {{"success", true}};
    }
    Q_INVOKABLE QVariantList findDuplicateNoteLinks(const QString &, const QString &) const { return {}; }
};

class NativeNotesLinkPreviewCardVaultTest final : public QObject {
    Q_OBJECT
private slots:
    void cardSyncsStatusAndNotesWithLinkVault() {
        QQmlEngine engine;
        NativeNotesLinkVaultController controller;
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/LinkPreviewCard.qml")));
        QScopedPointer<QObject> card(component.create());
        QVERIFY2(card, qPrintable(component.errorString()));

        card->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        card->setProperty("blockData", QVariantMap{
            {"id", "blk_lp"},
            {"blockType", "linkPreview"},
            {"attrs", QVariantMap{{"url", "https://notes.example/resource"}, {"title", "Saved"}}}
        });

        QCOMPARE(card->property("notesText").toString(), QString("Saved from Link Vault"));
        QVERIFY(QMetaObject::invokeMethod(card.data(), "saveStatus", Q_ARG(QVariant, true), Q_ARG(QVariant, false)));
        QCOMPARE(controller.entity.value("watched").toBool(), true);
        QCOMPARE(controller.entity.value("watching").toBool(), false);
        QCOMPARE(card->property("isWatched").toBool(), true);
    }
};

int runNativeNotesLinkPreviewQmlTest() {
    NativeNotesLinkPreviewActionMenuTest menuTest;
    NativeNotesLinkPreviewCardVaultTest cardTest;
    return QTest::qExec(&menuTest) | QTest::qExec(&cardTest);
}

#include "native_notes_link_preview_qml_test.moc"
