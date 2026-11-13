#include "synapse_controller.h"
#include "native_video_metadata.h"
#include "video/mpv_track_parser.h"

#include <QtCore/QCoreApplication>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QProcess>
#include <QtCore/QSettings>
#include <QtCore/QStandardPaths>
#include <QtCore/QTemporaryDir>
#include <QtTest/QSignalSpy>
#include <QtTest/QtTest>
class FakeNativeVideoPlayer final : public QObject {
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

private:
    QString m_source;
    QString m_keyHex;
    double m_position = 0;
    bool m_paused = true;
};

namespace {

mpv_node stringNode(const char *value) {
    mpv_node node{};
    node.format = MPV_FORMAT_STRING;
    node.u.string = const_cast<char *>(value);
    return node;
}

mpv_node integerNode(qint64 value) {
    mpv_node node{};
    node.format = MPV_FORMAT_INT64;
    node.u.int64 = value;
    return node;
}

mpv_node flagNode(bool value) {
    mpv_node node{};
    node.format = MPV_FORMAT_FLAG;
    node.u.flag = value ? 1 : 0;
    return node;
}

}

class NativeVideoTest final : public QObject {
    Q_OBJECT

private slots:
    void nativeVideoAudioTrackMetadataUsesFfprobe() {
        const QString ffmpeg = QStandardPaths::findExecutable(QStringLiteral("ffmpeg"));
        const QString ffprobe = QStandardPaths::findExecutable(QStringLiteral("ffprobe"));
        if (ffmpeg.isEmpty() || ffprobe.isEmpty()) QSKIP("FFmpeg tools are unavailable on this machine.");

        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());
        const QString videoPath = sandbox.filePath("audio-track-fixture.mkv");
        QProcess generator;
        generator.start(ffmpeg, {"-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                                 "color=c=black:s=64x64:d=0.25", "-f", "lavfi", "-i",
                                 "sine=frequency=880:duration=0.25", "-map", "0:v:0", "-map", "1:a:0",
                                 "-c:v", "mpeg4", "-c:a", "aac", "-metadata:s:a:0", "language=eng",
                                 "-metadata:s:a:0", "title=Commentary", "-disposition:a:0", "default",
                                 "-shortest", "-y", videoPath});
        if (!generator.waitForStarted(5000)) QSKIP("The local FFmpeg executable could not start.");
        if (!generator.waitForFinished(20000)) {
            generator.kill();
            generator.waitForFinished(5000);
            QSKIP("The local FFmpeg build cannot create the audio metadata fixture.");
        }
        if (generator.exitStatus() != QProcess::NormalExit || generator.exitCode() != 0) {
            QSKIP("The local FFmpeg build cannot create the audio metadata fixture.");
        }

