#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesCalloutQmlTest final : public QObject {
    Q_OBJECT

private slots:
    void paletteSignalUpdatesAndResetsTheCallout() {
        QQmlEngine engine;
        NotesTextOperations operations;
        engine.rootContext()->setContextProperty("notesTextOperations", &operations);
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/NotesRichTableHarness.qml")));
        QScopedPointer<QObject> root(component.create());
        QVERIFY2(root, qPrintable(component.errorString()));

        QObject *toolbar = root->findChild<QObject *>("notesFormattingToolbar");
        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *palette = root->findChild<QObject *>("notesCalloutPalette");
        QVERIFY(toolbar);
        QVERIFY(richEditor);
        QVERIFY(palette);

        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", QStringLiteral(
            "<blockquote data-color=\"#3B82F6\" style=\"background-color: #3B82F615 !important; "
            "border-left-color: #3B82F6 !important;\"><p>Quote body</p></blockquote>"));
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        QObject *textEdit = richEditor->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(textEdit);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 2), Q_ARG(int, 2)));
        QCoreApplication::processEvents();
        QVERIFY(toolbar->property("calloutActive").toBool());
        QCOMPARE(toolbar->property("calloutColor").toString(), QStringLiteral("#3b82f6"));
        QVERIFY(palette->property("visible").toBool());
        QCOMPARE(palette->property("colors").toList().size(), 10);

        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(QString, QString("#A855F7"))));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<blockquote data-color=\"#a855f7\"><p>Quote body</p></blockquote>"));
        QCOMPARE(toolbar->property("calloutColor").toString(), QStringLiteral("#a855f7"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<blockquote data-color=\"#3b82f6\"><p>Quote body</p></blockquote>"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "select", Q_ARG(int, 2), Q_ARG(int, 2)));
        QVERIFY(QMetaObject::invokeMethod(palette, "colorSelected", Q_ARG(QString, QString("default"))));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<blockquote><p>Quote body</p></blockquote>"));
    }
};

int runNativeNotesCalloutQmlTest(int argc, char **argv) {
    NativeNotesCalloutQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_callout_qml_test.moc"
