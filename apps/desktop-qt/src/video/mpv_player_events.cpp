#include "mpv_player_item.h"

#include <QtCore/QDebug>
#include <QtCore/QMetaObject>

void MpvPlayerItem::onMpvWakeup(void *ctx) {
    auto *self = static_cast<MpvPlayerItem *>(ctx);
    QMetaObject::invokeMethod(self, "onMpvEvents", Qt::QueuedConnection);
}

void MpvPlayerItem::onMpvEvents() {
    while (m_mpv) {
        mpv_event *event = mpv_wait_event(m_mpv, 0);
        if (event->event_id == MPV_EVENT_NONE) break;

        if (event->event_id == MPV_EVENT_PROPERTY_CHANGE) {
            const auto *property = static_cast<mpv_event_property *>(event->data);
            if (!property || !property->data) continue;
            if (event->reply_userdata == TrackListObserverId) {
                refreshTrackLists();
            } else if (event->reply_userdata == MuteObserverId &&
                       property->format == MPV_FORMAT_FLAG) {
                const bool muted = *static_cast<const int *>(property->data) != 0;
                if (m_muted != muted) {
                    m_muted = muted;
                    emit mutedChanged();
                }
            } else if (event->reply_userdata == PositionObserverId &&
                       property->format == MPV_FORMAT_DOUBLE) {
                m_position = *static_cast<const double *>(property->data);
                emit positionChanged();
            } else if (event->reply_userdata == DurationObserverId &&
                       property->format == MPV_FORMAT_DOUBLE) {
                m_duration = *static_cast<const double *>(property->data);
                emit durationChanged();
            } else if (event->reply_userdata == PauseObserverId &&
                       property->format == MPV_FORMAT_FLAG) {
                const bool paused = *static_cast<const int *>(property->data) != 0;
                if (m_paused != paused) {
                    m_paused = paused;
                    emit pausedChanged();
                }
            }
        } else if (event->event_id == MPV_EVENT_FILE_LOADED) {
            refreshTrackLists();
        } else if (event->event_id == MPV_EVENT_END_FILE) {
            const auto *endFile = static_cast<const mpv_event_end_file *>(event->data);
            if (endFile && endFile->error < 0) {
                emit playbackError(QStringLiteral("mpv could not decode this video (error %1).")
                                       .arg(endFile->error));
            }
            if (endFile && endFile->reason == MPV_END_FILE_REASON_EOF) emit endOfFile();
        }
    }
}
