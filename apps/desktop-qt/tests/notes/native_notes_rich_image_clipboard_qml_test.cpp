#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextFragment>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

namespace {

QString clipboardPngDataUrl() {
    QImage image(32, 16, QImage::Format_ARGB32);
    image.fill(QColor("#22c55e"));
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) return {};
    return QStringLiteral("data:image/png;base64,%1").arg(QString::fromLatin1(bytes.toBase64()));
}

}

class ClipboardControllerStub final : public QObject {
    Q_OBJECT
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning CONSTANT)
public:
    bool fileOperationRunning() const { return false; }
    Q_INVOKABLE bool hasClipboardNotesRichImage() const { return clipboardImageAvailable; }
    Q_INVOKABLE void processClipboardNotesRichImage() {
        ++pasteRequests;
        const QString dataUrl = clipboardPngDataUrl();
        if (dataUrl.isEmpty()) return;
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

        root->setProperty("sourceHtml", "<p>XYZ</p>");
        QTRY_VERIFY(editor->property("text").toString().contains("XYZ"));
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Qt::DirectConnection,
                                          Q_ARG(int, 1), Q_ARG(int, 2)));
        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 2);
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        const QString selectedTextResult = root->property("sourceHtml").toString();
        QVERIFY(selectedTextResult.startsWith("<p>X</p><img"));
        QVERIFY(selectedTextResult.indexOf("X</p>") < selectedTextResult.indexOf("alt=\"first-clipboard.png\""));
        QVERIFY(selectedTextResult.indexOf("alt=\"second-clipboard.png\"") < selectedTextResult.indexOf("<p>Z</p>"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), QString("<p>XYZ</p>"));

        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier | Qt::ShiftModifier);
        QCOMPARE(controller.pasteRequests, 2);

        root->setProperty("sourceHtml", "<pre><code>let value = 1;</code></pre>");
        QTRY_VERIFY(root->property("codeBlockActive").toBool());
        editor->setProperty("cursorPosition", 5);
        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 2);

        controller.clipboardImageAvailable = false;
        root->setProperty("sourceHtml", "<p>Ordinary paste</p>");
        QTRY_VERIFY(!root->property("codeBlockActive").toBool());
        editor->setProperty("cursorPosition", 0);
        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 2);
    }

    void keyboardPasteAfterSelectedImagePreservesTheImageAndUndo() {
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
        root->setProperty("sourceHtml", QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"existing.png\"/></p><p>After</p>")
            .arg(clipboardPngDataUrl()));
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
        QTRY_VERIFY(editor->property("visible").toBool());
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            editor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const QVariantMap originalResult = operations.serializeRich(quickDocument);
        QVERIFY(originalResult.value("ok").toBool());
        const QString originalHtml = originalResult.value("html").toString();
        int imagePosition = -1;
        QTextDocument *document = quickDocument->textDocument();
        for (QTextBlock block = document->begin(); block.isValid() && imagePosition < 0; block = block.next()) {
            for (auto it = block.begin(); !it.atEnd(); ++it) {
                const QTextFragment fragment = it.fragment();
                if (fragment.isValid() && fragment.charFormat().isImageFormat()) {
                    imagePosition = fragment.position();
                    break;
                }
            }
        }
        QVERIFY(imagePosition >= 0);
        const QVariantMap selectedImage = operations.richImageAt(
            quickDocument, imagePosition, imagePosition, imagePosition + 1);
        QVERIFY(selectedImage.value("valid").toBool());
        QCOMPARE(selectedImage.value("position").toInt(), imagePosition);
        QVERIFY(QMetaObject::invokeMethod(editor, "select", Qt::DirectConnection,
                                          Q_ARG(int, imagePosition), Q_ARG(int, imagePosition + 1)));
        QCOMPARE(editor->property("selectionStart").toInt(), imagePosition);
        QCOMPARE(editor->property("selectionEnd").toInt(), imagePosition + 1);
        auto *textItem = qobject_cast<QQuickItem *>(editor);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTRY_VERIFY(editor->property("activeFocus").toBool());

        QTest::keyClick(&window, Qt::Key_V, Qt::ControlModifier);
        QCOMPARE(controller.pasteRequests, 1);
        QVariant flushed;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        const QString inserted = root->property("sourceHtml").toString();
        QCOMPARE(inserted.count("<img"), 3);
        QVERIFY(inserted.indexOf("alt=\"existing.png\"") < inserted.indexOf("alt=\"first-clipboard.png\""));
        QVERIFY(inserted.indexOf("alt=\"first-clipboard.png\"") < inserted.indexOf("alt=\"second-clipboard.png\""));
        QVERIFY(inserted.indexOf("alt=\"second-clipboard.png\"") < inserted.indexOf("After"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());
        QCOMPARE(root->property("sourceHtml").toString(), originalHtml);
    }
};

int runNativeNotesRichImageClipboardQmlTest(int argc, char **argv) {
    NativeNotesRichImageClipboardQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_clipboard_qml_test.moc"
