#include "mpv_player_item.h"
#include "mpv_track_parser.h"

#include <QtCore/QDebug>
#include <QtCore/QMutexLocker>
#include <QtCore/QtMath>
#include <QtCore/QUuid>

void MpvPlayerItem::refreshTrackLists() {
    if (!m_mpv) return;
    mpv_node tracks{};
    if (mpv_get_property(m_mpv, "track-list", MPV_FORMAT_NODE, &tracks) < 0) return;

    const QVariantList audio = parseMpvTrackList(tracks, QStringLiteral("audio"));
    const QVariantList subtitles = parseMpvTrackList(tracks, QStringLiteral("sub"));
    mpv_free_node_contents(&tracks);

    if (audio != m_audioTracks || subtitles != m_subtitleTracks) {
        m_audioTracks = audio;
        m_subtitleTracks = subtitles;
        emit tracksChanged();
    }
}

void MpvPlayerItem::clearTrackLists() {
    const bool hasTracks = !m_audioTracks.isEmpty() || !m_subtitleTracks.isEmpty();
    const bool selectionChanged = m_audioTrackSelectionId != -1;
    m_audioTracks.clear();
    m_subtitleTracks.clear();
    m_audioTrackSelectionId = -1;
    m_subtitleTrackSelectionId.reset();
    clearSubtitleStreams();
    clearLoopAB();
    if (hasTracks) emit tracksChanged();
    if (selectionChanged) emit audioTrackSelectionChanged();
}

void MpvPlayerItem::clearSubtitleStreams() {
    const QSet<QString> tokens = m_activeSubtitleTokens;
    m_activeSubtitleTokens.clear();
    for (const QString &token : tokens) clearEncryptedSource(token);
}

bool MpvPlayerItem::addSubtitleTrack(const QString &sourcePath, const QString &keyHex,
                                     const QString &title, bool select) {
    if (!m_mpv || sourcePath.isEmpty()) return false;

    QString subtitleUri = sourcePath;
    QString token;
    if (!keyHex.isEmpty()) {
        token = QUuid::createUuid().toString(QUuid::WithoutBraces);
        QString secureKey = keyHex;
        {
            QMutexLocker locker(&m_streamSourcesMutex);
            m_encryptedSources.insert(token, qMakePair(sourcePath, secureKey));
        }
        secureKey.fill(QChar(0));
        m_activeSubtitleTokens.insert(token);
        subtitleUri = QStringLiteral("synapse-enc://%1.vtt").arg(token);
    }

    const QByteArray uriBytes = subtitleUri.toUtf8();
    const QByteArray titleBytes = title.toUtf8();
    const char *mode = select ? "select" : "auto";
    const char *cmd[] = {"sub-add", uriBytes.constData(), mode, titleBytes.constData(), nullptr};
    const int result = mpv_command_async(m_mpv, 0, cmd);
    if (result < 0) {
        if (!token.isEmpty()) {
            m_activeSubtitleTokens.remove(token);
            clearEncryptedSource(token);
        }
        qWarning() << "[MpvPlayerItem] Could not load subtitle track:" << mpv_error_string(result);
        return false;
    }

    subtitleUri.fill(QChar(0));
    return true;
}

void MpvPlayerItem::selectAudioTrack(qint64 id) {
    if (!m_mpv) return;
    const qint64 selectionId = id < 0 ? -1 : id;
    const QByteArray value = selectionId < 0 ? QByteArrayLiteral("auto") : QByteArray::number(selectionId);
    const int result = mpv_set_property_string(m_mpv, "aid", value.constData());
    if (result < 0) {
        qWarning() << "[MpvPlayerItem] Audio track selection failed:" << mpv_error_string(result);
        return;
    }
    if (m_audioTrackSelectionId != selectionId) {
        m_audioTrackSelectionId = selectionId;
        emit audioTrackSelectionChanged();
    }
}

void MpvPlayerItem::setMuted(bool muted) {
    if (!m_mpv || m_muted == muted) return;
    int flag = muted ? 1 : 0;
    const int result = mpv_set_property_async(m_mpv, 0, "mute", MPV_FORMAT_FLAG, &flag);
    if (result < 0) {
        qWarning() << "[MpvPlayerItem] Mute state could not be changed:" << mpv_error_string(result);
        return;
    }
    m_muted = muted;
    emit mutedChanged();
}

