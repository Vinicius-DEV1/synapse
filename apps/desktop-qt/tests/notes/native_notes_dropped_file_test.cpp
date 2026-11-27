#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QFile>
#include <QtCore/QRegularExpression>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

namespace {

QQuickItem *findVisualItem(QQuickItem *root, const QString &name) {
    if (!root) return nullptr;
    if (root->objectName() == name) return root;
    for (QQuickItem *child : root->childItems()) {
        if (QQuickItem *found = findVisualItem(child, name)) {
            return found;
        }
    }
    return nullptr;
}

QString extractAttr(const QString &tag, const QString &attr) {
    const QRegularExpression re(QRegularExpression::escape(attr) + QStringLiteral("=\"([^\"]*)\""));
    const QRegularExpressionMatch match = re.match(tag);
    return match.hasMatch() ? match.captured(1) : QString();
}

} // namespace

class NativeNotesDroppedFileTest final : public QObject {
    Q_OBJECT

private slots:
    void droppedFilesImportEncryptOrderAndPersistAcrossReload() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString pdfPath = sandbox.filePath(QStringLiteral("first-doc.pdf"));
        const QString txtPath = sandbox.filePath(QStringLiteral("second note.txt"));
        {
            QFile f1(pdfPath);
            QVERIFY(f1.open(QIODevice::WriteOnly));
            QCOMPARE(f1.write("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"), 29);
            QFile f2(txtPath);
            QVERIFY(f2.open(QIODevice::WriteOnly));
            QCOMPARE(f2.write("Hello dropped file"), 18);
        }

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        QVERIFY(controller.setupMasterPassword(QStringLiteral("DroppedFilesPass42!")));
        const QString pageOneId = controller.createSubPage(QString(), QStringLiteral("Drop Page"));
        const QString pageTwoId = controller.createSubPage(QString(), QStringLiteral("Other Page"));
        QVERIFY(!pageOneId.isEmpty());
        QVERIFY(!pageTwoId.isEmpty());
        QVERIFY(controller.savePage(pageOneId, QStringLiteral("Drop Page"),
                                   QStringLiteral("<p>AlphaBeta</p>"), QStringLiteral("📄")));
        QVERIFY(controller.savePage(pageTwoId, QStringLiteral("Other Page"),
                                   QStringLiteral("<p>Other</p>"), QStringLiteral("📄")));

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

        QQuickItem *editorCanvas = nullptr;
        QTRY_VERIFY((editorCanvas = findVisualItem(pageViewItem, QStringLiteral("notesEditorCanvas"))) != nullptr);
        QQuickItem *richEditor = nullptr;
        QTRY_VERIFY((richEditor = findVisualItem(pageViewItem, QStringLiteral("notesRichTextEditorRoot"))) != nullptr);
        QTRY_VERIFY(richEditor->property("active").toBool());
        QTRY_VERIFY(!richEditor->property("isLoading").toBool());

        const QVariantList urls{
            QUrl::fromLocalFile(pdfPath),
            QUrl::fromLocalFile(txtPath),
        };
        QVERIFY(QMetaObject::invokeMethod(editorCanvas, "handleDroppedFileUrls",
                                          Q_ARG(QVariant, QVariant::fromValue(urls)),
                                          Q_ARG(QVariant, 40.0),
                                          Q_ARG(QVariant, 12.0)));

        QTRY_VERIFY_WITH_TIMEOUT(
            editorCanvas->property("pendingFileDropRequestId").toString().isEmpty() &&
            editorCanvas->property("pendingFileDropQueue").toList().isEmpty(),
            15000);

        const QString content = pageView->property("activeContent").toString();
        const QRegularExpression widgetRe(QStringLiteral("<div[^>]*data-type=\"file-widget\"[^>]*></div>"));
        QRegularExpressionMatchIterator it = widgetRe.globalMatch(content);
        QStringList widgets;
        while (it.hasNext()) widgets.append(it.next().captured(0));
        QCOMPARE(widgets.size(), 2);

        QCOMPARE(extractAttr(widgets[0], QStringLiteral("data-name")), QStringLiteral("first-doc.pdf"));
        QCOMPARE(extractAttr(widgets[0], QStringLiteral("data-file-type")), QStringLiteral("pdf"));
        QCOMPARE(extractAttr(widgets[0], QStringLiteral("data-file-size")), QStringLiteral("29"));
        const QString firstFileId = extractAttr(widgets[0], QStringLiteral("data-file-id"));
        QVERIFY(!firstFileId.isEmpty());
        QCOMPARE(controller.getFileWidgetMetadata(firstFileId).value(QStringLiteral("name")).toString(),
                 QStringLiteral("first-doc.pdf"));

        QCOMPARE(extractAttr(widgets[1], QStringLiteral("data-name")), QStringLiteral("second note.txt"));
        QCOMPARE(extractAttr(widgets[1], QStringLiteral("data-file-type")), QStringLiteral("text"));
        QCOMPARE(extractAttr(widgets[1], QStringLiteral("data-file-size")), QStringLiteral("18"));
        const QString secondFileId = extractAttr(widgets[1], QStringLiteral("data-file-id"));
        QVERIFY(!secondFileId.isEmpty());
        QCOMPARE(controller.getFileWidgetMetadata(secondFileId).value(QStringLiteral("name")).toString(),
                 QStringLiteral("second note.txt"));

