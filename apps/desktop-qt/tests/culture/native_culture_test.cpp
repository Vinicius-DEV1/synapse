#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeCultureTest final : public QObject {
    Q_OBJECT

private slots:
    void cultureItemLifecycleAndUpdates() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-culture-lifecycle.sqlite")));

        // Create initial item
        QVERIFY(controller.createCultureItem(
            "Attack on Titan", "anime", "Walls and titans", 24,
            "https://example.com/aot.jpg", "Watch before final season", "https://crunchyroll.com/aot"
        ));

        QVariantList items = controller.getCultureItems("");
        QCOMPARE(items.size(), 1);

        const QVariantMap item = items.first().toMap();
        const QString itemId = item.value("id").toString();
        QCOMPARE(item.value("title").toString(), QString("Attack on Titan"));
        QCOMPARE(item.value("type").toString(), QString("anime"));
        QCOMPARE(item.value("synopsis").toString(), QString("Walls and titans"));
        QCOMPARE(item.value("total_episodes").toInt(), 24);
        QCOMPARE(item.value("progress").toInt(), 0);
        QCOMPARE(item.value("status").toString(), QString("backlog"));
        QCOMPARE(item.value("cover_image").toString(), QString("https://example.com/aot.jpg"));
        QCOMPARE(item.value("goal_note").toString(), QString("Watch before final season"));
        QCOMPARE(item.value("access_link").toString(), QString("https://crunchyroll.com/aot"));

        // Increment progress
        QVERIFY(controller.incrementCultureProgress(itemId));
        items = controller.getCultureItems("");
        QCOMPARE(items.first().toMap().value("progress").toInt(), 1);

        // Update progress directly
        QVERIFY(controller.updateCultureProgress(itemId, 12));
        items = controller.getCultureItems("");
        QCOMPARE(items.first().toMap().value("progress").toInt(), 12);

        // Update status
        QVERIFY(controller.updateCultureStatus(itemId, "watching"));
        items = controller.getCultureItems("watching");
        QCOMPARE(items.size(), 1);
        QCOMPARE(items.first().toMap().value("status").toString(), QString("watching"));

        // Status filter mismatch returns empty
        QCOMPARE(controller.getCultureItems("finished").size(), 0);

        // Set goal
        QVERIFY(controller.setCultureGoal(itemId, true, "Finish before weekend"));
        items = controller.getCultureItems("");
        QCOMPARE(items.first().toMap().value("is_goal").toInt(), 1);
        QCOMPARE(items.first().toMap().value("goal_note").toString(), QString("Finish before weekend"));

        // Update full metadata
        QVERIFY(controller.updateCultureItem(
            itemId, "Shingeki no Kyojin", "anime", "Survey corps battle titans",
            25, "https://example.com/cover2.jpg", "watching", "Finish before weekend", "https://crunchyroll.com/snk"
        ));
        items = controller.getCultureItems("");
        const QVariantMap updated = items.first().toMap();
        QCOMPARE(updated.value("title").toString(), QString("Shingeki no Kyojin"));
        QCOMPARE(updated.value("synopsis").toString(), QString("Survey corps battle titans"));
        QCOMPARE(updated.value("total_episodes").toInt(), 25);
        QCOMPARE(updated.value("access_link").toString(), QString("https://crunchyroll.com/snk"));

        // Soft deletion
        QVERIFY(controller.deleteCultureItem(itemId));
        QCOMPARE(controller.getCultureItems("").size(), 0);
    }

    void episodeManagementAndProgressSync() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-culture-episodes.sqlite")));

        // Create a series with 3 total episodes
        QVERIFY(controller.createCultureItem("Mini Series", "série", "Short story", 3, "", "", ""));
        const QVariantMap item = controller.getCultureItems("").first().toMap();
        const QString itemId = item.value("id").toString();

        // Bulk create episodes
        QVERIFY(controller.bulkCreateEpisodes(itemId, 3));
        QVariantList episodes = controller.getCultureEpisodes(itemId);
        QCOMPARE(episodes.size(), 3);

        const QVariantMap ep1 = episodes.at(0).toMap();
        const QString ep1Id = ep1.value("id").toString();
        QCOMPARE(ep1.value("episode_number").toInt(), 1);
        QCOMPARE(ep1.value("is_watched").toInt(), 0);

        const QString ep2Id = episodes.at(1).toMap().value("id").toString();
        const QString ep3Id = episodes.at(2).toMap().value("id").toString();

        // Toggle episode 1 watched
        QVERIFY(controller.toggleEpisodeWatched(ep1Id, itemId));
        episodes = controller.getCultureEpisodes(itemId);
        QCOMPARE(episodes.at(0).toMap().value("is_watched").toInt(), 1);

        // Verify parent item progress automatically synced to 1
        QVariantMap parentItem = controller.getCultureItems("").first().toMap();
        QCOMPARE(parentItem.value("progress").toInt(), 1);

        // Toggle episode 2 and 3 watched -> reaches 3/3, automatically finishes item
        QVERIFY(controller.toggleEpisodeWatched(ep2Id, itemId));
        QVERIFY(controller.toggleEpisodeWatched(ep3Id, itemId));
        parentItem = controller.getCultureItems("").first().toMap();
        QCOMPARE(parentItem.value("progress").toInt(), 3);
        QCOMPARE(parentItem.value("status").toString(), QString("finished"));

        // Add a 4th custom episode
        QVERIFY(controller.addCultureEpisode(itemId, 4, "OVA Special", "Bonus episode", 1, 4));
        episodes = controller.getCultureEpisodes(itemId);
        QCOMPARE(episodes.size(), 4);
        const QString ep4Id = episodes.at(3).toMap().value("id").toString();
        QCOMPARE(episodes.at(3).toMap().value("title").toString(), QString("OVA Special"));

        // Delete episode 4
        QVERIFY(controller.deleteCultureEpisode(ep4Id));
        episodes = controller.getCultureEpisodes(itemId);
        QCOMPARE(episodes.size(), 3);

        // Delete parent item -> episodes are also cleaned up
        QVERIFY(controller.deleteCultureItem(itemId));
        QCOMPARE(controller.getCultureItems("").size(), 0);
        QCOMPARE(controller.getCultureEpisodes(itemId).size(), 0);
    }
};

int runNativeCultureTest(int argc, char **argv) {
    NativeCultureTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_culture_test.moc"

