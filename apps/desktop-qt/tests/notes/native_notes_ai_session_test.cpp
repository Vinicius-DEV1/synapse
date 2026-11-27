#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtQml/QQmlComponent>
#include <QtQml/QQmlContext>
#include <QtQml/QQmlEngine>
#include <QtTest/QtTest>

class NativeNotesAiSessionTest final : public QObject {
    Q_OBJECT

private:
    static QObject *createHarness(QQmlEngine &engine) {
        QQmlComponent component(&engine);
        component.loadUrl(QUrl::fromLocalFile(QStringLiteral(
            SYNAPSE_DESKTOP_SOURCE_DIR "/tests/notes/qml/NotesBlockAiSessionHarness.qml")));
        QObject *harness = component.create();
        if (!harness) qWarning().noquote() << component.errorString();
        return harness;
    }

private slots:
    void blockAiConversationSurvivesRealDatabaseReopen() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString databasePath = sandbox.filePath(QStringLiteral("notes-ai-session.sqlite"));
        const QVariantList expectedMessages{
            QVariantMap{{QStringLiteral("role"), QStringLiteral("user")},
                        {QStringLiteral("content"), QStringLiteral("Refactor only this code block")}},
            QVariantMap{{QStringLiteral("role"), QStringLiteral("assistant")},
                        {QStringLiteral("content"), QStringLiteral("const answer = 42;")}},
        };

        {
            SynapseDataController controller(nullptr, false);
            QVERIFY(controller.openDatabase(databasePath));
            QQmlEngine engine;
            engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &controller);
            QScopedPointer<QObject> harness(createHarness(engine));
            QVERIFY(harness);

            QVariant storedMessages;
            QVERIFY(QMetaObject::invokeMethod(harness.data(), "saveSession", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, storedMessages)));
            QCOMPARE(storedMessages.toList(), expectedMessages);
            const QString storedConfig = controller.getConfig(QStringLiteral("notes_block_ai_sessions_v1"), QString());
            QVERIFY(storedConfig.contains(QStringLiteral("page-one::code-one")));
            QVERIFY(storedConfig.contains(QStringLiteral("const answer = 42;")));
        }

        {
            SynapseDataController reopenedController(nullptr, false);
            QVERIFY(reopenedController.openDatabase(databasePath));
            QQmlEngine engine;
            engine.rootContext()->setContextProperty(QStringLiteral("dataController"), &reopenedController);
            QScopedPointer<QObject> harness(createHarness(engine));
            QVERIFY(harness);

            QVariant restoredMessages;
            QVERIFY(QMetaObject::invokeMethod(harness.data(), "loadSession", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, restoredMessages)));
            QCOMPARE(restoredMessages.toList(), expectedMessages);

            QVariant clearedMessages;
            QVERIFY(QMetaObject::invokeMethod(harness.data(), "clearSession", Qt::DirectConnection,
                                              Q_RETURN_ARG(QVariant, clearedMessages)));
            QVERIFY(clearedMessages.toList().isEmpty());
            const QString clearedConfig = reopenedController.getConfig(QStringLiteral("notes_block_ai_sessions_v1"), QString());
            QVERIFY(!clearedConfig.contains(QStringLiteral("page-one::code-one")));
        }
    }
};

int runNativeNotesAiSessionTest(int argc, char **argv) {
    NativeNotesAiSessionTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_notes_ai_session_test.moc"
