#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtGui/QImage>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class ClipboardControllerStub final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    Q_INVOKABLE bool hasClipboardNotesRichImage() const { return clipboardImageAvailable; }
    Q_INVOKABLE void processClipboardNotesRichImage() {
        ++pasteRequests;
        QImage image(32, 16, QImage::Format_ARGB32);
        image.fill(QColor("#22c55e"));
        QByteArray bytes;
        QBuffer buffer(&bytes);
        if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) return;
        const QString dataUrl = QStringLiteral("data:image/png;base64,%1")
            .arg(QString::fromLatin1(bytes.toBase64()));
        const QVariantList images{
            QVariantMap{{"imageDataUrl", dataUrl}, {"width", 32}, {"height", 16}, {"fileName", "first-clipboard.png"}},
            QVariantMap{{"imageDataUrl", dataUrl}, {"width", 32}, {"height", 16}, {"fileName", "second-clipboard.png"}}
        };
        emit fileOperationFinished({{"success", true}, {"operation", "notes-rich-image"}, {"images", images}});
    }

    bool clipboardImageAvailable = true;
    int pasteRequests = 0;

signals:
    void fileOperationFinished(const QVariantMap &result);
};

class NativeNotesRichImageClipboardQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void keyboardPasteOnlyInterceptsUnmodifiedImagePasteOutsideCode() {
        NotesTextOperations operations;
        ClipboardControllerStub controller;
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesRichTextEditor.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        root->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        root->setProperty("sourceHtml", "<p>Paste image</p>");
        root->setProperty("active", true);

        QQuickWindow window;
        window.resize(800, 360);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());
        QObject *editor = root->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(editor);
        QSignalSpy published(root.data(), SIGNAL(contentModified(QString)));
        QTRY_VERIFY(editor->property("visible").toBool());
        editor->setProperty("cursorPosition", 5);
        QVERIFY(QMetaObject::invokeMethod(editor, "forceActiveFocus"));
        QTRY_VERIFY(editor->property("activeFocus").toBool());

        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 1);
        QVariant flushed;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        const QString inserted = root->property("sourceHtml").toString();
        QCOMPARE(inserted.count("<img"), 2);
        QVERIFY(inserted.indexOf("alt=\"first-clipboard.png\"") <
                inserted.indexOf("alt=\"second-clipboard.png\""));
        QCOMPARE(published.count(), 1);
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>Paste image</p>"));
        QCOMPARE(published.count(), 2);

        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier | Qt::ShiftModifier);
        QCOMPARE(controller.pasteRequests, 1);

        root->setProperty("sourceHtml", "<pre><code>let value = 1;</code></pre>");
        QTRY_VERIFY(root->property("codeBlockActive").toBool());
        editor->setProperty("cursorPosition", 5);
        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 1);

        controller.clipboardImageAvailable = false;
        root->setProperty("sourceHtml", "<p>Ordinary paste</p>");
        QTRY_VERIFY(!root->property("codeBlockActive").toBool());
        editor->setProperty("cursorPosition", 0);
        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 1);
    }
};

int runNativeNotesRichImageClipboardQmlTest(int argc, char **argv) {
    NativeNotesRichImageClipboardQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_clipboard_qml_test.moc"
