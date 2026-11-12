#include "synapse_controller.h"

#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeNotesLinkVaultTest final : public QObject {
    Q_OBJECT
private slots:
    void linkNoteUpsertPreservesSharedEntityFields() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-link-vault.sqlite")));

        const QString canonicalUrl = QStringLiteral("https://www.youtube.com/watch?v=notes123");
        const QString configKey = QStringLiteral("link_entity:") + canonicalUrl;
        QJsonObject initial = {
            {"canonicalUrl", canonicalUrl}, {"originalUrl", "https://youtu.be/notes123?si=share"},
            {"title", "Saved title"}, {"channel", "Saved channel"}, {"domain", "www.youtube.com"},
            {"notes", "Old note"}, {"color", "#516273"}, {"watched", true}, {"watching", false},
            {"scrapId", "saved-scrap"}, {"aiSummary", "saved summary"},
            {"firstSeenAt", "2026-01-01T00:00:00.000Z"}, {"lastReferencedAt", "2026-01-02T00:00:00.000Z"},
            {"orphanedAt", "2026-01-03T00:00:00.000Z"}, {"extensionField", "preserve me"}};
        QString payload = QString::fromUtf8(QJsonDocument(initial).toJson(QJsonDocument::Compact));
        payload.replace("'", "''");
        const QString insert = QStringLiteral(
            "INSERT INTO config (id, data, value, updated_at) VALUES ('%1', '%2', '%2', CURRENT_TIMESTAMP)")
            .arg(configKey, payload);
        QVERIFY(controller.executeSql(insert));

        const QString notes = QStringLiteral("First line\nSecond <safe> line");
        const QVariantMap updated = controller.setLinkEntityNotes(
            QStringLiteral("https://youtu.be/notes123?si=another-share"), notes);
        QVERIFY(updated.value("success").toBool());

        const QVariantMap saved = controller.getLinkEntity(canonicalUrl);
        QCOMPARE(saved.value("notes").toString(), notes);
        QCOMPARE(saved.value("canonicalUrl").toString(), canonicalUrl);
        QCOMPARE(saved.value("originalUrl").toString(), "https://youtu.be/notes123?si=share");
        QCOMPARE(saved.value("title").toString(), "Saved title");
        QCOMPARE(saved.value("channel").toString(), "Saved channel");
        QCOMPARE(saved.value("color").toString(), "#516273");
        QVERIFY(saved.value("watched").toBool());
        QVERIFY(!saved.value("watching").toBool());
        QCOMPARE(saved.value("scrapId").toString(), "saved-scrap");
        QCOMPARE(saved.value("aiSummary").toString(), "saved summary");
        QCOMPARE(saved.value("extensionField").toString(), "preserve me");
        QCOMPARE(saved.value("firstSeenAt").toString(), "2026-01-01T00:00:00.000Z");
        QVERIFY(saved.value("lastReferencedAt").toString() != "2026-01-02T00:00:00.000Z");
        QVERIFY(saved.value("orphanedAt").isNull());

        QVERIFY(controller.setLinkEntityNotes(canonicalUrl, QString{}).value("success").toBool());
        QVERIFY(controller.getLinkEntity(canonicalUrl).value("notes").toString().isEmpty());
        QVERIFY(!controller.setLinkEntityNotes("javascript:alert(1)", "unsafe")
                     .value("success").toBool());
    }

    void linkColorUpsertValidatesPaletteValuesAndPreservesSharedFields() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("notes-link-color.sqlite")));

        const QString canonicalUrl = QStringLiteral("https://www.youtube.com/watch?v=color123");
        const QString configKey = QStringLiteral("link_entity:") + canonicalUrl;
        QJsonObject initial = {{"canonicalUrl", canonicalUrl}, {"originalUrl", "https://youtu.be/color123"},
                               {"title", "Saved title"}, {"notes", "Saved note"},
                               {"color", "default"}, {"watched", true}, {"watching", false},
                               {"extensionField", "preserve me"}};
        QString payload = QString::fromUtf8(QJsonDocument(initial).toJson(QJsonDocument::Compact));
        payload.replace("'", "''");
        QVERIFY(controller.executeSql(QStringLiteral(
            "INSERT INTO config (id, data, value, updated_at) VALUES ('%1', '%2', '%2', CURRENT_TIMESTAMP)")
            .arg(configKey, payload)));

        const QVariantMap colored = controller.setLinkEntityColor(
            QStringLiteral("https://youtu.be/color123?si=share"), "#3b82f6");
        QVERIFY(colored.value("success").toBool());
        QVariantMap saved = controller.getLinkEntity(canonicalUrl);
        QCOMPARE(saved.value("color").toString(), QString("#3B82F6"));
        QCOMPARE(saved.value("title").toString(), QString("Saved title"));
        QCOMPARE(saved.value("notes").toString(), QString("Saved note"));
        QVERIFY(saved.value("watched").toBool());
        QCOMPARE(saved.value("extensionField").toString(), QString("preserve me"));

        QVERIFY(controller.setLinkEntityColor(canonicalUrl, "default").value("success").toBool());
        QCOMPARE(controller.getLinkEntity(canonicalUrl).value("color").toString(), QString("default"));
        QVERIFY(!controller.setLinkEntityColor(canonicalUrl, "rgba(59,130,246,.2)")
                     .value("success").toBool());
        QVERIFY(!controller.setLinkEntityColor(canonicalUrl, "#abc").value("success").toBool());
        QVERIFY(!controller.setLinkEntityColor("javascript:alert(1)", "#3B82F6")
                     .value("success").toBool());
    }
};

int runNativeNotesLinkVaultTest(int argc, char **argv) {
    NativeNotesLinkVaultTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_link_vault_test.moc"
