#include "synapse_controller.h"
#include "controllers/video/video_subtitle_format.h"

#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QTemporaryDir>
#include <QtCore/QUrl>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>

class FakeSubtitleVideoPlayer final : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString source READ source WRITE setSource)
    Q_PROPERTY(QString keyHex READ keyHex WRITE setKeyHex)
    Q_PROPERTY(double position READ position WRITE setPosition)
    Q_PROPERTY(bool paused READ paused WRITE setPaused)

public:
    QString source() const { return m_source; }
    void setSource(const QString &value) { m_source = value; }
    QString keyHex() const { return m_keyHex; }
    void setKeyHex(const QString &value) { m_keyHex = value; }
    double position() const { return m_position; }
    void setPosition(double value) { m_position = value; }
    bool paused() const { return m_paused; }
    void setPaused(bool value) { m_paused = value; }

    Q_INVOKABLE bool addSubtitleTrack(const QString &path, const QString &key,
                                      const QString &label, bool select) {
        m_loadedPaths.append(path);
        m_loadedKeys.append(key);
        m_loadedLabels.append(label);
        m_selectedFlags.append(select);
        return !path.isEmpty();
    }

    QStringList loadedPaths() const { return m_loadedPaths; }
    QStringList loadedKeys() const { return m_loadedKeys; }
    QStringList loadedLabels() const { return m_loadedLabels; }
    QList<bool> selectedFlags() const { return m_selectedFlags; }

private:
    QString m_source;
    QString m_keyHex;
    double m_position = 0;
    bool m_paused = true;
    QStringList m_loadedPaths;
    QStringList m_loadedKeys;
    QStringList m_loadedLabels;
    QList<bool> m_selectedFlags;
};

class NativeVideoSubtitleTest final : public QObject {
    Q_OBJECT

private slots:
    void convertsSrtTimestampsAndKeepsWebVttCues() {
        const QByteArray srt("1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n");
        bool valid = false;
        const QByteArray converted = convertSubtitleToWebVtt(srt, &valid);
        QVERIFY(valid);
        QCOMPARE(converted, QByteArray("WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHello\n"));

        const QByteArray webVtt("WEBVTT\n\n00:00:03.000 --> 00:00:04.000\nExisting\n");
        QCOMPARE(convertSubtitleToWebVtt(webVtt, &valid), webVtt);
        QVERIFY(valid);
        QVERIFY(convertSubtitleToWebVtt(QByteArray("not a subtitle"), &valid).isEmpty());
        QVERIFY(!valid);
    }

    void subtitleImportEncryptsLoadsAndMigratesWithPasswordRemoval() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString videoSourcePath = sandbox.filePath("Lesson.mp4");
        const QString subtitleSourcePath = sandbox.filePath("Lesson.srt");
        const QByteArray videoBytes("video payload");
        const QByteArray subtitleBytes("1\n00:00:01,000 --> 00:00:02,000\nHello, world!\n");

