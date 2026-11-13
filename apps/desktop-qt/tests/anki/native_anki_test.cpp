#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeAnkiTest final : public QObject {
    Q_OBJECT

private slots:
    void deckAndCardLifecycleWithTypesAndEditing() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-anki.sqlite")));

        // 1. Create root deck
        QVERIFY(controller.createDeck("Languages", "English vocabulary", "#6366f1"));
        QVariantList decks = controller.getDecks();
        QCOMPARE(decks.size(), 1);
        const QVariantMap deck = decks.first().toMap();
        const QString deckId = deck.value("id").toString();
        QVERIFY(!deckId.isEmpty());
        QCOMPARE(deck.value("name").toString(), QString("Languages"));

        // 2. Create cards with different types, tags, and extra notes
        QVERIFY(controller.createCard(deckId, "to foster", "incentivar, promover", "verbs,advanced", "reading", "Formal context"));
        QVERIFY(controller.createCard(deckId, "Water boils at {{c1::100}} °C", "Boiling point", "science", "cloze", "Standard pressure"));
        QVERIFY(controller.createCard(deckId, "cat", "gato", "animals", "typing", "Domestic pet"));
        QVERIFY(controller.createCard(deckId, "pronunciation prompt", "answer text", "audio", "listening", "Audio exercise"));

        // Invalid inputs
        QVERIFY(!controller.createCard("", "valid front", "valid back"));
        QVERIFY(!controller.createCard(deckId, "   ", "valid back"));

        // 3. Query deck cards and verify persisted attributes
        QVariantList cards = controller.getDeckCards(deckId);
        QCOMPARE(cards.size(), 4);

        const QVariantMap card1 = cards.at(0).toMap();
        const QString card1Id = card1.value("id").toString();
        QCOMPARE(card1.value("front").toString(), QString("to foster"));
        QCOMPARE(card1.value("back").toString(), QString("incentivar, promover"));
        QCOMPARE(card1.value("tags").toString(), QString("verbs,advanced"));
        QCOMPARE(card1.value("card_type").toString(), QString("reading"));
        QCOMPARE(card1.value("extra_note").toString(), QString("Formal context"));
        QCOMPARE(card1.value("reps").toInt(), 0);
        QCOMPARE(card1.value("state").toString(), QString("new"));

        const QVariantMap card2 = cards.at(1).toMap();
        QCOMPARE(card2.value("front").toString(), QString("Water boils at {{c1::100}} °C"));
        QCOMPARE(card2.value("card_type").toString(), QString("cloze"));
        QCOMPARE(card2.value("extra_note").toString(), QString("Standard pressure"));

        const QVariantMap card3 = cards.at(2).toMap();
        QCOMPARE(card3.value("card_type").toString(), QString("typing"));

        const QVariantMap card4 = cards.at(3).toMap();
        QCOMPARE(card4.value("card_type").toString(), QString("listening"));

        // 4. Update card in place
        QVERIFY(controller.updateCard(card1Id, "to foster / encourage", "incentivar, promover, fomentar", "verbs,formal", "reading", "Updated formal note"));
        QVERIFY(!controller.updateCard("", "front", "back"));
        QVERIFY(!controller.updateCard(card1Id, "   ", "back"));

        QVariantList updatedCards = controller.getDeckCards(deckId);
        const QVariantMap updatedCard1 = updatedCards.at(0).toMap();
        QCOMPARE(updatedCard1.value("front").toString(), QString("to foster / encourage"));
        QCOMPARE(updatedCard1.value("back").toString(), QString("incentivar, promover, fomentar"));
        QCOMPARE(updatedCard1.value("tags").toString(), QString("verbs,formal"));
        QCOMPARE(updatedCard1.value("extra_note").toString(), QString("Updated formal note"));

        // 5. Record card review (FSRS calculation)
        QVERIFY(controller.recordCardReview(card1Id, 3));
        QVariantList reviewedCards = controller.getDeckCards(deckId);
        const QVariantMap reviewedCard1 = reviewedCards.at(0).toMap();
        QCOMPARE(reviewedCard1.value("reps").toInt(), 1);
        QVERIFY(!reviewedCard1.value("due_date").toString().isEmpty());

        // 6. Delete card
        QVERIFY(controller.deleteCard(card1Id));
        QVariantList remainingCards = controller.getDeckCards(deckId);
        QCOMPARE(remainingCards.size(), 3);

        // 7. Reset deck progress
        QVERIFY(controller.resetDeckProgress(deckId));
        QVariantList resetCards = controller.getDeckCards(deckId);
        for (const QVariant &c : resetCards) {
            QCOMPARE(c.toMap().value("reps").toInt(), 0);
            QCOMPARE(c.toMap().value("state").toString(), QString("new"));
        }

        // 8. Stats & Hierarchical Decks
        QVariantMap deckStats = controller.getDeckStats(deckId);
        QCOMPARE(deckStats.value("total").toInt(), 3);

        QVariantList hierDecks = controller.getHierarchicalDecks();
        QCOMPARE(hierDecks.size(), 1);
        QCOMPARE(hierDecks.first().toMap().value("card_count").toInt(), 3);

        QVariantMap globalStats = controller.getGlobalAnkiStats();
        QCOMPARE(globalStats.value("total_cards").toInt(), 3);
        QVERIFY(globalStats.value("total_reviews").toInt() >= 1);

        // 9. Delete deck
        QVERIFY(controller.deleteDeck(deckId));
        QCOMPARE(controller.getDecks().size(), 0);
    }
};

int runNativeAnkiTest(int argc, char **argv) {
    NativeAnkiTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_anki_test.moc"
