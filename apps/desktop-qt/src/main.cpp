#include <QtGui/QGuiApplication>
#include <QtGui/QIcon>
#include <QtQml/QQmlApplicationEngine>
#include <QtQml/QQmlContext>
#include <QtCore/QStandardPaths>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QDebug>
#include <QtCore/QTranslator>
#include <clocale>
#include "mpv_player_item.h"
#include "synapse_controller.h"
#include "controllers/notes/notes_text_operations.h"
#include "synapse_bridge.h"

int main(int argc, char *argv[]) {
    // libmpv requirement: numeric locale must be "C"
    setlocale(LC_NUMERIC, "C");

    // Enable High DPI scaling and GPU antialiasing
    QGuiApplication::setHighDpiScaleFactorRoundingPolicy(
        Qt::HighDpiScaleFactorRoundingPolicy::PassThrough
    );
    
    QGuiApplication app(argc, argv);
    // Qt resets locale in QGuiApplication constructor; re-apply LC_NUMERIC "C" for libmpv
    setlocale(LC_NUMERIC, "C");
    app.setOrganizationName("Synapse");
    app.setApplicationName("Synapse Desktop");
    app.setApplicationVersion("2.0.0");
    app.setDesktopFileName("synapse-desktop");

    QIcon appIcon;
    appIcon.addFile(QStringLiteral(":/icons/32x32.png"));
    appIcon.addFile(QStringLiteral(":/icons/64x64.png"));
    appIcon.addFile(QStringLiteral(":/icons/128x128.png"));
    appIcon.addFile(QStringLiteral(":/icons/128x128@2x.png"));
    appIcon.addFile(QStringLiteral(":/icons/icon.png"));
    app.setWindowIcon(appIcon);

    // Allow isolated native UI checks to use a temporary database without touching user data.
    const QString configuredDatabasePath = qEnvironmentVariable("SYNAPSE_DATABASE_PATH").trimmed();
    SynapseDataController dataController(nullptr, configuredDatabasePath.isEmpty());
    if (!configuredDatabasePath.isEmpty() && !dataController.openDatabase(configuredDatabasePath)) {
        qCritical() << "[Synapse Desktop] Could not open the configured database.";
        return -1;
    }

    // Localization / Translation catalog loading
    QTranslator translator;
    const QString appLang = dataController.getConfig("app_language", "pt_BR");
    QString qmPath = QCoreApplication::applicationDirPath() + "/i18n/synapse_" + appLang + ".qm";
    if (!QFile::exists(qmPath)) {
        qmPath = QDir::current().filePath("apps/desktop-qt/i18n/synapse_" + appLang + ".qm");
    }
    if (QFile::exists(qmPath) && translator.load(qmPath)) {
        app.installTranslator(&translator);
    }

    // Register native C++ QML types
    qmlRegisterType<MpvPlayerItem>("Synapse.Media", 1, 0, "MpvVideoPlayer");
    qmlRegisterType<MpvPlayerItem>("Synapse.Media", 1, 0, "MpvPlayerItem");

    QQmlApplicationEngine engine;
    NotesTextOperations notesTextOperations;
    engine.rootContext()->setContextProperty("dataController", &dataController);
    engine.rootContext()->setContextProperty("notesTextOperations", &notesTextOperations);
    engine.rootContext()->setContextProperty("appVersion", "2.0.0");

    const QUrl url(QStringLiteral("qrc:/qml/main.qml"));
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreated,
        &app,
        [url](QObject *obj, const QUrl &objUrl) {
            if (!obj && url == objUrl) {
                QCoreApplication::exit(-1);
            }
        },
        Qt::QueuedConnection
    );

    // Load from local file during development with robust path resolution
    QString qmlPath = QDir::current().filePath("apps/desktop-qt/qml/main.qml");
    if (!QFile::exists(qmlPath)) {
        qmlPath = QCoreApplication::applicationDirPath() + "/../qml/main.qml";
    }
    if (!QFile::exists(qmlPath)) {
        qmlPath = QCoreApplication::applicationDirPath() + "/qml/main.qml";
    }
    qInfo() << "[Synapse Desktop] Loading the native interface.";
    engine.load(QUrl::fromLocalFile(qmlPath));

    return app.exec();
}

