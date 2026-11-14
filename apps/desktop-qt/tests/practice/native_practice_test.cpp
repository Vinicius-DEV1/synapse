#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativePracticeTest final : public QObject {
    Q_OBJECT

private slots:
    void practiceSessionLifecycle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-practice.sqlite");
        QVERIFY(controller.openDatabase(dbPath));

        // Create practice session
        const QString prompt = "Você é um tutor socrático de Rust e C++.";
        const QString sessionId = controller.createPracticeSession("Entrevista Técnica", prompt);
        QVERIFY(!sessionId.isEmpty());

        // Verify session retrieval
        QVariantMap session = controller.getPracticeSession(sessionId);
        QCOMPARE(session.value("id").toString(), sessionId);
        QCOMPARE(session.value("title").toString(), QString("Entrevista Técnica"));
        QCOMPARE(session.value("custom_prompt").toString(), prompt);
        QVERIFY(!session.value("started_at").toString().isEmpty());

        // Verify listing
        QVariantList sessions = controller.getPracticeSessions();
        QCOMPARE(sessions.size(), 1);
        QCOMPARE(sessions.first().toMap().value("id").toString(), sessionId);

        // Delete session (soft delete)
        QVERIFY(controller.deletePracticeSession(sessionId));
        sessions = controller.getPracticeSessions();
        QCOMPARE(sessions.size(), 0);

        session = controller.getPracticeSession(sessionId);
        QVERIFY(session.isEmpty());
    }

    void practiceMessageTranscript() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-practice-messages.sqlite");
        QVERIFY(controller.openDatabase(dbPath));

        const QString sessionId = controller.createPracticeSession("Estudo de Algoritmos");
        QVERIFY(!sessionId.isEmpty());

        // Add user question
        const QString msg1 = controller.createPracticeMessage(sessionId, "user", "Como funciona a busca binária?");
        QVERIFY(!msg1.isEmpty());

        // Add assistant reply
        const QString msg2 = controller.createPracticeMessage(sessionId, "assistant", "A busca binária divide o espaço de busca pela metade a cada passo, operando em tempo O(log n).");
        QVERIFY(!msg2.isEmpty());

        // Add message with default role
        const QString msg3 = controller.createPracticeMessage(sessionId, "", "Qual a complexidade de espaço?");
        QVERIFY(!msg3.isEmpty());

        // Verify transcript order and properties
        const QVariantList messages = controller.getPracticeMessages(sessionId);
        QCOMPARE(messages.size(), 3);

        const QVariantMap m0 = messages[0].toMap();
        QCOMPARE(m0.value("id").toString(), msg1);
        QCOMPARE(m0.value("role").toString(), QString("user"));
        QCOMPARE(m0.value("text_content").toString(), QString("Como funciona a busca binária?"));

        const QVariantMap m1 = messages[1].toMap();
        QCOMPARE(m1.value("id").toString(), msg2);
        QCOMPARE(m1.value("role").toString(), QString("assistant"));
        QVERIFY(m1.value("text_content").toString().contains("O(log n)"));

        const QVariantMap m2 = messages[2].toMap();
        QCOMPARE(m2.value("id").toString(), msg3);
        QCOMPARE(m2.value("role").toString(), QString("user"));
    }

    void practiceMemoryLifecycle() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        const QString dbPath = sandbox.filePath("native-practice-memories.sqlite");
        QVERIFY(controller.openDatabase(dbPath));

        // Create persistent tutor memories
        const QString mem1 = controller.createPracticeMemory("Prefere respostas sucintas com diagramas conceituais", "preferences");
        QVERIFY(!mem1.isEmpty());

        const QString mem2 = controller.createPracticeMemory("Estudando para certificação de arquitetura cloud", "goals");
        QVERIFY(!mem2.isEmpty());

        // Retrieve memories
        QVariantList memories = controller.getPracticeMemories();
        QCOMPARE(memories.size(), 2);

        // Delete one memory
        QVERIFY(controller.deletePracticeMemory(mem1));
        memories = controller.getPracticeMemories();
        QCOMPARE(memories.size(), 1);
        QCOMPARE(memories.first().toMap().value("id").toString(), mem2);
        QCOMPARE(memories.first().toMap().value("category").toString(), QString("goals"));
    }
};

int runNativePracticeTest(int argc, char **argv) {
    NativePracticeTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_practice_test.moc"

