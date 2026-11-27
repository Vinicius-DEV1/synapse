#include "synapse_controller.h"

#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesAiMarkdownTest final : public QObject {
    Q_OBJECT

private:
    static QObject *createHarness(QQmlEngine &engine) {
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/qml/NotesBlockAiMarkdownHarness.qml")));
        QObject *harness = component.create();
        if (!harness) qWarning().noquote() << component.errorString();
        return harness;
    }

    static bool convert(QObject *harness, const char *function, const QString &input, QVariant &output) {
        return QMetaObject::invokeMethod(harness, function, Qt::DirectConnection,
                                         Q_RETURN_ARG(QVariant, output), Q_ARG(QVariant, input));
    }

private slots:
    void searchReplaceUsesCoreExactCrlfAndTrimmedFallbacks() {
        SynapseDataController controller(nullptr, false);

        QVariantMap result = controller.applyNoteSearchReplace(
            QStringLiteral("const old = 1;"),
            QStringLiteral("<<<<<<< SEARCH\nconst old = 1;\n=======\nconst next = 2;\n>>>>>>>"));
        QVERIFY(result.value(QStringLiteral("success")).toBool());
        QCOMPARE(result.value(QStringLiteral("replacedCount")).toInt(), 1);
        QCOMPARE(result.value(QStringLiteral("result")).toString(), QStringLiteral("const next = 2;"));

        result = controller.applyNoteSearchReplace(
            QStringLiteral("first\r\nconst old = 1;\r\nlast"),
            QStringLiteral("<<<<<<< SEARCH\nconst old = 1;\nlast\n=======\nconst next = 2;\nlast\n>>>>>>>"));
        QVERIFY(result.value(QStringLiteral("success")).toBool());
        QCOMPARE(result.value(QStringLiteral("result")).toString(), QStringLiteral("first\nconst next = 2;\nlast"));

        result = controller.applyNoteSearchReplace(
            QStringLiteral("  const value = 1;\n"),
            QStringLiteral("<<<<<<< SEARCH\n const value = 1; \n=======\nconst value = 2;\n>>>>>>>"));
        QVERIFY(result.value(QStringLiteral("success")).toBool());
        QCOMPARE(result.value(QStringLiteral("result")).toString(), QStringLiteral("  const value = 2;\n"));

        result = controller.applyNoteSearchReplace(
            QStringLiteral("const old = 1;"),
            QStringLiteral("<<<<<<< SEARCH\nmissing\n=======\nreplacement\n>>>>>>>"));
        QVERIFY(!result.value(QStringLiteral("success")).toBool());
        QCOMPARE(result.value(QStringLiteral("result")).toString(), QStringLiteral("const old = 1;"));

        result = controller.applyNoteSearchReplace(QStringLiteral("unchanged"), QStringLiteral("No patch"));
        QVERIFY(result.value(QStringLiteral("success")).toBool());
        QCOMPARE(result.value(QStringLiteral("replacedCount")).toInt(), 0);
        QCOMPARE(result.value(QStringLiteral("result")).toString(), QStringLiteral("unchanged"));
    }

    void convertsInlineGfmAndKeepsUnsafeTargetsInactive() {
        QQmlEngine engine;
        QScopedPointer<QObject> harness(createHarness(engine));
        QVERIFY(harness);

        QVariant output;
        QVERIFY(convert(harness.data(), "markdownToHtml",
                        QStringLiteral("Before\ncontinued.\n\nVisit [docs](https://example.test/a?x=1&y=2) and https://example.test/path.\n\n"), output));
        const QString html = output.toString();
        QVERIFY2(html.contains(QStringLiteral("<p>Before continued.</p>")), qPrintable(html));
        QVERIFY(html.contains(QStringLiteral("<a href=\"https://example.test/a?x=1&amp;y=2\">docs</a>")));
        QVERIFY(html.contains(QStringLiteral("<a href=\"https://example.test/path\">https://example.test/path</a>.")));
        QVERIFY(convert(harness.data(), "markdownToHtml",
                        QStringLiteral("www.example.test and student@example.test"), output));
        QVERIFY(output.toString().contains(QStringLiteral("<a href=\"http://www.example.test\">www.example.test</a>")));
        QVERIFY(output.toString().contains(QStringLiteral("<a href=\"mailto:student@example.test\">student@example.test</a>")));

        QVERIFY(convert(harness.data(), "markdownToHtml",
                        QStringLiteral("Use `**literal**` and [**bold docs**](https://example.test)."), output));
        const QString inlineHtml = output.toString();
        QVERIFY(inlineHtml.contains(QStringLiteral("<code>**literal**</code>")));
        QVERIFY(inlineHtml.contains(QStringLiteral("<a href=\"https://example.test\"><strong>bold docs</strong></a>")));

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral("[unsafe](javascript:alert(1)) <script>alert(1)</script>"), output));
        const QString sanitized = output.toString();
        QVERIFY(!sanitized.contains(QStringLiteral("javascript:")));
        QVERIFY(!sanitized.contains(QStringLiteral("<script")));
        QVERIFY(sanitized.contains(QStringLiteral("unsafe")));

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral(
                            "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\">"
                            "<label><input type=\"checkbox\" checked=\"checked\"/><span></span></label>"
                            "<div><p>Raw task</p></div></li></ul>"), output));
        QVERIFY(!output.toString().contains(QStringLiteral("<input")));
        QVERIFY(!output.toString().contains(QStringLiteral("data-type=\"taskList\"")));
    }

    void preservesGfmTablesAndTaskStateThroughCoreSerialization() {
        QQmlEngine engine;
        QScopedPointer<QObject> harness(createHarness(engine));
        QVERIFY(harness);
        QVariant output;

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral("| Name | Value |\n| :--- | ---: |\n| Alpha | **2** |"), output));
        const QString tableHtml = output.toString();
        QVERIFY2(tableHtml.contains(QStringLiteral("<table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>")),
                 qPrintable(tableHtml));
        QVERIFY(tableHtml.contains(QStringLiteral("<td><strong>2</strong></td>")));

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral("- [x] Done **today**\n- [ ] Later"), output));
        const QString taskHtml = output.toString();
        QVERIFY2(taskHtml.contains(QStringLiteral("<ul data-type=\"taskList\">")), qPrintable(taskHtml));
        QVERIFY(taskHtml.contains(QStringLiteral(
            "<li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"/><span></span></label><div><p>Done <strong>today</strong></p></div></li>")));
        QVERIFY(taskHtml.contains(QStringLiteral("data-checked=\"false\" data-type=\"taskItem\"")));
        QVERIFY(!taskHtml.contains(QStringLiteral("disabled")));

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral("- [x] Checked\n- plain bullet\n- [ ] Unchecked"), output));
        const QString mixedListHtml = output.toString();
        QVERIFY(mixedListHtml.contains(QStringLiteral("data-checked=\"true\" data-type=\"taskItem\"")));
        QVERIFY(mixedListHtml.contains(QStringLiteral("<ul><li><p>plain bullet</p></li></ul>")));
        QVERIFY(mixedListHtml.contains(QStringLiteral("data-checked=\"false\" data-type=\"taskItem\"")));
        QVERIFY(!mixedListHtml.contains(QStringLiteral(
            "data-type=\"taskItem\"><label><input type=\"checkbox\"/><span></span></label><div><p>plain bullet")));

        QVERIFY(convert(harness.data(), "richContentHtml",
                        QStringLiteral("1. [x] Numbered item\n\n![Diagram](https://example.test/image.png)"), output));
        const QString unsupportedTaskAndImageHtml = output.toString();
        QVERIFY(unsupportedTaskAndImageHtml.contains(QStringLiteral("<ol><li><p>Numbered item</p></li></ol>")));
        QVERIFY(unsupportedTaskAndImageHtml.contains(QStringLiteral("<p>Diagram</p>")));
        QVERIFY(!unsupportedTaskAndImageHtml.contains(QStringLiteral("<img")));

        SynapseDataController controller(nullptr, false);
        const QVariantList parsedBlocks = controller.parseNoteBlocks(
            QStringLiteral("<blockquote data-color=\"#8b5cf6\">") + tableHtml + taskHtml +
            QStringLiteral("</blockquote>"));
        QCOMPARE(parsedBlocks.size(), 1);
        QCOMPARE(parsedBlocks.first().toMap().value(QStringLiteral("blockType")).toString(),
                 QStringLiteral("blockquote"));
        const QString serializedHtml = controller.serializeNoteBlocks(parsedBlocks);
        QVERIFY2(serializedHtml.contains(QStringLiteral("data-color=\"#8b5cf6\"")), qPrintable(serializedHtml));
        QVERIFY2(serializedHtml.contains(QStringLiteral("<table>")), qPrintable(serializedHtml));
        QVERIFY2(serializedHtml.contains(QStringLiteral("data-checked=\"true\" data-type=\"taskItem\"")),
                 qPrintable(serializedHtml));
        QVERIFY(serializedHtml.contains(QStringLiteral("checked=\"checked\"")));
    }
};

int runNativeNotesAiMarkdownTest(int argc, char **argv) {
    NativeNotesAiMarkdownTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_ai_markdown_test.moc"
