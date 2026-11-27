#include "controllers/notes/notes_text_operations.h"
#include "synapse_controller.h"
#include "native_notes_page_switch_test_support.h"

#include <QtCore/QElapsedTimer>
#include <QtCore/QSysInfo>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtQuick/QQuickItem>
#include <QtQuick/QQuickWindow>
#include <QtTest/QtTest>

namespace {

QString buildMixedBlocksHtml(int blockCount) {
    QString html;
    html.reserve(blockCount * 140);
    for (int i = 0; i < blockCount; ++i) {
        switch (i % 4) {
        case 0:
            html += QStringLiteral("<p>Paragraph block %1 with <strong>bold</strong> and <em>italic</em> text.</p>").arg(i);
            break;
        case 1:
            html += QStringLiteral("<div class=\"file-widget\" data-type=\"file-widget\" data-file-id=\"file-%1\" data-name=\"doc-%1.pdf\" data-file-type=\"pdf\" data-file-size=\"1024\"></div>").arg(i);
            break;
        case 2:
            html += QStringLiteral("<div class=\"calendar-event-widget\" data-type=\"calendar-event-widget\" data-event-id=\"evt-%1\" data-title=\"Event %1\" data-date=\"2026-12-01T14:00:00Z\"></div>").arg(i);
            break;
        case 3:
            html += QStringLiteral("<div data-type=\"link-preview\" url=\"https://example.com/%1\" title=\"Link %1\"></div>").arg(i);
            break;
        }
    }
    return html;
}

QString buildLargeTableHtml(int rows, int cols) {
    QString html = QStringLiteral("<table><tbody><tr>");
    for (int c = 0; c < cols; ++c) {
        html += QStringLiteral("<th data-col-type=\"%1\"><p>Col %2</p></th>")
            .arg(c == 1 ? QStringLiteral("number") : QStringLiteral("text"))
            .arg(c);
    }
    html += QStringLiteral("</tr>");
    for (int r = 1; r < rows; ++r) {
        html += QStringLiteral("<tr>");
        for (int c = 0; c < cols; ++c) {
            if (c == 1) {
                html += QStringLiteral("<td><p>%1</p></td>").arg(r * 10);
            } else {
                html += QStringLiteral("<td><p>Row %1 Cell %2</p></td>").arg(r).arg(c);
            }
        }
        html += QStringLiteral("</tr>");
    }
    html += QStringLiteral("</tbody></table>");
    return html;
}

QString buildImagesSliceHtml(int imageCount) {
    QString html;
    // 1x1 transparent PNG data URI for repeatable offline image-prep benchmarking.
    const QString dataUri = QStringLiteral(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
    for (int i = 0; i < imageCount; ++i) {
        html += QStringLiteral("<p><img src=\"%1\" alt=\"Image %2\" data-align=\"center\" /></p>").arg(dataUri).arg(i);
    }
    return html;
}

} // namespace

class NativeNotesPerformanceBenchmarkTest final : public QObject {
    Q_OBJECT

private slots:
    void measureBlockParseSerializeSaveAndLoadAcrossScales() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath(QStringLiteral("bench.sqlite"))));

        qInfo().noquote() << QStringLiteral("[NotesBench] Env: Qt=%1, Arch=%2, OS=%3")
                                 .arg(QString::fromLatin1(qVersion()),
                                      QSysInfo::currentCpuArchitecture(),
                                      QSysInfo::prettyProductName());

        const QList<int> scales{100, 500, 1000};
        for (int count : scales) {
            const QString html = buildMixedBlocksHtml(count);
            const QString pageId = controller.createSubPage(QString(), QStringLiteral("Bench %1").arg(count));
            QVERIFY(!pageId.isEmpty());

            QElapsedTimer timer;
            timer.start();
            const QVariantList blocks = controller.parseNoteBlocks(html);
            const qint64 parseMs = timer.elapsed();
            QCOMPARE(blocks.size(), count);

            timer.restart();
            const QString serialized = controller.serializeNoteBlocks(blocks);
            const qint64 serializeMs = timer.elapsed();
            QVERIFY(!serialized.isEmpty());

            timer.restart();
            QVERIFY(controller.savePage(pageId, QStringLiteral("Bench %1").arg(count), serialized, QStringLiteral("📄")));
            const qint64 saveMs = timer.elapsed();

            timer.restart();
            const QVariantMap loaded = controller.getPage(pageId);
            const qint64 loadMs = timer.elapsed();
            QVERIFY(!loaded.value(QStringLiteral("content")).toString().isEmpty());

            qInfo().noquote() << QStringLiteral("[NotesBench] Blocks=%1 | parse=%2ms | serialize=%3ms | savePage=%4ms | getPage=%5ms")
                                     .arg(count).arg(parseMs).arg(serializeMs).arg(saveMs).arg(loadMs);
            QVERIFY(parseMs < 5000);
            QVERIFY(serializeMs < 5000);
            QVERIFY(saveMs < 5000);
            QVERIFY(loadMs < 5000);
        }

        // Large table benchmark (200 rows x 5 cols).
        const QString largeTable = buildLargeTableHtml(200, 5);
        QElapsedTimer tableTimer;
        tableTimer.start();
        const QVariantList cols = controller.parseTableColumnsAt(largeTable, 0);
        const qint64 colParseMs = tableTimer.elapsed();
        QCOMPARE(cols.size(), 5);

        tableTimer.restart();
        const QVariantList validations = controller.validateTableCellsAt(largeTable, 0);
        const qint64 validateMs = tableTimer.elapsed();
        QCOMPARE(validations.size(), 0);

        tableTimer.restart();
        const QVariantMap filtered = controller.filterTableRowsForView(
            largeTable, 0, QStringLiteral("[{\"columnIndex\":1,\"operator\":\"gt\",\"value\":\"1000\"}]"));
        const qint64 filterMs = tableTimer.elapsed();
        QVERIFY(filtered.value(QStringLiteral("visibleRowCount")).toInt() > 0);

        qInfo().noquote() << QStringLiteral("[NotesBench] LargeTable(200x5) | parseCols=%1ms | validate=%2ms | filterView=%3ms")
                                 .arg(colParseMs).arg(validateMs).arg(filterMs);
        QVERIFY(colParseMs < 5000);
        QVERIFY(validateMs < 5000);
        QVERIFY(filterMs < 5000);

        // Rich images + PageView mount benchmark (20 images + 100-block mixed page in QML).
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

        QQmlComponent richComp(&engine);
        richComp.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                            + QStringLiteral("/qml/notes/NotesRichTextEditor.qml")));
        QScopedPointer<QObject> richObj(richComp.create());
        QVERIFY2(richObj, qPrintable(richComp.errorString()));
        const QString imagesHtml = buildImagesSliceHtml(20);
        richObj->setProperty("sourceHtml", imagesHtml);
        richObj->setProperty("active", true);
        QElapsedTimer imgTimer;
        imgTimer.start();
        QVariant imgLoaded;
        QVERIFY(QMetaObject::invokeMethod(richObj.data(), "loadSource", Q_RETURN_ARG(QVariant, imgLoaded)));
        const qint64 imgLoadMs = imgTimer.elapsed();
        QVERIFY(imgLoaded.toBool());
        qInfo().noquote() << QStringLiteral("[NotesBench] RichImages(20) | loadSource=%1ms").arg(imgLoadMs);
        QVERIFY(imgLoadMs < 5000);

        const QString page100Id = controller.createSubPage(QString(), QStringLiteral("QML 100"));
        QVERIFY(controller.savePage(page100Id, QStringLiteral("QML 100"), buildMixedBlocksHtml(100), QStringLiteral("📄")));
        QQmlComponent pvComp(&engine);
        pvComp.loadUrl(QUrl::fromLocalFile(QStringLiteral(SYNAPSE_DESKTOP_SOURCE_DIR)
                                          + QStringLiteral("/qml/page-view/PageView.qml")));
        QScopedPointer<QObject> pageView(pvComp.create());
        QVERIFY2(pageView, qPrintable(pvComp.errorString()));
        pageView->setProperty("controller", QVariant::fromValue(static_cast<QObject *>(&controller)));
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "refreshPageTree"));
        QElapsedTimer pvTimer;
        pvTimer.start();
        pageView->setProperty("selectedPageId", page100Id);
        QVERIFY(QMetaObject::invokeMethod(pageView.data(), "loadActivePage"));
        QCoreApplication::processEvents();
        const qint64 pvLoadMs = pvTimer.elapsed();
        qInfo().noquote() << QStringLiteral("[NotesBench] PageView(100 mixed blocks) | loadActivePage=%1ms").arg(pvLoadMs);
        QVERIFY(pvLoadMs < 10000);
    }
};

int runNativeNotesPerformanceBenchmarkTest(int argc, char **argv) {
    registerNotesPageSwitchTestTypes();
    NativeNotesPerformanceBenchmarkTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_performance_benchmark_test.moc"
