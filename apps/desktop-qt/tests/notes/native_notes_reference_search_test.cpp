#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class NativeNotesReferenceSearchTest final : public QObject {
    Q_OBJECT
private slots:
    void searchMatchesTitlesAndNormalizedBodiesWithoutReturningContent() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-reference-search.sqlite")));
        const QString bodyPageId = controller.createSubPage("", "Body page", "📄");
        const QString titlePageId = controller.createSubPage("", "Signal title", "📄");
        const QString deletedPageId = controller.createSubPage("", "Deleted body", "📄");
        QVERIFY(!bodyPageId.isEmpty());
        QVERIFY(!titlePageId.isEmpty());
        QVERIFY(!deletedPageId.isEmpty());
        QVERIFY(controller.savePage(bodyPageId, "Body page",
                                    "<p>Alpha <strong>signal</strong></p><p>line&nbsp;end</p>", "📄"));
        QVERIFY(controller.savePage(deletedPageId, "Deleted body", "<p>signal line</p>", "📄"));
        QVERIFY(controller.deletePage(deletedPageId));

        QSignalSpy searchSpy(&controller, &SynapseDataController::pageReferenceSearchReady);
        controller.searchPageReferences("  signal   line  ", 41);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 10000);
        const QVariantMap result = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(result.value("success").toBool());
        QCOMPARE(result.value("requestId").toInt(), 41);
        const QVariantList pages = result.value("pages").toList();
        QCOMPARE(pages.size(), 1);
        const QVariantMap page = pages.first().toMap();
        QCOMPARE(page.value("id").toString(), bodyPageId);
        QCOMPARE(page.value("title").toString(), QString("Body page"));
        QVERIFY(!page.contains("content"));
        QVERIFY(!page.contains("encrypted_content"));

        controller.searchPageReferences("signal", 42);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 10000);
        const QVariantMap titleResult = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(titleResult.value("success").toBool());
        const QVariantList titleMatches = titleResult.value("pages").toList();
        QCOMPARE(titleMatches.size(), 2);
        bool foundTitlePage = false;
        bool foundBodyPage = false;
        for (const QVariant &match : titleMatches) {
            const QString matchId = match.toMap().value("id").toString();
            foundTitlePage = foundTitlePage || matchId == titlePageId;
            foundBodyPage = foundBodyPage || matchId == bodyPageId;
        }
        QVERIFY(foundTitlePage);
        QVERIFY(foundBodyPage);
    }

    void encryptedSearchRunsOnlyWhileUnlockedAndLockCancelsPendingWork() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-reference-search-vault.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeReferenceSearchPassword42!"));
        const QString pageId = controller.createSubPage("", "Protected page", "📄");
        QVERIFY(!pageId.isEmpty());
        QVERIFY(controller.savePage(pageId, "Protected page", "<p>private search phrase</p>", "📄"));

        QSignalSpy searchSpy(&controller, &SynapseDataController::pageReferenceSearchReady);
        controller.searchPageReferences("private search", 51);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 10000);
        const QVariantMap unlockedResult = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(unlockedResult.value("success").toBool());
        QCOMPARE(unlockedResult.value("pages").toList().size(), 1);
        QCOMPARE(unlockedResult.value("pages").toList().first().toMap().value("id").toString(), pageId);

        controller.lockVault();
        controller.searchPageReferences("Protected page", 52);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 10000);
        const QVariantMap lockedTitleResult = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(lockedTitleResult.value("success").toBool());
        QCOMPARE(lockedTitleResult.value("pages").toList().size(), 1);

        controller.searchPageReferences("private search", 53);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 10000);
        const QVariantMap lockedBodyResult = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(lockedBodyResult.value("success").toBool());
        QVERIFY(lockedBodyResult.value("pages").toList().isEmpty());
        QVERIFY(lockedBodyResult.value("warning").toString().contains("Unlock", Qt::CaseInsensitive));

        controller.searchPageReferences("phrase that will be cancelled", 54);
        controller.lockVault();
        controller.searchPageReferences("private search", 55);
        QTRY_COMPARE_WITH_TIMEOUT(searchSpy.count(), 1, 1000);
        const QVariantMap lockedResult = searchSpy.takeFirst().at(0).toMap();
        QVERIFY(lockedResult.value("success").toBool());
        QCOMPARE(lockedResult.value("requestId").toInt(), 55);
        QVERIFY(lockedResult.value("warning").toString().contains("Unlock", Qt::CaseInsensitive));
        QCOMPARE(lockedResult.value("pages").toList().size(), 0);
        QTest::qWait(50);
        QCOMPARE(searchSpy.count(), 0);
    }
};

int runNativeNotesReferenceSearchTest(int argc, char **argv) {
    NativeNotesReferenceSearchTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_reference_search_test.moc"
