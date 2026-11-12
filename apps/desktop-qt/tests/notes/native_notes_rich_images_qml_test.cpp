#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QImage>
#include <QtGui/QTextDocument>

class MockNotesImageController final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    void finish(const QVariantMap &result) { emit fileOperationFinished(result); }

signals:
    void fileOperationFinished(const QVariantMap &result);
};

class NativeNotesRichImagesQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void preparedImageInsertionUsesRichEditorUndoPath() {
        NotesTextOperations operations;
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichImageHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QQuickWindow window;
        window.resize(800, 420);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());

        QObject *imageActions = root->findChild<QObject *>("notesRichImageActions");
        QObject *imageEditor = root->findChild<QObject *>("notesRichImageEditor");
        QVERIFY(imageActions);
        QVERIFY(imageEditor);
        MockNotesImageController controller;
        imageActions->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        imageActions->setProperty("pageId", "page-one");
        imageActions->setProperty("savedStart", 6);
        imageActions->setProperty("savedEnd", 6);
        imageActions->setProperty("savedPageId", "page-one");
        imageActions->setProperty("savedDocumentSource", imageEditor->property("text"));

        QImage image(40, 20, QImage::Format_ARGB32);
        image.fill(QColor("#a78bfa"));
        QByteArray bytes;
        QBuffer buffer(&bytes);
        QVERIFY(buffer.open(QIODevice::WriteOnly));
        QVERIFY(image.save(&buffer, "PNG"));
        const QString dataUrl = QStringLiteral("data:image/png;base64,%1")
            .arg(QString::fromLatin1(bytes.toBase64()));

        QSignalSpy changed(imageActions, SIGNAL(contentModified()));
        QVariantMap payload{{"success", true}, {"operation", "notes-rich-image"},
                            {"imageDataUrl", dataUrl},
                            {"width", 40}, {"height", 20}, {"fileName", "photo.png"}};
        QVariantMap unrelated = payload;
        unrelated.insert("operation", "other-file-operation");
        controller.finish(unrelated);
        QCoreApplication::processEvents();
        QCOMPARE(imageActions->property("errorMessage").toString(), QString());
        QCOMPARE(changed.count(), 0);
        controller.finish(payload);
        QTRY_COMPARE(changed.count(), 1);

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(imageEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        NotesTextOperations serializer;
        const QVariantMap saved = serializer.serializeRich(quickDocument);
        QVERIFY2(saved.value("ok").toBool(), qPrintable(quickDocument->textDocument()->toHtml()));
        QVERIFY(saved.value("html").toString().contains("<img src=\"data:image/png;base64,"));
        QVERIFY(saved.value("html").toString().contains("alt=\"photo.png\""));

        QVERIFY(QMetaObject::invokeMethod(imageEditor, "undo", Qt::DirectConnection));
        const QVariantMap undone = serializer.serializeRich(quickDocument);
        QVERIFY(undone.value("ok").toBool());
        QCOMPARE(undone.value("html").toString(), QString("<p>BeforeAfter</p>"));

        imageActions->setProperty("pageId", "page-two");
        controller.finish(payload);
        QTRY_VERIFY(imageActions->property("errorMessage").toString().contains("note changed"));
        QCOMPARE(changed.count(), 1);
    }
};

int runNativeNotesRichImagesQmlTest(int argc, char **argv) {
    NativeNotesRichImagesQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_images_qml_test.moc"
