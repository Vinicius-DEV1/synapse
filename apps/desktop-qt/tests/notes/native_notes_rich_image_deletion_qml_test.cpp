#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QBuffer>
#include <QtCore/QScopedPointer>
#include <QtGui/QImage>
#include <QtGui/QTextBlock>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

namespace {

QString imageDataUrl() {
    QImage image(32, 16, QImage::Format_ARGB32);
    image.fill(QColor("#22c55e"));
    QByteArray bytes;
    QBuffer buffer(&bytes);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "PNG")) return {};
    return QStringLiteral("data:image/png;base64,%1").arg(QString::fromLatin1(bytes.toBase64()));
}

}

class NativeNotesRichImageDeletionQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void adjacentImageKeysSelectThenConfirmDeletionAndUndo() {
        NotesTextOperations operations;
        QQmlEngine engine;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/qml/notes/NotesRichTextEditor.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));
        const QString source = QStringLiteral(
            "<p>Before</p><p><img src=\"%1\" width=\"32\" height=\"16\" alt=\"existing.png\"/></p><p>After</p>")
            .arg(imageDataUrl());
        root->setProperty("sourceHtml", source);
        root->setProperty("active", true);

        QQuickWindow window;
        window.resize(800, 360);
        auto *rootItem = qobject_cast<QQuickItem *>(root.data());
        QVERIFY(rootItem);
        rootItem->setWidth(window.width());
        rootItem->setHeight(window.height());
        rootItem->setParentItem(window.contentItem());
        window.show();
        QTRY_VERIFY(window.isVisible());
        QObject *editor = root->findChild<QObject *>("notesRichTextEditor");
        QObject *deleteDialog = root->findChild<QObject *>("notesRichImageDeleteDialog");
        QVERIFY(editor);
        QVERIFY(deleteDialog);
        QTRY_VERIFY(editor->property("visible").toBool());
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            editor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const QVariantMap originalResult = operations.serializeRich(quickDocument);
        QVERIFY(originalResult.value("ok").toBool());
        const QString originalHtml = originalResult.value("html").toString();
        QTextDocument *document = quickDocument->textDocument();
        const QTextBlock imageBlock = document->findBlockByNumber(1);
        const QTextBlock afterBlock = document->findBlockByNumber(2);
        int imagePosition = -1;
        for (auto it = imageBlock.begin(); !it.atEnd(); ++it) {
            const QTextFragment fragment = it.fragment();
            if (fragment.isValid() && fragment.charFormat().isImageFormat())
                imagePosition = fragment.position();
        }
        QVERIFY(imagePosition >= 0);

        editor->setProperty("cursorPosition", afterBlock.position());
        QVERIFY(QMetaObject::invokeMethod(editor, "forceActiveFocus"));
        QTRY_VERIFY(editor->property("activeFocus").toBool());
        QTest::keyClick(&window, Qt::Key_Backspace);
        QCOMPARE(editor->property("selectionStart").toInt(), imagePosition);
        QCOMPARE(editor->property("selectionEnd").toInt(), imagePosition + 1);
        QVERIFY(!deleteDialog->property("visible").toBool());
        QCOMPARE(operations.serializeRich(quickDocument).value("html").toString(), originalHtml);

        QTest::keyClick(&window, Qt::Key_Backspace);
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QCOMPARE(deleteDialog->property("width").toDouble(), 384.0);
        QVERIFY(deleteDialog->property("height").toDouble() > 0);
        QObject *deleteTitle = root->findChild<QObject *>("notesRichImageDeleteTitle");
        QObject *deletePrompt = root->findChild<QObject *>("notesRichImageDeletePrompt");
        QObject *deleteDescription = root->findChild<QObject *>("notesRichImageDeleteDescription");
        QObject *cancelButton = root->findChild<QObject *>("notesRichImageDeleteCancelButton");
        QObject *confirmButton = root->findChild<QObject *>("notesRichImageDeleteConfirmButton");
        QObject *closeButton = root->findChild<QObject *>("notesRichImageDeleteCloseButton");
        QVERIFY(deleteTitle);
        QVERIFY(deletePrompt);
        QVERIFY(deleteDescription);
        QVERIFY(cancelButton);
        QVERIFY(confirmButton);
        QVERIFY(closeButton);
        QCOMPARE(deleteTitle->property("text").toString(), QString("Delete image"));
        QCOMPARE(deletePrompt->property("text").toString(),
                 QString("Do you really want to delete this image?"));
        QCOMPARE(deleteDescription->property("text").toString(),
                 QString("This action will remove the selected image from the document."));
        QCOMPARE(cancelButton->property("text").toString(), QString("Cancel"));
        QCOMPARE(confirmButton->property("text").toString(), QString("Delete"));
        QVERIFY(confirmButton->property("activeFocus").toBool());
        QCOMPARE(operations.serializeRich(quickDocument).value("html").toString(), originalHtml);

        QVERIFY(QMetaObject::invokeMethod(cancelButton, "clicked", Qt::DirectConnection));
        QTRY_VERIFY(!deleteDialog->property("visible").toBool());
        QCOMPARE(operations.serializeRich(quickDocument).value("html").toString(), originalHtml);

        QTest::keyClick(&window, Qt::Key_Backspace);
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QTest::mouseClick(&window, Qt::LeftButton, Qt::NoModifier, QPoint(8, 8));
        QTRY_VERIFY(!deleteDialog->property("visible").toBool());
        QCOMPARE(operations.serializeRich(quickDocument).value("html").toString(), originalHtml);

        QVERIFY(QMetaObject::invokeMethod(editor, "select", Qt::DirectConnection,
                                          Q_ARG(int, imagePosition), Q_ARG(int, imagePosition + 1)));
        auto *textItem = qobject_cast<QQuickItem *>(editor);
        QVERIFY(textItem);
        textItem->forceActiveFocus();
        QTest::keyClick(&window, Qt::Key_Delete);
        QTRY_VERIFY(deleteDialog->property("visible").toBool());
        QTest::keyClick(&window, Qt::Key_Return);
        QTRY_VERIFY(!deleteDialog->property("visible").toBool());
        const QVariantMap removedResult = operations.serializeRich(quickDocument);
        QVERIFY(removedResult.value("ok").toBool());
        const QString removedHtml = removedResult.value("html").toString();
        QVERIFY(!removedHtml.contains("<img"));
        QVERIFY(removedHtml.contains("Before"));
        QVERIFY(removedHtml.contains("After"));
        QVERIFY(QMetaObject::invokeMethod(editor, "undo"));
        QCOMPARE(operations.serializeRich(quickDocument).value("html").toString(), originalHtml);
        QVariant flushed;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "commitEditorText", Q_RETURN_ARG(QVariant, flushed)));
        QVERIFY(flushed.toBool());

        root->setProperty("sourceHtml", "<p>XYZ</p>");
        QTRY_VERIFY(editor->property("text").toString().contains("XYZ"));
        editor->setProperty("cursorPosition", 2);
        QVariant imageKeyHandled;
        QVERIFY(QMetaObject::invokeMethod(root.data(), "handleRichImageDeleteKey", Qt::DirectConnection,
                                          Q_RETURN_ARG(QVariant, imageKeyHandled),
                                          Q_ARG(QVariant, QVariant(Qt::Key_Backspace))));
        QVERIFY(!imageKeyHandled.toBool());
        QString remainingText = document->toPlainText();
        remainingText.remove(QLatin1Char('\n'));
        QCOMPARE(remainingText, QStringLiteral("XYZ"));
        QVERIFY(!deleteDialog->property("visible").toBool());
    }
};

int runNativeNotesRichImageDeletionQmlTest(int argc, char **argv) {
    NativeNotesRichImageDeletionQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_rich_image_deletion_qml_test.moc"
