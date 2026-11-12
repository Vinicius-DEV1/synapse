#include "controllers/notes/notes_rich_document.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QGuiApplication>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFrame>
#include <QtGui/QTextTable>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickTextDocument>
#include <QtQuick/QQuickWindow>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

namespace {
QQuickItem *findVisualItem(QQuickItem *parent, const QString &objectName) {
    if (!parent) return nullptr;
    if (parent->objectName() == objectName) return parent;
    for (QQuickItem *child : parent->childItems()) {
        if (QQuickItem *match = findVisualItem(child, objectName)) return match;
    }
    return nullptr;
}
}

class NativeNotesTableMergeQmlTest final : public QObject {
    Q_OBJECT
private slots:
    void toolbarMergesSelectedCellsAndSplitsWithUndo() {
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
        QTRY_VERIFY(window.isVisible());

        QObject *richEditor = root->findChild<QObject *>("richTableEditor");
        QObject *textEdit = root->findChild<QObject *>("notesRichTextEditor");
        QObject *tableActions = root->findChild<QObject *>("notesRichTableEditorActions");
        QVERIFY(richEditor);
        QVERIFY(textEdit);
        QVERIFY(tableActions);
        const QString source = QStringLiteral(
            "<table><tbody><tr><th><p>Header A</p></th><th><p>Header B</p></th></tr>"
            "<tr><td><p>Cell A</p></td><td><p>Cell B</p></td></tr>"
            "<tr><td><p>Cell C</p></td><td><p>Cell D</p></td></tr></tbody></table>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", source);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextTable *table = nullptr;
        for (QTextFrame *frame : quickDocument->textDocument()->rootFrame()->childFrames())
            if (auto *candidate = qobject_cast<QTextTable *>(frame)) table = candidate;
        QVERIFY(table);
        QTextCursor selection(quickDocument->textDocument());
        selection.setPosition(table->cellAt(1, 0).firstCursorPosition().position());
        selection.setPosition(table->cellAt(2, 1).lastCursorPosition().position(), QTextCursor::KeepAnchor);
        QVERIFY(QMetaObject::invokeMethod(textEdit, "select",
                                          Q_ARG(int, selection.selectionStart()),
                                          Q_ARG(int, selection.selectionEnd())));
        QTRY_VERIFY(tableActions->property("canMergeOrSplit").toBool());
        QQuickItem *mergeButton = findVisualItem(rootItem, "notesTableActionMergeOrSplit");
        QVERIFY(mergeButton);
        QVERIFY(mergeButton->property("enabled").toBool());
        QVERIFY(QMetaObject::invokeMethod(mergeButton, "click"));
        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QString html = richEditor->property("sourceHtml").toString();
        QVERIFY2(html.contains("<td colspan=\"2\" rowspan=\"2\">"), qPrintable(html));
        QVERIFY(html.contains("Cell A"));
        QVERIFY(html.contains("Cell B"));
        QVERIFY(html.contains("Cell C"));
        QVERIFY(html.contains("Cell D"));
        QVERIFY(NotesRichDocument::supportsSource(html));

        const int mergedPosition = table->cellAt(1, 0).firstCursorPosition().position();
        textEdit->setProperty("cursorPosition", mergedPosition);
        QTRY_VERIFY(tableActions->property("canMergeOrSplit").toBool());
        QVERIFY(QMetaObject::invokeMethod(mergeButton, "click"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(!html.contains("colspan=") && !html.contains("rowspan="));
        QVERIFY(html.contains("Cell A"));
        QVERIFY(html.contains("Cell D"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        html = richEditor->property("sourceHtml").toString();
        QVERIFY(html.contains("<td colspan=\"2\" rowspan=\"2\">"));
        QVERIFY(NotesRichDocument::supportsSource(html));
    }
};

int runNativeNotesTableMergeQmlTest(int argc, char **argv) {
    NativeNotesTableMergeQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_table_merge_qml_test.moc"
