#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
#include <QtGui/QColor>
#include <QtGui/QImage>
#include <QtCore/QUrl>

class NativeNotesTest final : public QObject {
    Q_OBJECT

private slots:
    void pageCoverCanBeProcessedSavedAndRemoved() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath("page-cover.png");
        QImage source(2400, 600, QImage::Format_RGB32);
        source.fill(QColor("#8b5cf6"));
        QVERIFY(source.save(sourcePath, "PNG"));

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-cover.sqlite")));
        const QString pageId = controller.createSubPage("", "Cover page", "📄");
        QVERIFY(!pageId.isEmpty());
        QVERIFY(controller.getPage(pageId).value("cover_image").toString().isEmpty());

        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.processNotesPageCover(QUrl::fromLocalFile(sourcePath));
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 10000);

        const QVariantMap operation = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(operation.value("success").toBool(), qPrintable(operation.value("error").toString()));
        QCOMPARE(operation.value("operation").toString(), QString("notes-cover-process"));
        const QString coverDataUrl = operation.value("coverImage").toString();
        QVERIFY(coverDataUrl.startsWith("data:image/jpeg;base64,"));
        QImage processedImage;
        QVERIFY(processedImage.loadFromData(QByteArray::fromBase64(coverDataUrl.section(',', 1).toLatin1())));
        QCOMPARE(processedImage.width(), 1280);
        QCOMPARE(processedImage.height(), 320);

        QVERIFY(controller.updatePageCover(pageId, coverDataUrl));
        QCOMPARE(controller.getPage(pageId).value("cover_image").toString(), coverDataUrl);
        QVERIFY(controller.updatePageCover(pageId, ""));
        QVERIFY(controller.getPage(pageId).value("cover_image").toString().isEmpty());

        const QString randomCover = controller.createRandomPageCoverUrl();
        QVERIFY(randomCover.startsWith("https://picsum.photos/seed/"));
        QVERIFY(randomCover.endsWith("/1600/400"));
    }

    void nativeSubPageReorderingAndMovesRejectCycles() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-hierarchy.sqlite")));
        const QString parentId = controller.createSubPage("", "Parent", "📄");
        const QString firstId = controller.createSubPage(parentId, "First", "📄");
        const QString secondId = controller.createSubPage(parentId, "Second", "📄");
        const QString thirdId = controller.createSubPage(parentId, "Third", "📄");
        QVERIFY(!parentId.isEmpty());
        QVERIFY(!firstId.isEmpty());
        QVERIFY(!secondId.isEmpty());
        QVERIFY(!thirdId.isEmpty());

        QVERIFY(controller.reorderSubPages(parentId, {thirdId, secondId, firstId}));
        const auto pageOrder = [&controller](const QString &pageId) {
            const QVariantList pages = controller.getPageTree();
            for (const QVariant &value : pages) {
                const QVariantMap page = value.toMap();
                if (page.value("id").toString() == pageId) return page.value("sort_order").toInt();
            }
            return -1;
        };
        QCOMPARE(pageOrder(thirdId), 0);
        QCOMPARE(pageOrder(secondId), 1);
        QCOMPARE(pageOrder(firstId), 2);
        QVERIFY(!controller.reorderSubPages(parentId, {thirdId, thirdId, firstId}));
        QVERIFY(!controller.reorderSubPages(parentId, {thirdId, secondId}));

        QVERIFY(controller.movePage(firstId, secondId));
        QCOMPARE(controller.getPage(firstId).value("parent_id").toString(), secondId);
        QVERIFY(!controller.movePage(secondId, firstId));
        QVERIFY(!controller.movePage(parentId, firstId));
        QVERIFY(controller.movePage(firstId, parentId));
        QCOMPARE(controller.getPage(firstId).value("parent_id").toString(), parentId);
        QVERIFY(controller.movePage(firstId, ""));
        QVERIFY(controller.getPage(firstId).value("parent_id").toString().isEmpty());
    }

    void richHtmlPagesAndHistoryRoundTrip() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeEditorPassword42!"));

        const QString pageId = controller.createSubPage("", "Rich HTML note", "📄");
        QVERIFY(!pageId.isEmpty());
        const QString firstHtml = "<h1>Heading</h1><p>Saved <strong>HTML</strong> stays HTML.</p>";
        const QString secondHtml = "<p>Newer revision.</p>";
        QVERIFY(controller.updatePageDescription(pageId, "A short page summary."));
        QVERIFY(controller.savePage(pageId, "Rich HTML note", firstHtml, "📄"));

        const QVariantMap loadedPage = controller.getPage(pageId);
        QCOMPARE(loadedPage.value("content").toString(), firstHtml);
        QCOMPARE(loadedPage.value("description").toString(), "A short page summary.");
        QVariantList history = controller.getPageHistory(pageId);
        QCOMPARE(history.size(), 1);
        QCOMPARE(history.first().toMap().value("content").toString(), firstHtml);

        QVERIFY(controller.savePage(pageId, "Rich HTML note", secondHtml, "📄"));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), secondHtml);
        QVERIFY(controller.restorePageRevision(pageId, history.first().toMap().value("id").toString()));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), firstHtml);
        QCOMPARE(controller.getPage(pageId).value("description").toString(), "A short page summary.");

        controller.lockVault();
        const QString lockedContent = controller.getPage(pageId).value("content").toString();
        QVERIFY(lockedContent.contains("Encrypted note"));
        QVERIFY(!lockedContent.contains(firstHtml));
        QVERIFY(controller.unlockVault("NativeEditorPassword42!"));
        QCOMPARE(controller.getPage(pageId).value("content").toString(), firstHtml);
    }

    void deletingPageMovesItsSubtreeAndLinkedEventsToTrash() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-notes-delete.sqlite")));

        const QString rootId = controller.createSubPage("", "Root note", "📄");
        const QString childId = controller.createSubPage(rootId, "Child note", "📄");
        const QString grandchildId = controller.createSubPage(childId, "Grandchild note", "📄");
        QVERIFY(!rootId.isEmpty());
        QVERIFY(!childId.isEmpty());
        QVERIFY(!grandchildId.isEmpty());

        const QString eventInsert = QString(
            "INSERT INTO calendar_events (id, title, page_id, created_at, updated_at) "
            "VALUES ('linked-note-event', 'Linked event', '%1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ).arg(childId);
        QVERIFY(controller.executeSql(eventInsert));

        QVERIFY(controller.deletePage(rootId));
        QVERIFY(controller.getPageTree().isEmpty());
        QVERIFY(controller.getPage(rootId).isEmpty());
        QVERIFY(controller.getPage(childId).isEmpty());
        QVERIFY(controller.getPage(grandchildId).isEmpty());
        QVERIFY(controller.getCalendarEvents().isEmpty());

        const QVariantList trashItems = controller.getTrashItems();
        QCOMPARE(trashItems.size(), 4);
    }
};

int runNativeNotesTest(int argc, char **argv) {
    NativeNotesTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_test.moc"
