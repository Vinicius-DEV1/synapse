#include "controllers/notes/notes_rich_code_blocks.h"
#include "controllers/notes/notes_text_operations.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QScopedPointer>
#include <QtCore/QUrl>
#include <QtGui/QTextBlock>
#include <QtQuick/QQuickTextDocument>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesCodeLanguageQmlTest final : public QObject {
    Q_OBJECT

private slots:
    void toolbarSelectionSavesLanguageAndUndoRestoresIt() {
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
        QVERIFY(toolbar);
        QVERIFY(richEditor);
        const QString source = QStringLiteral(
            "<pre><code class=\"language-c++\">int main() {\n    return 0;\n}</code></pre>");
        richEditor->setProperty("active", false);
        richEditor->setProperty("sourceHtml", source);
        richEditor->setProperty("active", true);
        QVariant loaded;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "loadSource", Q_RETURN_ARG(QVariant, loaded)));
        QVERIFY(loaded.toBool());

        QObject *textEdit = richEditor->findChild<QObject *>("notesRichTextEditor");
        QVERIFY(textEdit);
        auto *quickDocument = qobject_cast<QQuickTextDocument *>(
            textEdit->property("textDocument").value<QObject *>());
        QVERIFY(quickDocument);
        QTextBlock codeBlock;
        for (QTextBlock block = quickDocument->textDocument()->begin(); block.isValid(); block = block.next()) {
            if (NotesRichCodeBlocks::isAt(*quickDocument->textDocument(), block.position())) {
                codeBlock = block;
                break;
            }
        }
        QVERIFY(codeBlock.isValid());
        textEdit->setProperty("cursorPosition", codeBlock.position());
        QCoreApplication::processEvents();
        QVERIFY(toolbar->property("codeBlockActive").toBool());
        QCOMPARE(toolbar->property("codeBlockLanguage").toString(), QStringLiteral("c++"));

        QObject *selector = root->findChild<QObject *>("notesCodeLanguageSelector");
        QVERIFY(selector);
        QVERIFY(selector->property("visible").toBool());
        QCOMPARE(selector->property("registeredLanguages").toList().size(), 37);
        const QVariant optionsValue = selector->property("options");
        const QStringList options = optionsValue.toStringList();
        QVERIFY(options.contains(QStringLiteral("auto")));
        QVERIFY(options.contains(QStringLiteral("c++")));
        QVERIFY(options.contains(QStringLiteral("python")));
        const int pythonIndex = options.indexOf(QStringLiteral("python"));
        QVERIFY(pythonIndex >= 0);
        QVERIFY(QMetaObject::invokeMethod(selector, "activated", Q_ARG(int, pythonIndex)));

        QVariant committed;
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), QStringLiteral(
            "<pre><code class=\"language-python\">int main() {\n    return 0;\n}</code></pre>"));

        QVERIFY(QMetaObject::invokeMethod(textEdit, "undo"));
        QVERIFY(QMetaObject::invokeMethod(richEditor, "commitEditorText", Q_RETURN_ARG(QVariant, committed)));
        QVERIFY(committed.toBool());
        QCOMPARE(richEditor->property("sourceHtml").toString(), source);
    }
};

int runNativeNotesCodeLanguageQmlTest(int argc, char **argv) {
    NativeNotesCodeLanguageQmlTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_code_language_qml_test.moc"
