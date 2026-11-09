#ifndef MPV_PLAYER_ITEM_H
#define MPV_PLAYER_ITEM_H

#include <QtQuick/QQuickFramebufferObject>
#include <QtCore/QString>
#include <QtCore/QTimer>
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
    Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY volumeChanged)

public:
    explicit MpvPlayerItem(QQuickItem *parent = nullptr);
    ~MpvPlayerItem() override;

    Renderer *createRenderer() const override;

    QString source() const { return m_source; }
    void setSource(const QString &source);

    QString keyHex() const { return m_keyHex; }
    void setKeyHex(const QString &keyHex);

    double position() const { return m_position; }
    void setPosition(double pos);

    double duration() const { return m_duration; }
    bool paused() const { return m_paused; }
    void setPaused(bool paused);

    double volume() const { return m_volume; }
    void setVolume(double volume);

    Q_INVOKABLE void play();
    Q_INVOKABLE void pause();
    Q_INVOKABLE void togglePlay();
    Q_INVOKABLE void seekRelative(double seconds);
    Q_INVOKABLE void setLoopAB(double a, double b);

signals:
    void sourceChanged();
    void keyHexChanged();
    void positionChanged();
    void durationChanged();
    void pausedChanged();
    void volumeChanged();
    void endOfFile();

private slots:
    void onMpvEvents();

private:
    friend class MpvRenderer;

    mpv_handle *m_mpv;
    mpv_render_context *m_mpvGl;
    EncryptedVideoReader *m_activeReader;

    QString m_source;
    QString m_keyHex;
    double m_position;
    double m_duration;
    bool m_paused;
    double m_volume;

    QTimer m_pollTimer;

    static void onMpvWakeup(void *ctx);
    void setupStreamProtocol();
};

#endif // MPV_PLAYER_ITEM_H