void MpvPlayerItem::toggleMute() {
    setMuted(!m_muted);
}

void MpvPlayerItem::selectSubtitleTrack(qint64 id) {
    if (!m_mpv) return;
    const QByteArray value = id < 0 ? QByteArrayLiteral("no") : QByteArray::number(id);
    const int result = mpv_set_property_string(m_mpv, "sid", value.constData());
    if (result < 0) {
        qWarning() << "[MpvPlayerItem] Subtitle track selection failed:" << mpv_error_string(result);
        return;
    }
    m_subtitleTrackSelectionId = id < 0 ? -1 : id;
}

void MpvPlayerItem::cycleAudioTrack() {
    if (m_audioTracks.isEmpty()) return;
    int selected = -1;
    if (m_audioTrackSelectionId >= 0) {
        for (int i = 0; i < m_audioTracks.size(); ++i) {
            if (m_audioTracks.at(i).toMap().value(QStringLiteral("id")).toLongLong() == m_audioTrackSelectionId) {
                selected = i;
                break;
            }
        }
    } else {
        for (int i = 0; i < m_audioTracks.size(); ++i) {
            if (m_audioTracks.at(i).toMap().value(QStringLiteral("selected")).toBool()) {
                selected = i;
                break;
            }
        }
    }
    const int next = selected + 1;
    if (next >= m_audioTracks.size()) {
        selectAudioTrack(-1);
        return;
    }
    selectAudioTrack(m_audioTracks.at(next).toMap().value(QStringLiteral("id")).toLongLong());
}

void MpvPlayerItem::cycleSubtitleTrack() {
    if (m_subtitleTracks.isEmpty()) return;
    int selected = -1;
    if (m_subtitleTrackSelectionId.has_value() && *m_subtitleTrackSelectionId >= 0) {
        for (int i = 0; i < m_subtitleTracks.size(); ++i) {
            if (m_subtitleTracks.at(i).toMap().value(QStringLiteral("id")).toLongLong() ==
                *m_subtitleTrackSelectionId) {
                selected = i;
                break;
            }
        }
    } else if (!m_subtitleTrackSelectionId.has_value()) {
        for (int i = 0; i < m_subtitleTracks.size(); ++i) {
            if (m_subtitleTracks.at(i).toMap().value(QStringLiteral("selected")).toBool()) {
                selected = i;
                break;
            }
        }
    }
    const int next = selected + 1;
    if (next >= m_subtitleTracks.size()) {
        selectSubtitleTrack(-1);
        return;
    }
    selectSubtitleTrack(m_subtitleTracks.at(next).toMap().value(QStringLiteral("id")).toLongLong());
}

void MpvPlayerItem::adjustSubtitleDelay(double seconds) {
    if (!m_mpv || !qIsFinite(seconds)) return;
    const QByteArray amount = QByteArray::number(seconds, 'f', 3);
    const char *cmd[] = {"add", "sub-delay", amount.constData(), nullptr};
    mpv_command_async(m_mpv, 0, cmd);
}

void MpvPlayerItem::setLoopAB(double a, double b) {
    if (!m_mpv || !qIsFinite(a) || !qIsFinite(b) || a < 0.0 || b <= a) return;
    const QByteArray start = QByteArray::number(a, 'f', 3);
    const QByteArray end = QByteArray::number(b, 'f', 3);
    const int startResult = mpv_set_property_string(m_mpv, "ab-loop-a", start.constData());
    const int endResult = mpv_set_property_string(m_mpv, "ab-loop-b", end.constData());
    if (startResult < 0 || endResult < 0) {
        qWarning() << "[MpvPlayerItem] A-B loop could not be applied."
                   << mpv_error_string(startResult < 0 ? startResult : endResult);
    }
}

void MpvPlayerItem::clearLoopAB() {
    if (!m_mpv) return;
    const int startResult = mpv_set_property_string(m_mpv, "ab-loop-a", "no");
    const int endResult = mpv_set_property_string(m_mpv, "ab-loop-b", "no");
    if (startResult < 0 || endResult < 0) {
        qWarning() << "[MpvPlayerItem] A-B loop could not be cleared."
                   << mpv_error_string(startResult < 0 ? startResult : endResult);
    }
}
