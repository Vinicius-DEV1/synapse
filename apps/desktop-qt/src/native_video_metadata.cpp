#include "native_video_metadata.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QProcess>
#include <QtCore/QStandardPaths>

namespace {

constexpr int NativeTrackProbeTimeoutMs = 30000;
constexpr qsizetype MaximumTrackMetadataBytes = 1024 * 1024;
constexpr int MaximumAudioTracks = 256;

}

QVariantMap inspectNativeVideoTracks(const QString &path) {
    const QString probe = QStandardPaths::findExecutable(QStringLiteral("ffprobe"));
    if (probe.isEmpty()) return {{"success", false}, {"error", "ffprobe is not available."}};

    QProcess process;
    process.start(probe, {QStringLiteral("-v"), QStringLiteral("error"),
                          QStringLiteral("-probesize"), QStringLiteral("10000000"),
                          QStringLiteral("-analyzeduration"), QStringLiteral("10000000"),
                          QStringLiteral("-show_entries"),
                          QStringLiteral("stream=index,codec_name,codec_type:stream_tags=language,title:stream_disposition=default"),
                          QStringLiteral("-of"), QStringLiteral("json"), path});
    if (!process.waitForStarted(5000)) {
        return {{"success", false}, {"error", "ffprobe could not be started."}};
    }
    if (!process.waitForFinished(NativeTrackProbeTimeoutMs)) {
        process.kill();
        process.waitForFinished(5000);
        return {{"success", false}, {"error", "The native video track probe timed out."}};
    }
    const QByteArray output = process.readAllStandardOutput();
    if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0 ||
        output.isEmpty() || output.size() > MaximumTrackMetadataBytes) {
        return {{"success", false}, {"error", "The native video track metadata could not be read."}};
    }

    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(output, &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
        return {{"success", false}, {"error", "ffprobe returned invalid track metadata."}};
    }

    QJsonArray audioTracks;
    const QJsonArray streams = document.object().value(QStringLiteral("streams")).toArray();
    for (const QJsonValue &streamValue : streams) {
        if (!streamValue.isObject() || audioTracks.size() >= MaximumAudioTracks) continue;
        const QJsonObject stream = streamValue.toObject();
        if (stream.value(QStringLiteral("codec_type")).toString() != QStringLiteral("audio")) continue;
        const QJsonObject tags = stream.value(QStringLiteral("tags")).toObject();
        const QJsonObject disposition = stream.value(QStringLiteral("disposition")).toObject();
        const QString language = tags.value(QStringLiteral("language")).toString().left(32);
        const QString title = tags.value(QStringLiteral("title")).toString().trimmed().left(256);
        const QString label = !title.isEmpty() ? title
            : (!language.isEmpty() ? language.toUpper() : QStringLiteral("Audio %1").arg(audioTracks.size() + 1));
        const bool isDefault = disposition.value(QStringLiteral("default")).toInt() == 1;

        QJsonObject track{{QStringLiteral("id"), stream.value(QStringLiteral("index"))},
                          {QStringLiteral("label"), label},
                          {QStringLiteral("lang"), language},
                          {QStringLiteral("codec"), stream.value(QStringLiteral("codec_name")).toString().left(64)},
                          {QStringLiteral("default"), isDefault},
                          {QStringLiteral("selected"), isDefault}};
        audioTracks.append(track);
    }

    const QByteArray serialized = QJsonDocument(audioTracks).toJson(QJsonDocument::Compact);
    return {{"success", true}, {"audioTracksJson", QString::fromUtf8(serialized)}};
}
