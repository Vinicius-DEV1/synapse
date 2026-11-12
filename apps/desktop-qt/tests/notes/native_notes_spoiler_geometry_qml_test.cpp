#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextDocument>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesSpoilerGeometryQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void accessibilityOverlayTracksEditorCoordinatesAndResize() {
        QQmlEngine engine;
        NotesTextOperations operations;
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

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        auto *textEditor = qobject_cast<QQuickItem *>(root->findChild<QObject *>("notesRichTextEditor"));
        auto *overlay = qobject_cast<QQuickItem *>(root->findChild<QObject *>("notesRichSpoilerRevealControl"));
        QObject *checkbox = root->findChild<QObject *>("notesRichSpoilerCheckbox");
        QVERIFY(richEditor);
        QVERIFY(textEditor);
        QVERIFY(overlay);
        QVERIFY(checkbox);

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml",
            "<p>Read <span data-type=\"spoiler\" class=\"caderno-spoiler\">secret</span> later</p>");
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(textEditor->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        const int secretPosition = quickDocument->textDocument()->toPlainText().indexOf(QStringLiteral("secret")) + 1;
        QVERIFY(secretPosition > 0);
        textEditor->setProperty("cursorPosition", secretPosition);
        QTRY_VERIFY(checkbox->property("visible").toBool());

        QPointF origin = overlay->mapToItem(textEditor, 0, 0);
        QVERIFY(qAbs(origin.x()) < 0.1);
        QVERIFY(qAbs(origin.y()) < 0.1);
        QVERIFY(qAbs(overlay->width() - textEditor->width()) < 0.1);
        QVERIFY(qAbs(overlay->height() - textEditor->height()) < 0.1);

        rootItem->setWidth(1080);
        rootItem->setHeight(600);
        QTRY_VERIFY(qAbs(overlay->width() - textEditor->width()) < 0.1);
        QTRY_VERIFY(qAbs(overlay->height() - textEditor->height()) < 0.1);
        origin = overlay->mapToItem(textEditor, 0, 0);
        QVERIFY(qAbs(origin.x()) < 0.1);
        QVERIFY(qAbs(origin.y()) < 0.1);
    }
};

int runNativeNotesSpoilerGeometryQmlTest(int argc, char **argv) {
    NativeNotesSpoilerGeometryQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_spoiler_geometry_qml_test.moc"
