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

    static QObject *findBlockListWithId(QObject *root, const QString &blockId, int &blockIndex) {
        if (!root) return nullptr;
        if (root->metaObject()->indexOfProperty("blocks") >= 0) {
            const QVariantList blocks = root->property("blocks").toList();
            for (int i = 0; i < blocks.size(); ++i) {
                if (blocks.at(i).toMap().value(QStringLiteral("id")).toString() == blockId) {
                    blockIndex = i;
                    return root;
                }
            }
        }
        for (QObject *child : root->children()) {
            if (QObject *match = findBlockListWithId(child, blockId, blockIndex)) return match;
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
        const QString destinationPageId = controller.createSubPage(QString(), QStringLiteral("AI destination"), QStringLiteral("📄"));
        QVERIFY(!destinationPageId.isEmpty());
        QVERIFY(controller.savePage(destinationPageId, QStringLiteral("AI destination"),
                                    QStringLiteral("<p>Untouched destination</p>"), QStringLiteral("📄")));
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

        QQmlComponent clientComponent(&engine);
        clientComponent.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/qml/NotesAiPromptClientHarness.qml")));
        QScopedPointer<QObject> promptClient(clientComponent.create());
        QVERIFY2(promptClient, qPrintable(clientComponent.errorString()));
        modal->setProperty("aiClientOverride", QVariant::fromValue(promptClient.data()));
        simpleToggle = findToggle(rootItem, false);
        QVERIFY(simpleToggle);
        simpleButton = simpleToggle->property("aiButtonItem").value<QObject *>();
        QVERIFY(simpleButton);
        QVERIFY(QMetaObject::invokeMethod(simpleButton, "clicked", Qt::DirectConnection));
        QVERIFY(modal->property("isOpen").toBool());
        QVERIFY(QMetaObject::invokeMethod(modal, "runPrompt", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(QStringLiteral("Late request")))));
        QVERIFY(modal->property("isGenerating").toBool());
        QTRY_VERIFY(promptClient->property("pendingCallback").isValid());

        QVariant pageChangeResult;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage", Q_RETURN_ARG(QVariant, pageChangeResult),
                                          Q_ARG(QVariant, QVariant(destinationPageId))));
        QVERIFY(pageChangeResult.toBool());
        QTest::qWait(250);
        QVERIFY(QMetaObject::invokeMethod(promptClient.data(), "complete", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(true)),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("Title: Stale edit\nMust not reach another page"))),
                                          Q_ARG(QVariant, QVariant(QString()))));
        QCOMPARE(promptClient->property("completionCount").toInt(), 1);

        QObject *currentModal = pageView->findChild<QObject *>(QStringLiteral("notesAiPromptModal"));
        if (currentModal && currentModal->property("isOpen").toBool()) {
            const QVariantMap staleReply{
                {QStringLiteral("role"), QStringLiteral("assistant")},
                {QStringLiteral("content"), QStringLiteral("Title: Stale edit\nMust not reach another page")},
            };
            QVariant staleApplyResult;
            QVERIFY(QMetaObject::invokeMethod(currentModal, "applyMessageProposal", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, staleApplyResult),
                                              Q_ARG(QVariant, QVariant(staleReply)),
                                              Q_ARG(QVariant, QVariant(true))));
            QVERIFY(!staleApplyResult.toBool());
        } else {
            QVERIFY(promptClient->property("abortCount").toInt() > 0);
        }
        QCOMPARE(controller.getPage(destinationPageId).value(QStringLiteral("content")).toString(),
                 QStringLiteral("<p>Untouched destination</p>"));
        const QString originalPageAfterStaleApply = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(originalPageAfterStaleApply.contains(QStringLiteral("Simple body from AI")),
                 qPrintable(originalPageAfterStaleApply));
        QVERIFY(!originalPageAfterStaleApply.contains(QStringLiteral("Must not reach another page")));

        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage", Q_RETURN_ARG(QVariant, pageChangeResult),
                                          Q_ARG(QVariant, QVariant(pageId))));
        QVERIFY(pageChangeResult.toBool());
        QTest::qWait(350);
        modal = pageView->findChild<QObject *>(QStringLiteral("notesAiPromptModal"));
        QVERIFY(modal);
        modal->setProperty("aiClientOverride", QVariant::fromValue(promptClient.data()));
        simpleToggle = findToggle(rootItem, false);
        QVERIFY(simpleToggle);
        const QString removedBlockId = simpleToggle->property("blockData").toMap()
                                           .value(QStringLiteral("id")).toString();
        QVERIFY(!removedBlockId.isEmpty());
        simpleButton = simpleToggle->property("aiButtonItem").value<QObject *>();
        QVERIFY(simpleButton);
        QVERIFY(QMetaObject::invokeMethod(simpleButton, "clicked", Qt::DirectConnection));
        QVERIFY(QMetaObject::invokeMethod(modal, "runPrompt", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(QStringLiteral("Request before block deletion")))));
        QVERIFY(modal->property("isGenerating").toBool());
        QTRY_VERIFY(promptClient->property("pendingCallback").isValid());

        int blockIndex = -1;
        QObject *blockList = findBlockListWithId(rootItem, removedBlockId, blockIndex);
        QVERIFY(blockList);
        QVERIFY(blockIndex >= 0);
        savedSpy.clear();
        QVERIFY(QMetaObject::invokeMethod(blockList, "requestBlockDeletion", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(blockIndex)), Q_ARG(QVariant, QVariant())));
        QTRY_VERIFY_WITH_TIMEOUT(savedSpy.count() >= 1, 2500);
        QTest::qWait(250);
        const QString contentAfterRemoval = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(!contentAfterRemoval.contains(QStringLiteral("Simple body from AI")), qPrintable(contentAfterRemoval));
        QVERIFY(contentAfterRemoval.contains(QStringLiteral("Callout body from AI")));

        QVERIFY(QMetaObject::invokeMethod(promptClient.data(), "complete", Qt::DirectConnection,
                                          Q_ARG(QVariant, QVariant(true)),
                                          Q_ARG(QVariant, QVariant(QStringLiteral("Title: Removed target edit\nMust not return"))),
                                          Q_ARG(QVariant, QVariant(QString()))));
        QCOMPARE(promptClient->property("completionCount").toInt(), 2);
        QObject *modalAfterRemoval = pageView->findChild<QObject *>(QStringLiteral("notesAiPromptModal"));
        if (modalAfterRemoval && modalAfterRemoval->property("isOpen").toBool()) {
            const QVariantMap removedReply{
                {QStringLiteral("role"), QStringLiteral("assistant")},
                {QStringLiteral("content"), QStringLiteral("Title: Removed target edit\nMust not return")},
            };
            QVariant removedApplyResult;
            QVERIFY(QMetaObject::invokeMethod(modalAfterRemoval, "applyMessageProposal", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, removedApplyResult),
                                              Q_ARG(QVariant, QVariant(removedReply)),
                                              Q_ARG(QVariant, QVariant(true))));
            QVERIFY(!removedApplyResult.toBool());
        } else {
            QVERIFY(promptClient->property("abortCount").toInt() > 0);
        }
        if (modalAfterRemoval) {
            QMetaObject::invokeMethod(modalAfterRemoval, "closeModal", Qt::DirectConnection);
            modalAfterRemoval->setProperty("aiClientOverride", QVariant());
        }
        const QString contentAfterLateRemovalReply = controller.getPage(pageId).value(QStringLiteral("content")).toString();
        QVERIFY2(contentAfterLateRemovalReply.contains(QStringLiteral("Callout body from AI")),
                 qPrintable(contentAfterLateRemovalReply));
        QVERIFY(!contentAfterLateRemovalReply.contains(QStringLiteral("Must not return")));
    }
};

int runNativeNotesAiToggleTargetTest(int argc, char **argv) {
    NativeNotesAiToggleTargetTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_ai_toggle_target_test.moc"
