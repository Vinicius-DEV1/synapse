#include "encrypted_video_stream.h"

#include "mpv_player_item.h"

#include <QtCore/QDebug>
#include <QtCore/QString>
#include <mpv/stream_cb.h>
#include "synapse_bridge.h"

namespace {

struct StreamContext {
    EncryptedVideoReader *reader;
};

int64_t streamSize(void *userData) {
    const auto *context = static_cast<StreamContext *>(userData);
    return synapse_video_reader_size(context->reader);
}

int64_t streamRead(void *userData, char *buffer, size_t bytes) {
    const auto *context = static_cast<StreamContext *>(userData);
    return synapse_video_reader_read(context->reader, reinterpret_cast<uint8_t *>(buffer), bytes);
}

int64_t streamSeek(void *userData, int64_t offset) {
    const auto *context = static_cast<StreamContext *>(userData);
    return synapse_video_reader_seek(context->reader, offset);
}

void streamClose(void *userData) {
    auto *context = static_cast<StreamContext *>(userData);
    synapse_video_reader_close(context->reader);
    delete context;
}

int streamOpen(void *userData, char *uri, mpv_stream_cb_info *info) {
    auto *player = static_cast<MpvPlayerItem *>(userData);
    QString streamUri = QString::fromUtf8(uri);
    if (!streamUri.startsWith(QStringLiteral("synapse-enc://"))) return -1;

    QString token = streamUri.mid(14);
    if (token.endsWith(QStringLiteral(".vtt"), Qt::CaseInsensitive)) token.chop(4);
    EncryptedVideoReader *reader = player ? player->openEncryptedSource(token) : nullptr;
    streamUri.fill(QChar(0));
    token.fill(QChar(0));
    if (!reader) {
        qWarning() << "[EncryptedVideoStream] Unable to open encrypted stream.";
        return -1;
    }

    auto *context = new StreamContext{reader};
    info->cookie = context;
    info->size_fn = streamSize;
    info->read_fn = streamRead;
    info->seek_fn = streamSeek;
    info->close_fn = streamClose;
    return 0;
}

}

bool registerEncryptedVideoStream(mpv_handle *mpv, MpvPlayerItem *player) {
    return mpv && player && mpv_stream_cb_add_ro(mpv, "synapse-enc", player, streamOpen) >= 0;
}
