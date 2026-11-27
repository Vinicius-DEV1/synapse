#include "synapse_controller.h"
#include "controllers/notes/notes_text_operations.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QPointer>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesAiToggleTargetTest final : public QObject {
    Q_OBJECT

private:
    static void collectToggleItems(QQuickItem *parent, QList<QQuickItem *> &items) {
        if (!parent) return;
        if (parent->objectName() == QLatin1String("notesToggleBlockRoot")) items.append(parent);
        for (QQuickItem *child : parent->childItems()) collectToggleItems(child, items);
    }

    static QQuickItem *findToggle(QQuickItem *root, bool calloutMode) {
        QList<QQuickItem *> toggles;
        collectToggleItems(root, toggles);
        for (QQuickItem *toggle : toggles) {
            if (toggle->property("isCalloutMode").toBool() == calloutMode) return toggle;
        }
        return nullptr;
    }

    static bool applyProposal(QObject *button, QObject *modal, const QString &proposal) {
        if (!button || !modal) return false;
        if (!QMetaObject::invokeMethod(button, "clicked", Qt::DirectConnection)) return false;
        if (!modal->property("isOpen").toBool()) return false;
        const QVariantMap reply{
            {QStringLiteral("role"), QStringLiteral("assistant")},
            {QStringLiteral("content"), proposal},
        };
        QVariant result;
        return QMetaObject::invokeMethod(modal, "applyMessageProposal", Qt::DirectConnection,
                                         Q_RETURN_ARG(QVariant, result), Q_ARG(QVariant, reply),
                                         Q_ARG(QVariant, QVariant(true))) && result.toBool();
    }

private slots:
    void toggleAndCalloutToggleAiApplyPersistThroughProductionPageView() {
        QTemporaryDir tempDir;
        QVERIFY(tempDir.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(tempDir.filePath(QStringLiteral("notes-ai-toggle-targets.sqlite"))));
        const QString pageId = controller.createSubPage(QString(), QStringLiteral("Toggle AI targets"), QStringLiteral("📄"));
        QVERIFY(!pageId.isEmpty());
        const QString initialHtml = QStringLiteral(
            "<div data-type=\"toggle-block\" class=\"toggle-block\" data-title=\"Simple title\" data-is-open=\"true\"><p>Simple source body</p></div>"
            "<div data-type=\"blockquote-toggle\" class=\"blockquote-toggle\" data-color=\"#3b82f6\" data-title=\"Callout title\" data-is-open=\"true\"><p>Callout source body</p></div>");
        QVERIFY(controller.savePage(pageId, QStringLiteral("Toggle AI targets"), initialHtml, QStringLiteral("📄")));
        NotesTextOperations operations;
        registerNotesPageSwitchTestTypes();

        QQuickWindow window;
        window.resize(1280, 800);
        window.show();

        QQmlEngine engine;
        engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &controller);
        engine.rootContext()->setContextProperty(QStringLiteral("notesTextOperations"), &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> pageView(component.create());
        QVERIFY2(pageView, qPrintable(component.errorString()));
        QQuickItem *rootItem = qobject_cast<QQuickItem *>(pageView.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        rootItem->setWidth(1000);
        rootItem->setHeight(800);
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage", Q_ARG(QVariant, QVariant(pageId))));
        QTest::qWait(350);

        QObject *modal = pageView->findChild<QObject *>(QStringLiteral("notesAiPromptModal"));
        QVERIFY(modal);
        QSignalSpy savedSpy(pageView.data(), SIGNAL(pageSavedExternal(QString,QString)));

        QQuickItem *simpleToggle = findToggle(rootItem, false);
        QVERIFY(simpleToggle);
        QObject *simpleButton = simpleToggle->property("aiButtonItem").value<QObject *>();
        QVERIFY(simpleButton);
        QVERIFY(applyProposal(simpleButton, modal, QStringLiteral("Title: Revised simple title\nSimple body from AI")));
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(250);
        QString savedHtml = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(savedHtml.contains(QStringLiteral("Revised simple title")), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains(QStringLiteral("Simple body from AI")), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains(QStringLiteral("Callout source body")), qPrintable(savedHtml));
        QVERIFY(!savedHtml.contains(QStringLiteral("Simple source body")));

        savedSpy.clear();
        QQuickItem *calloutToggle = findToggle(rootItem, true);
        QVERIFY(calloutToggle);
        QObject *calloutButton = calloutToggle->property("aiButtonItem").value<QObject *>();
        QVERIFY(calloutButton);
        QVERIFY(applyProposal(calloutButton, modal,
                              QStringLiteral("Title: Revised callout title\nCallout body from AI")));
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(250);
        savedHtml = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(savedHtml.contains(QStringLiteral("Revised callout title")), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains(QStringLiteral("Callout body from AI")), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains(QStringLiteral("data-color=\"#3b82f6\"")), qPrintable(savedHtml));
        QVERIFY2(savedHtml.contains(QStringLiteral("Simple body from AI")), qPrintable(savedHtml));
        QVERIFY(!savedHtml.contains(QStringLiteral("Callout source body")));
    }
};

int runNativeNotesAiToggleTargetTest(int argc, char **argv) {
    NativeNotesAiToggleTargetTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_ai_toggle_target_test.moc"
