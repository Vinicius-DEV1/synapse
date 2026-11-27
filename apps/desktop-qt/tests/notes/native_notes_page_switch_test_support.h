#pragma once

#include <QtQml/qqml.h>
#include <QtQuick/QQuickItem>

class NotesPageSwitchAudioPlayer : public QQuickItem {
    Q_OBJECT
    Q_PROPERTY(QString source READ source WRITE setSource NOTIFY sourceChanged)
    Q_PROPERTY(double position READ position WRITE setPosition NOTIFY positionChanged)
    Q_PROPERTY(double duration READ duration NOTIFY durationChanged)
    Q_PROPERTY(bool paused READ paused WRITE setPaused NOTIFY pausedChanged)
    Q_PROPERTY(bool muted READ muted WRITE setMuted NOTIFY mutedChanged)
    Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY volumeChanged)

public:
    QString source() const { return m_source; }
    double position() const { return m_position; }
    double duration() const { return 0; }
    bool paused() const { return m_paused; }
    bool muted() const { return m_muted; }
    double volume() const { return m_volume; }
    void setSource(const QString &value) { m_source = value; emit sourceChanged(); }
    Q_INVOKABLE void setPosition(double value) { m_position = value; emit positionChanged(); }
    void setPaused(bool value) { m_paused = value; emit pausedChanged(); }
    void setMuted(bool value) { m_muted = value; emit mutedChanged(); }
    void setVolume(double value) { m_volume = value; emit volumeChanged(); }
    Q_INVOKABLE void pause() { setPaused(true); }
    Q_INVOKABLE void play() { setPaused(false); }

signals:
    void sourceChanged();
    void positionChanged();
    void durationChanged();
    void pausedChanged();
    void mutedChanged();
    void volumeChanged();
    void endOfFile();
    void playbackError(const QString &message);

private:
    QString m_source;
    double m_position = 0;
    double m_volume = 100;
    bool m_paused = true;
    bool m_muted = false;
};

inline void registerNotesPageSwitchTestTypes() {
    static const int audioTypeId = qmlRegisterType<NotesPageSwitchAudioPlayer>(
        "Synapse.Media", 1, 0, "MpvPlayerItem");
    static const int videoTypeId = qmlRegisterType<NotesPageSwitchAudioPlayer>(
        "Synapse.Media", 1, 0, "MpvVideoPlayer");
    Q_UNUSED(audioTypeId);
    Q_UNUSED(videoTypeId);
}