        QFile videoSource(videoSourcePath);
        QVERIFY(videoSource.open(QIODevice::WriteOnly));
        QCOMPARE(videoSource.write(videoBytes), static_cast<qint64>(videoBytes.size()));
        videoSource.close();
        QFile subtitleSource(subtitleSourcePath);
        QVERIFY(subtitleSource.open(QIODevice::WriteOnly));
        QCOMPARE(subtitleSource.write(subtitleBytes), static_cast<qint64>(subtitleBytes.size()));
        subtitleSource.close();

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("subtitle-parity.sqlite")));
        QVERIFY(controller.setupMasterPassword("SubtitlePassword42!"));
        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.importVideo(videoSourcePath);
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap videoImport = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(videoImport.value("success").toBool(), qPrintable(videoImport.value("error").toString()));
        const QString videoId = videoImport.value("id").toString();
        QVERIFY(!videoId.isEmpty());

        FakeSubtitleVideoPlayer player;
        QVariantMap playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY2(playback.value("success").toBool(), qPrintable(playback.value("error").toString()));
        QVERIFY(!playback.value("showResumePrompt").toBool());
        QVERIFY(!player.paused());
        const QString cultureKey = player.keyHex();
        QVERIFY(!cultureKey.isEmpty());

        controller.importVideoSubtitle(&player, videoId, QUrl::fromLocalFile(subtitleSourcePath));
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap subtitleImport = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(subtitleImport.value("success").toBool(), qPrintable(subtitleImport.value("error").toString()));
        QVERIFY(subtitleImport.value("loaded").toBool());
        QCOMPARE(subtitleImport.value("operation").toString(), QString("video-subtitle-import"));
        QCOMPARE(player.loadedLabels().last(), QString("Lesson"));
        QVERIFY(player.selectedFlags().last());

        const QVariantMap updatedVideo = controller.getVideos().first().toMap();
        const QJsonDocument metadata = QJsonDocument::fromJson(
            updatedVideo.value("subtitles_json").toString().toUtf8());
        QVERIFY(metadata.isArray());
        QCOMPARE(metadata.array().size(), 1);
        const QString subtitleTrackId = metadata.array().first().toObject().value("id").toString();
        QVERIFY(!subtitleTrackId.isEmpty());
        const QString storedSubtitlePath = metadata.array().first().toObject().value("local_path").toString();
        QVERIFY(!storedSubtitlePath.isEmpty());
        QVERIFY(controller.renameVideoSubtitle(videoId, subtitleTrackId, "English lesson captions"));
        const QJsonArray renamedTracks = QJsonDocument::fromJson(
            controller.getVideos().first().toMap().value("subtitles_json").toString().toUtf8()).array();
        QCOMPARE(renamedTracks.first().toObject().value("label").toString(), QString("English lesson captions"));
        QVERIFY(!controller.renameVideoSubtitle(videoId, subtitleTrackId, "  "));
        QFile encryptedSubtitle(storedSubtitlePath);
        QVERIFY(encryptedSubtitle.open(QIODevice::ReadOnly));
        QCOMPARE(encryptedSubtitle.read(4), QByteArray("ENC1"));
        encryptedSubtitle.close();

        const QByteArray pathBytes = player.loadedPaths().last().toUtf8();
        const QByteArray keyBytes = player.loadedKeys().last().toUtf8();
        EncryptedVideoReader *reader = synapse_video_reader_open(pathBytes.constData(), keyBytes.constData());
        QVERIFY(reader);
        const int64_t subtitleSize = synapse_video_reader_size(reader);
        QByteArray decryptedSubtitle(static_cast<qsizetype>(subtitleSize), '\0');
        QCOMPARE(synapse_video_reader_read(reader, reinterpret_cast<uint8_t *>(decryptedSubtitle.data()),
                                          static_cast<size_t>(decryptedSubtitle.size())), subtitleSize);
        synapse_video_reader_close(reader);
        const QByteArray expectedVtt(
            "WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHello, world!\n");
        QCOMPARE(decryptedSubtitle, expectedVtt);

        QVERIFY(controller.removeMasterPassword("SubtitlePassword42!"));
        QFile migratedSubtitle(storedSubtitlePath);
        QVERIFY(migratedSubtitle.open(QIODevice::ReadOnly));
        QVERIFY(migratedSubtitle.read(4) != QByteArray("ENC1"));
        migratedSubtitle.seek(0);
        QCOMPARE(migratedSubtitle.readAll(), expectedVtt);
        migratedSubtitle.close();

        playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY2(playback.value("success").toBool(), qPrintable(playback.value("error").toString()));
        QCOMPARE(player.loadedKeys().last(), QString());
        QCOMPARE(player.loadedLabels().last(), QString("English lesson captions"));
        QVERIFY(controller.removeVideoSubtitle(videoId, subtitleTrackId));
        QVERIFY(!QFile::exists(storedSubtitlePath));
        const QJsonDocument removedMetadata = QJsonDocument::fromJson(
            controller.getVideos().first().toMap().value("subtitles_json").toString().toUtf8());
        QVERIFY(removedMetadata.isArray());
        QVERIFY(removedMetadata.array().isEmpty());
        QVERIFY(!controller.removeVideoSubtitle(videoId, subtitleTrackId));
        QVERIFY(controller.deleteVideo(videoId));
        QVERIFY(!QFile::exists(storedSubtitlePath));
    }
};

int runNativeVideoSubtitleTest(int argc, char **argv) {
    NativeVideoSubtitleTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_video_subtitle_test.moc"