        const QVariantMap metadata = inspectNativeVideoTracks(videoPath);
        QVERIFY2(metadata.value("success").toBool(), qPrintable(metadata.value("error").toString()));
        const QJsonDocument tracksDocument = QJsonDocument::fromJson(metadata.value("audioTracksJson").toString().toUtf8());
        QVERIFY(tracksDocument.isArray());
        QCOMPARE(tracksDocument.array().size(), 1);
        const QJsonObject track = tracksDocument.array().first().toObject();
        QCOMPARE(track.value("label").toString(), QString("Commentary"));
        QCOMPARE(track.value("lang").toString(), QString("eng"));
        QCOMPARE(track.value("codec").toString(), QString("aac"));
        QVERIFY(track.value("default").toBool());
        QVERIFY(track.value("selected").toBool());
    }

    void videoStorageStatsIncludeLocalVideoAndExternalTracks() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString videoPath = sandbox.filePath("lesson.mp4.enc");
        const QString audioPath = sandbox.filePath("commentary.aac");
        const QString subtitlePath = sandbox.filePath("lesson.vtt");
        const auto writeFile = [](const QString &path, const QByteArray &bytes) {
            QFile file(path);
            if (!file.open(QIODevice::WriteOnly)) return false;
            return file.write(bytes) == bytes.size();
        };
        QVERIFY(writeFile(videoPath, QByteArray(10, 'v')));
        QVERIFY(writeFile(audioPath, QByteArray(5, 'a')));
        QVERIFY(writeFile(subtitlePath, QByteArray(8, 's')));

        const QString audioJson = QString::fromUtf8(QJsonDocument(QJsonArray{
            QJsonObject{{"local_path", audioPath}}
        }).toJson(QJsonDocument::Compact));
        const QString subtitleJson = QString::fromUtf8(QJsonDocument(QJsonArray{
            QJsonObject{{"local_path", subtitlePath}}
        }).toJson(QJsonDocument::Compact));

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("video-storage.sqlite")));
        const QString insertSql = QString(
            "INSERT INTO videos (id, title, original_name, file_path, progress, is_local, "
            "audio_tracks_json, subtitles_json, created_at, updated_at) "
            "VALUES ('storage-test', 'Lesson', 'lesson.mp4', '%1', 0, 1, '%2', '%3', 'now', 'now')")
                .arg(videoPath, audioJson, subtitleJson);
        QVERIFY(controller.executeSql(insertSql));

        const QVariantMap stats = controller.getVideoStorageStats("storage-test");
        QCOMPARE(stats.value("original_path").toString(), videoPath);
        QCOMPARE(stats.value("original_size").toLongLong(), qint64(10));
        QCOMPARE(stats.value("audio_sizes").toMap().value("commentary.aac").toLongLong(), qint64(5));
        QCOMPARE(stats.value("subtitle_sizes").toMap().value("lesson.vtt").toLongLong(), qint64(8));
        QCOMPARE(stats.value("total_local_size").toLongLong(), qint64(23));
        QVERIFY(controller.getVideoStorageStats("missing-video").isEmpty());
    }

    void mpvTrackParserFiltersKindsAndPreservesSelectionMetadata() {
        char *audioKeys[] = {
            const_cast<char *>("id"), const_cast<char *>("type"), const_cast<char *>("title"),
            const_cast<char *>("lang"), const_cast<char *>("selected"), const_cast<char *>("default"),
            const_cast<char *>("external"), const_cast<char *>("codec"), const_cast<char *>("demux-channels"),
            const_cast<char *>("demux-channel-count"), const_cast<char *>("demux-samplerate")
        };
        mpv_node audioValues[] = {
            integerNode(4), stringNode("audio"), stringNode("English commentary"), stringNode("en"),
            flagNode(true), flagNode(false), flagNode(false), stringNode("aac"), stringNode("stereo"),
            integerNode(2), integerNode(48000)
        };
        mpv_node_list audioMapList{11, audioValues, audioKeys};
        mpv_node audioMap{};
        audioMap.format = MPV_FORMAT_NODE_MAP;
        audioMap.u.list = &audioMapList;

        char *subtitleKeys[] = {
            const_cast<char *>("id"), const_cast<char *>("type"), const_cast<char *>("title"),
            const_cast<char *>("lang"), const_cast<char *>("selected"), const_cast<char *>("default"),
            const_cast<char *>("external")
        };
        mpv_node subtitleValues[] = {
            integerNode(7), stringNode("sub"), stringNode("Português"), stringNode("pt"),
            flagNode(false), flagNode(true), flagNode(true)
        };
        mpv_node_list subtitleMapList{7, subtitleValues, subtitleKeys};
        mpv_node subtitleMap{};
        subtitleMap.format = MPV_FORMAT_NODE_MAP;
        subtitleMap.u.list = &subtitleMapList;

        mpv_node trackValues[] = {audioMap, subtitleMap};
        mpv_node_list trackList{2, trackValues, nullptr};
        mpv_node tracks{};
        tracks.format = MPV_FORMAT_NODE_ARRAY;
        tracks.u.list = &trackList;

        const QVariantList audioTracks = parseMpvTrackList(tracks, QStringLiteral("audio"));
        const QVariantList subtitleTracks = parseMpvTrackList(tracks, QStringLiteral("sub"));
        QCOMPARE(audioTracks.size(), 1);
        QCOMPARE(subtitleTracks.size(), 1);
        QCOMPARE(audioTracks.first().toMap().value("id").toLongLong(), qint64(4));
        QCOMPARE(audioTracks.first().toMap().value("title").toString(), QString("English commentary"));
        QCOMPARE(audioTracks.first().toMap().value("codec").toString(), QString("aac"));
        QCOMPARE(audioTracks.first().toMap().value("channels").toString(), QString("stereo"));
        QCOMPARE(audioTracks.first().toMap().value("channel_count").toLongLong(), qint64(2));
        QCOMPARE(audioTracks.first().toMap().value("samplerate").toLongLong(), qint64(48000));
        QVERIFY(audioTracks.first().toMap().value("selected").toBool());
        QVERIFY(!audioTracks.first().toMap().value("external").toBool());
        QCOMPARE(subtitleTracks.first().toMap().value("lang").toString(), QString("pt"));
        QVERIFY(subtitleTracks.first().toMap().value("default").toBool());
        QVERIFY(subtitleTracks.first().toMap().value("external").toBool());
        QVERIFY(parseMpvTrackList(tracks, QStringLiteral("video")).isEmpty());
    }

    void videoGalleryViewModePersistsOnlySupportedValues() {
        QTemporaryDir settingsDirectory;
        QVERIFY(settingsDirectory.isValid());
        QCoreApplication::setOrganizationName("SynapseTests");
        QCoreApplication::setApplicationName("VideoPreferencesTest");
        QSettings::setPath(QSettings::NativeFormat, QSettings::UserScope, settingsDirectory.path());

        SynapseDataController controller(nullptr, false);
        QCOMPARE(controller.getVideoGalleryViewMode(), QString("grid"));
        QVERIFY(controller.setVideoGalleryViewMode("list"));
        QCOMPARE(controller.getVideoGalleryViewMode(), QString("list"));
        QVERIFY(controller.setVideoGalleryViewMode("compact"));
        QCOMPARE(controller.getVideoGalleryViewMode(), QString("compact"));
        QVERIFY(!controller.setVideoGalleryViewMode("masonry"));
        QCOMPARE(controller.getVideoGalleryViewMode(), QString("compact"));
    }

    void videoFoldersPersistRenameDeleteAndMoveVideos() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("video-folders.sqlite")));

        const QVariantMap folder = controller.createVideoFolder("Course A");
        QVERIFY(!folder.value("id").toString().isEmpty());
        QCOMPARE(folder.value("name").toString(), QString("Course A"));
        const QVariantMap duplicateNameFolder = controller.createVideoFolder("course a");
        QVERIFY(!duplicateNameFolder.value("id").toString().isEmpty());
        QVERIFY(duplicateNameFolder.value("id").toString() != folder.value("id").toString());
        QCOMPARE(controller.getVideoFolders().size(), 2);
        QVERIFY(controller.createVideoFolder("  ").isEmpty());

        QVERIFY(controller.executeSql(
            "INSERT INTO videos (id, title, original_name, progress, is_local, created_at, updated_at) "
            "VALUES ('video-folder-test', 'Lesson', 'lesson.mp4', 0, 1, 'now', 'now')"));
        QVERIFY(controller.moveVideoToFolder("video-folder-test", folder.value("id").toString()));
        QCOMPARE(controller.getVideos(folder.value("id").toString()).size(), 1);

        QVERIFY(controller.renameVideoFolder(folder.value("id").toString(), "Course B"));
        const QVariantList renamedVideos = controller.getVideos(folder.value("id").toString());
        QCOMPARE(renamedVideos.size(), 1);
        QCOMPARE(renamedVideos.first().toMap().value("collection_id").toString(), folder.value("id").toString());
        QCOMPARE(controller.getVideoFolders().first().toMap().value("name").toString(), QString("Course B"));

        QVERIFY(controller.deleteVideoFolder(folder.value("id").toString()));
        QCOMPARE(controller.getVideoFolders().size(), 1);
        QCOMPARE(controller.getVideoFolders().first().toMap().value("id").toString(), duplicateNameFolder.value("id").toString());
        QCOMPARE(controller.getVideos(folder.value("id").toString()).size(), 0);
        const QVariantMap rootVideo = controller.getVideos().first().toMap();
        QVERIFY(rootVideo.value("collection_id").isNull() || rootVideo.value("collection_id").toString().isEmpty());
        QVERIFY(rootVideo.value("collection_name").isNull() || rootVideo.value("collection_name").toString().isEmpty());
        QVERIFY(!controller.deleteVideoFolder(folder.value("id").toString()));
        QVERIFY(controller.deleteVideoFolder(duplicateNameFolder.value("id").toString()));
        QVERIFY(controller.getVideoFolders().isEmpty());
    }

    void nativeVideoImportPlaybackAndPasswordRemoval() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        const QString sourcePath = sandbox.filePath("Lecture Sample.mp4");
        const QByteArray sourceBytes("native video import payload");
        QFile sourceFile(sourcePath);
        QVERIFY(sourceFile.open(QIODevice::WriteOnly));
        QCOMPARE(sourceFile.write(sourceBytes), static_cast<qint64>(sourceBytes.size()));
        sourceFile.close();

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-videos.sqlite")));
        QVERIFY(controller.setupMasterPassword("NativeVideoPassword42!"));
        const QVariantMap videoFolder = controller.createVideoFolder("Course A");
        QVERIFY(!videoFolder.value("id").toString().isEmpty());

        QSignalSpy operationSpy(&controller, &SynapseDataController::fileOperationFinished);
        controller.importVideo(sourcePath, "Course A", videoFolder.value("id").toString());
        QTRY_COMPARE_WITH_TIMEOUT(operationSpy.count(), 1, 15000);
        const QVariantMap importResult = operationSpy.takeFirst().at(0).toMap();
        QVERIFY2(importResult.value("success").toBool(), qPrintable(importResult.value("error").toString()));
        QCOMPARE(importResult.value("operation").toString(), QString("video-import"));

        const QVariantList videos = controller.getVideos(videoFolder.value("id").toString());
        QCOMPARE(videos.size(), 1);
        const QVariantMap video = videos.first().toMap();
        QCOMPARE(video.value("title").toString(), QString("Lecture Sample"));
        QCOMPARE(video.value("original_name").toString(), QString("Lecture Sample.mp4"));
        QCOMPARE(video.value("collection_id").toString(), videoFolder.value("id").toString());
        QCOMPARE(video.value("collection_name").toString(), QString("Course A"));
        QVERIFY(video.value("is_local").toBool());

        const QString storedPath = video.value("file_path").toString();
        QFile encryptedVideo(storedPath);
        QVERIFY(encryptedVideo.open(QIODevice::ReadOnly));
        QCOMPARE(encryptedVideo.read(4), QByteArray("ENC1"));
        encryptedVideo.close();

        const QString videoId = video.value("id").toString();
        QVERIFY(controller.executeSql(QString("UPDATE videos SET progress = 12.5 WHERE id = '%1'").arg(videoId)));
        FakeNativeVideoPlayer player;
        QVariantMap playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY2(playback.value("success").toBool(), qPrintable(playback.value("error").toString()));
        QVERIFY(playback.value("showResumePrompt").toBool());
        QCOMPARE(player.source(), QFileInfo(storedPath).canonicalFilePath());
        QVERIFY(!player.keyHex().isEmpty());
        QCOMPARE(player.position(), 12.5);
        QVERIFY(player.paused());

        controller.lockVault();
        playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY(!playback.value("success").toBool());
        QVERIFY(controller.unlockVault("NativeVideoPassword42!"));
        playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY2(playback.value("success").toBool(), qPrintable(playback.value("error").toString()));

        QVERIFY(controller.removeMasterPassword("NativeVideoPassword42!"));
        QFile migratedVideo(storedPath);
        QVERIFY(migratedVideo.open(QIODevice::ReadOnly));
        QVERIFY(migratedVideo.read(4) != QByteArray("ENC1"));
        QCOMPARE(migratedVideo.readAll(), sourceBytes.mid(4));
        migratedVideo.close();

        playback = controller.configureVideoPlayback(&player, videoId);
        QVERIFY2(playback.value("success").toBool(), qPrintable(playback.value("error").toString()));
        QVERIFY(player.keyHex().isEmpty());

        QVERIFY(controller.deleteVideo(videoId));
        QVERIFY(!QFile::exists(storedPath));
        QCOMPARE(controller.getVideos().size(), 0);
    }
};

int runNativeVideoTest(int argc, char **argv) {
    NativeVideoTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_video_test.moc"
