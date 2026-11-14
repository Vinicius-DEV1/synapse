#ifndef MPV_PLAYER_ITEM_H
#define MPV_PLAYER_ITEM_H

#include <QtQuick/QQuickFramebufferObject>
#include <QtCore/QString>
#include <QtCore/QHash>
#include <QtCore/QMutex>
#include <QtCore/QTimer>
#include <QtCore/QSet>
#include <QtCore/QVariantList>
#include <optional>
#include <mpv/client.h>
#include <mpv/render_gl.h>
#include "synapse_bridge.h"

class MpvRenderer;

class MpvPlayerItem : public QQuickFramebufferObject {
    Q_OBJECT
    Q_PROPERTY(QString source READ source WRITE setSource NOTIFY sourceChanged)
    Q_PROPERTY(QString keyHex READ keyHex WRITE setKeyHex NOTIFY keyHexChanged)
    Q_PROPERTY(double position READ position WRITE setPosition NOTIFY positionChanged)
    Q_PROPERTY(double duration READ duration NOTIFY durationChanged)
    Q_PROPERTY(bool paused READ paused WRITE setPaused NOTIFY pausedChanged)
    Q_PROPERTY(bool muted READ muted WRITE setMuted NOTIFY mutedChanged)
    Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY volumeChanged)
    Q_PROPERTY(QVariantList audioTracks READ audioTracks NOTIFY tracksChanged)
    Q_PROPERTY(QVariantList subtitleTracks READ subtitleTracks NOTIFY tracksChanged)
    Q_PROPERTY(qint64 audioTrackSelectionId READ audioTrackSelectionId NOTIFY audioTrackSelectionChanged)
    Q_PROPERTY(QString currentSubtitle READ currentSubtitle NOTIFY currentSubtitleChanged)
    Q_PROPERTY(bool interactiveSubtitles READ interactiveSubtitles WRITE setInteractiveSubtitles NOTIFY interactiveSubtitlesChanged)

public:
    explicit MpvPlayerItem(QQuickItem *parent = nullptr);
    ~MpvPlayerItem() override;

    Renderer *createRenderer() const override;

    QString source() const { return m_source; }
    void setSource(const QString &source);

    QString keyHex() const { return m_keyHex; }
    void setKeyHex(const QString &keyHex);
    EncryptedVideoReader *openEncryptedSource(const QString &token);

    double position() const { return m_position; }
    void setPosition(double pos);

    double duration() const { return m_duration; }
    bool paused() const { return m_paused; }
    void setPaused(bool paused);
    bool muted() const { return m_muted; }
    void setMuted(bool muted);

    double volume() const { return m_volume; }
    void setVolume(double volume);
    QVariantList audioTracks() const { return m_audioTracks; }
    QVariantList subtitleTracks() const { return m_subtitleTracks; }
    qint64 audioTrackSelectionId() const { return m_audioTrackSelectionId; }
    QString currentSubtitle() const { return m_currentSubtitle; }
    bool interactiveSubtitles() const { return m_interactiveSubtitles; }
    void setInteractiveSubtitles(bool enabled);

    Q_INVOKABLE void play();
    Q_INVOKABLE void pause();
    Q_INVOKABLE void togglePlay();
    Q_INVOKABLE void toggleMute();
    Q_INVOKABLE void seekRelative(double seconds);
    Q_INVOKABLE void setLoopAB(double a, double b);
    Q_INVOKABLE void clearLoopAB();
    Q_INVOKABLE void command(const QVariantList &args);
    Q_INVOKABLE void selectAudioTrack(qint64 id);
    Q_INVOKABLE void selectSubtitleTrack(qint64 id);
    Q_INVOKABLE void cycleAudioTrack();
    Q_INVOKABLE void cycleSubtitleTrack();
    Q_INVOKABLE void adjustSubtitleDelay(double seconds);
    Q_INVOKABLE bool addSubtitleTrack(const QString &sourcePath, const QString &keyHex,
                                     const QString &title, bool select);

signals:
    void sourceChanged();
    void keyHexChanged();
    void positionChanged();
    void durationChanged();
    void pausedChanged();
    void mutedChanged();
    void volumeChanged();
    void tracksChanged();
    void audioTrackSelectionChanged();
    void currentSubtitleChanged();
    void interactiveSubtitlesChanged();
    void endOfFile();
    void playbackError(const QString &message);

private slots:
    void onMpvEvents();

private:
    friend class MpvRenderer;

    mpv_handle *m_mpv;
    mpv_render_context *m_mpvGl;

    QString m_source;
    QString m_keyHex;
    QString m_activeEncryptedToken;
    QHash<QString, QPair<QString, QString>> m_encryptedSources;
    QSet<QString> m_activeSubtitleTokens;
    QMutex m_streamSourcesMutex;
    double m_position;
    double m_duration;
    bool m_paused;
    bool m_muted;
    double m_volume;
    QVariantList m_audioTracks;
    QVariantList m_subtitleTracks;
    qint64 m_audioTrackSelectionId;
    std::optional<qint64> m_subtitleTrackSelectionId;
    QString m_currentSubtitle;
    bool m_interactiveSubtitles{true};

    QTimer m_pollTimer;

    static constexpr uint64_t TrackListObserverId = 1;
    static constexpr uint64_t MuteObserverId = 2;
    static constexpr uint64_t PositionObserverId = 3;
    static constexpr uint64_t DurationObserverId = 4;
    static constexpr uint64_t PauseObserverId = 5;
    static constexpr uint64_t SubTextObserverId = 6;

    static void onMpvWakeup(void *ctx);
    void refreshTrackLists();
    void clearTrackLists();
    void clearSubtitleStreams();
    void clearEncryptedSource(const QString &token);
};

#endif // MPV_PLAYER_ITEM_H

