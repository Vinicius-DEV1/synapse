#include <QtGui/QGuiApplication>
#include <QtQml/QQmlApplicationEngine>
#include <QtQml/QQmlContext>
#include <QtCore/QStandardPaths>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QDebug>
#include <clocale>
#include "mpv_player_item.h"
#include "synapse_controller.h"
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

    // Initialize Synapse Data Controller (auto-locates user database)
    SynapseDataController dataController;

    // Register native C++ QML types
    qmlRegisterType<MpvPlayerItem>("Synapse.Media", 1, 0, "MpvVideoPlayer");
    qmlRegisterType<MpvPlayerItem>("Synapse.Media", 1, 0, "MpvPlayerItem");

    QQmlApplicationEngine engine;
    engine.rootContext()->setContextProperty("dataController", &dataController);
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
    qInfo() << "[Synapse Desktop] Loading QML from:" << qmlPath;
    engine.load(QUrl::fromLocalFile(qmlPath));

    return app.exec();
}