        // Save, switch away, and reload to verify persistence.
        QVariant saved;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "saveActiveNote", Q_RETURN_ARG(QVariant, saved)));
        QVERIFY(saved.toBool());

        QVariant selected;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selected),
                                          Q_ARG(QVariant, QVariant(pageTwoId))));
        QVERIFY(selected.toBool());
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selected),
                                          Q_ARG(QVariant, QVariant(pageOneId))));
        QVERIFY(selected.toBool());

        const QString reloadedContent = pageView->property("activeContent").toString();
        QVERIFY(reloadedContent.contains(firstFileId));
        QVERIFY(reloadedContent.contains(secondFileId));
        QVERIFY(reloadedContent.indexOf(firstFileId) < reloadedContent.indexOf(secondFileId));
    }

    void droppedFileLockedVaultStaleTargetAndPageSwitchRejectInsertion() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString txtPath = sandbox.filePath(QStringLiteral("sample.txt"));
        {
            QFile f(txtPath);
            QVERIFY(f.open(QIODevice::WriteOnly));
            QCOMPARE(f.write("Sample"), 6);
        }

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("notes.sqlite"))));
        QVERIFY(controller.setupMasterPassword(QStringLiteral("DroppedFilesPass42!")));
        const QString pageOneId = controller.createSubPage(QString(), QStringLiteral("Page 1"));
        const QString pageTwoId = controller.createSubPage(QString(), QStringLiteral("Page 2"));
        QVERIFY(!pageOneId.isEmpty());
        QVERIFY(!pageTwoId.isEmpty());
        QVERIFY(controller.savePage(pageOneId, QStringLiteral("Page 1"),
                                   QStringLiteral("<p>Original text</p>"), QStringLiteral("📄")));
        QVERIFY(controller.savePage(pageTwoId, QStringLiteral("Page 2"),
                                   QStringLiteral("<p>Second</p>"), QStringLiteral("📄")));

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

        QQuickItem *editorCanvas = nullptr;
        QTRY_VERIFY((editorCanvas = findVisualItem(pageViewItem, QStringLiteral("notesEditorCanvas"))) != nullptr);
        QQuickItem *richEditor = nullptr;
        QTRY_VERIFY((richEditor = findVisualItem(pageViewItem, QStringLiteral("notesRichTextEditorRoot"))) != nullptr);
        QQuickItem *textEditor = findVisualItem(richEditor, QStringLiteral("notesRichTextEditor"));
        QVERIFY(textEditor);
        QTRY_VERIFY(richEditor->property("active").toBool());
        QTRY_VERIFY(!richEditor->property("isLoading").toBool());

        const QVariantList urls{QUrl::fromLocalFile(txtPath)};

        // 1. Locked vault must reject import and insert no widget.
        controller.lockVault();
        QVERIFY(QMetaObject::invokeMethod(editorCanvas, "handleDroppedFileUrls",
                                          Q_ARG(QVariant, QVariant::fromValue(urls)),
                                          Q_ARG(QVariant, 20.0),
                                          Q_ARG(QVariant, 10.0)));
        QCoreApplication::processEvents();
        QVERIFY(!pageView->property("activeContent").toString().contains(QStringLiteral("file-widget")));
        QVERIFY(!editorCanvas->property("fileDropFeedback").toString().isEmpty());

        // Unlock vault for stale-target and page-switch tests.
        QVERIFY(controller.unlockVault(QStringLiteral("DroppedFilesPass42!")));

        // 2. Edit target block while import is in flight: stale target must abort insertion.
        QVERIFY(QMetaObject::invokeMethod(editorCanvas, "handleDroppedFileUrls",
                                          Q_ARG(QVariant, QVariant::fromValue(urls)),
                                          Q_ARG(QVariant, 20.0),
                                          Q_ARG(QVariant, 10.0)));
        QVERIFY(QMetaObject::invokeMethod(textEditor, "insert", Q_ARG(int, 0), Q_ARG(QString, QStringLiteral("Changed "))));
        QTRY_VERIFY_WITH_TIMEOUT(
            editorCanvas->property("pendingFileDropRequestId").toString().isEmpty() &&
            editorCanvas->property("pendingFileDropQueue").toList().isEmpty(),
            15000);
        const QString afterStaleContent = pageView->property("activeContent").toString();
        QVERIFY(!afterStaleContent.contains(QStringLiteral("file-widget")));
        QVERIFY(afterStaleContent.contains(QStringLiteral("Changed Original text")));

        // 3. Switch page while import is in flight: pending drop must be canceled.
        QVERIFY(QMetaObject::invokeMethod(editorCanvas, "handleDroppedFileUrls",
                                          Q_ARG(QVariant, QVariant::fromValue(urls)),
                                          Q_ARG(QVariant, 20.0),
                                          Q_ARG(QVariant, 10.0)));
        QVariant selected;
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "selectPage",
                                          Q_RETURN_ARG(QVariant, selected),
                                          Q_ARG(QVariant, QVariant(pageTwoId))));
        QVERIFY(selected.toBool());
        QTRY_VERIFY_WITH_TIMEOUT(!controller.fileOperationRunning(), 15000);
        QCoreApplication::processEvents();
        QVERIFY(!pageView->property("activeContent").toString().contains(QStringLiteral("file-widget")));
        QVERIFY(!controller.getPage(pageOneId).value(QStringLiteral("content")).toString().contains(QStringLiteral("file-widget")));
    }
};

int runNativeNotesDroppedFileTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesDroppedFileTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_dropped_file_test.moc"
