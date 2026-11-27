#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class MockReferenceSearchController final : public QObject {
    Q_OBJECT
public:
    QVariantList requests;
    QVariantList cancellations;

    Q_INVOKABLE void searchPageReferences(const QString &query, int requestId) {
        requests.append(QVariantMap{{"query", query}, {"requestId", requestId}});
    }

    Q_INVOKABLE void cancelPageReferenceSearch(int requestId) {
        cancellations.append(requestId);
    }

    void completeSearch(int requestId, const QVariantList &pages) {
        emit pageReferenceSearchReady(QVariantMap{
            {"success", true}, {"requestId", requestId}, {"pages", pages}
        });
    }

signals:
    void pageReferenceSearchReady(const QVariantMap &result);
};

class NativeNotesReferenceSearchQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void contentSearchDebouncesAndIgnoresStaleResults() {
        QQmlEngine engine;
        NotesTextOperations operations;
        MockReferenceSearchController controller;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(960, 520);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *slashMenu = root->findChild<QObject *>("notesRichSlashCommandMenu");
        QObject *referenceFlow = root->findChild<QObject *>("notesRichPageReferenceFlow");
        QObject *pageMenu = root->findChild<QObject *>("notesRichPageReferenceMenu");
        QObject *searchField = root->findChild<QObject *>("notesRichPageReferenceSearchField");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(slashMenu);
        QVERIFY(referenceFlow);
        QVERIFY(pageMenu);
        QVERIFY(searchField);

        richEditor->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        richEditor->setProperty("pageList", QVariantList{
            QVariantMap{{"id", "page-body"}, {"title", "Reference target"}, {"icon", "📄"}, {"depth", 0}}
        });
        richEditor->setProperty("sourceHtml", "<p>BeginEnd</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        textEdit->setProperty("cursorPosition", 5);
        auto *textItem = qobject_cast<QQuickItem *>(textEdit);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTRY_VERIFY(textItem->hasActiveFocus());
        QTest::keyClick(&window, Qt::Key_Slash);
        for (const int key : {Qt::Key_P, Qt::Key_A, Qt::Key_G, Qt::Key_E}) QTest::keyClick(&window, key);
        QTRY_VERIFY(slashMenu->property("visible").toBool());

        const QVariantList commands = slashMenu->property("filteredCommands").toList();
        int pageCommandIndex = -1;
        for (int index = 0; index < commands.size(); ++index) {
            if (commands.at(index).toMap().value("id").toString() == "page") pageCommandIndex = index;
        }
        QVERIFY(pageCommandIndex >= 0);
        slashMenu->setProperty("selectedIndex", pageCommandIndex);
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(pageMenu->property("visible").toBool());
        QTRY_VERIFY(pageMenu->property("width").toReal() > 0.0);
        QTRY_VERIFY(pageMenu->property("height").toReal() > 0.0);
        QVERIFY(pageMenu->property("width").toReal() <= 288.0);
        QVERIFY(pageMenu->property("height").toReal() <= 320.0);

        searchField->setProperty("text", "needle");
        QVERIFY(pageMenu->property("searchPending").toBool());
        QTest::qWait(100);
        QCOMPARE(controller.requests.size(), 0);
        QTRY_COMPARE_WITH_TIMEOUT(controller.requests.size(), 1, 1000);
        const int staleRequestId = controller.requests.first().toMap().value("requestId").toInt();

        searchField->setProperty("text", "fresh query");
        QVERIFY(controller.cancellations.contains(staleRequestId));
        QTRY_COMPARE_WITH_TIMEOUT(controller.requests.size(), 2, 1000);
        const int currentRequestId = controller.requests.last().toMap().value("requestId").toInt();

        controller.completeSearch(staleRequestId, {QVariantMap{
            {"id", "page-body"}, {"title", "Reference target"}, {"icon", "📄"}
        }});
        QCOMPARE(pageMenu->property("searchPending").toBool(), true);
        QCOMPARE(pageMenu->property("filteredPages").toList().size(), 0);

        controller.completeSearch(currentRequestId, {QVariantMap{
            {"id", "page-body"}, {"title", "Reference target"}, {"icon", "📄"}
        }});
        QTRY_COMPARE(pageMenu->property("filteredPages").toList().size(), 1);
        QCOMPARE(pageMenu->property("filteredPages").toList().first().toMap().value("id").toString(),
                 QString("page-body"));
        QVERIFY(!pageMenu->property("searchPending").toBool());

        auto *flowItem = qobject_cast<QQuickItem *>(referenceFlow);
        QVERIFY(flowItem);
        QVERIFY(flowItem->width() > 0.0);
        QVERIFY(flowItem->height() > 0.0);
        const int cursorBeforeOutsideClick = textEdit->property("cursorPosition").toInt();
        const QPointF outsidePoint = flowItem->mapToItem(window.contentItem(),
            QPointF(flowItem->width() - 4.0, flowItem->height() - 4.0));
        QTest::mouseClick(&window, Qt::LeftButton, Qt::NoModifier, outsidePoint.toPoint());
        QTRY_VERIFY(!pageMenu->property("visible").toBool());
        QTRY_VERIFY(textEdit->property("cursorPosition").toInt() != cursorBeforeOutsideClick);
    }
};

int runNativeNotesReferenceSearchQmlTest(int argc, char **argv) {
    NativeNotesReferenceSearchQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_reference_search_qml_test.moc"
