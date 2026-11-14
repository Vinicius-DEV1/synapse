#include "mpv_player_item.h"
#include "video/encrypted_video_stream.h"
#include <QtOpenGL/QOpenGLFramebufferObject>
#include <QtGui/QOpenGLContext>
#include <QtCore/QDebug>
#include <QtCore/QUuid>
#include <QtCore/QMutexLocker>
#include <clocale>

static mpv_handle* create_mpv_instance() {
    setlocale(LC_NUMERIC, "C");
    return mpv_create();
}

class MpvRenderer : public QQuickFramebufferObject::Renderer {
public:
    explicit MpvRenderer(const MpvPlayerItem *item) : m_item(item) {
        mpv_opengl_init_params gl_init_params{
            [](void *, const char *name) -> void * {
                QOpenGLContext *glctx = QOpenGLContext::currentContext();
                if (!glctx) return nullptr;
                return reinterpret_cast<void *>(glctx->getProcAddress(name));
            },
            nullptr
        };

        mpv_render_param params[]{
            {MPV_RENDER_PARAM_API_TYPE, const_cast<char *>(MPV_RENDER_API_TYPE_OPENGL)},
            {MPV_RENDER_PARAM_OPENGL_INIT_PARAMS, &gl_init_params},
            {MPV_RENDER_PARAM_INVALID, nullptr}
        };

        if (mpv_render_context_create(&const_cast<MpvPlayerItem *>(m_item)->m_mpvGl, m_item->m_mpv, params) < 0) {
            qWarning() << "[MpvRenderer] Failed to initialize mpv OpenGL context!";
        } else {
            mpv_render_context_set_update_callback(m_item->m_mpvGl, [](void *ctx) {
                QMetaObject::invokeMethod(static_cast<MpvPlayerItem *>(ctx), "update", Qt::QueuedConnection);
            }, const_cast<MpvPlayerItem *>(m_item));
        }
    }

    ~MpvRenderer() override {
        if (m_item->m_mpvGl) {
            mpv_render_context_free(m_item->m_mpvGl);
        }
    }

    void render() override {
        if (!m_item->m_mpvGl) return;

        QOpenGLFramebufferObject *fbo = framebufferObject();
        mpv_opengl_fbo mpv_fbo{
            static_cast<int>(fbo->handle()),
            fbo->width(),
            fbo->height(),
            0
        };

        int flip_y = 0;
        mpv_render_param params[]{
            {MPV_RENDER_PARAM_OPENGL_FBO, &mpv_fbo},
            {MPV_RENDER_PARAM_FLIP_Y, &flip_y},
            {MPV_RENDER_PARAM_INVALID, nullptr}
        };

        mpv_render_context_render(m_item->m_mpvGl, params);
    }

    QOpenGLFramebufferObject *createFramebufferObject(const QSize &size) override {
        return QQuickFramebufferObject::Renderer::createFramebufferObject(size);
    }

private:
    const MpvPlayerItem *m_item;
};

// MpvPlayerItem Implementation
// ---------------------------------------------------------------------------

MpvPlayerItem::MpvPlayerItem(QQuickItem *parent)
    : QQuickFramebufferObject(parent),
      m_mpv(create_mpv_instance()),
      m_mpvGl(nullptr),
      m_position(0),
      m_duration(0),
      m_paused(false),
      m_muted(false),
      m_volume(100),
      m_audioTrackSelectionId(-1) {

    if (!m_mpv) {
        qFatal("[MpvPlayerItem] Cannot create mpv instance");
    }

    // Enable hardware acceleration directly on the GPU (VA-API on Linux / DXVA2/D3D11VA on Windows)
    mpv_set_option_string(m_mpv, "hwdec", "auto-safe");
    mpv_set_option_string(m_mpv, "vo", "libmpv");
    mpv_set_option_string(m_mpv, "keep-open", "yes");
    mpv_set_option_string(m_mpv, "sub-margin-y", "100");
    mpv_set_option_string(m_mpv, "sub-font-size", "40");
    mpv_set_option_string(m_mpv, "sub-visibility", "no");

    if (!registerEncryptedVideoStream(m_mpv, this)) {
        qFatal("[MpvPlayerItem] Cannot register encrypted video stream protocol");
    }

    if (mpv_initialize(m_mpv) < 0) {
        qFatal("[MpvPlayerItem] Cannot initialize mpv");
    }

    if (mpv_observe_property(m_mpv, TrackListObserverId, "track-list", MPV_FORMAT_NODE) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe media tracks.";
    }
    if (mpv_observe_property(m_mpv, MuteObserverId, "mute", MPV_FORMAT_FLAG) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe mute state.";
    }
    if (mpv_observe_property(m_mpv, PositionObserverId, "time-pos", MPV_FORMAT_DOUBLE) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe playback position.";
    }
    if (mpv_observe_property(m_mpv, DurationObserverId, "duration", MPV_FORMAT_DOUBLE) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe media duration.";
    }
    if (mpv_observe_property(m_mpv, PauseObserverId, "pause", MPV_FORMAT_FLAG) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe pause state.";
    }
    if (mpv_observe_property(m_mpv, SubTextObserverId, "sub-text", MPV_FORMAT_STRING) < 0) {
        qWarning() << "[MpvPlayerItem] Cannot observe subtitle text.";
    }

    mpv_set_wakeup_callback(m_mpv, onMpvWakeup, this);

    connect(&m_pollTimer, &QTimer::timeout, this, &MpvPlayerItem::onMpvEvents);
    m_pollTimer.start(30); // ~33 FPS poll for time/progress updates
}

MpvPlayerItem::~MpvPlayerItem() {
    m_pollTimer.stop();
    if (m_mpv) {
        mpv_terminate_destroy(m_mpv);
    }
    QMutexLocker locker(&m_streamSourcesMutex);
    for (auto it = m_encryptedSources.begin(); it != m_encryptedSources.end(); ++it) {
        it.value().second.fill(QChar(0));
    }
    m_encryptedSources.clear();
    m_keyHex.fill(QChar(0));
}

QQuickFramebufferObject::Renderer *MpvPlayerItem::createRenderer() const {
    return new MpvRenderer(this);
}

void MpvPlayerItem::setSource(const QString &source) {
    if (m_source == source) return;
    clearEncryptedSource(m_activeEncryptedToken);
    m_activeEncryptedToken.clear();
    m_source = source;
    clearTrackLists();
    m_currentSubtitle.clear();
    m_position = 0.0;
    m_duration = 0.0;
    emit sourceChanged();
    emit positionChanged();
    emit durationChanged();
    emit currentSubtitleChanged();

    if (m_source.isEmpty()) return;

    QString playUri;
    if (!m_keyHex.isEmpty()) {
        m_activeEncryptedToken = QUuid::createUuid().toString(QUuid::WithoutBraces);
        {
            QMutexLocker locker(&m_streamSourcesMutex);
            m_encryptedSources.insert(m_activeEncryptedToken, qMakePair(m_source, m_keyHex));
        }
        playUri = QString("synapse-enc://%1").arg(m_activeEncryptedToken);
    } else {
        playUri = m_source;
    }

    QByteArray uriBytes = playUri.toUtf8();
    const char *cmd[] = {"loadfile", uriBytes.constData(), nullptr};
    mpv_command_async(m_mpv, 0, cmd);
    uriBytes.fill('\0');
    playUri.fill(QChar(0));
}

void MpvPlayerItem::setKeyHex(const QString &keyHex) {
    if (m_keyHex == keyHex) return;
    m_keyHex.fill(QChar(0));
    m_keyHex = keyHex;
    emit keyHexChanged();
}

EncryptedVideoReader *MpvPlayerItem::openEncryptedSource(const QString &token) {
    QPair<QString, QString> source;
    {
        QMutexLocker locker(&m_streamSourcesMutex);
        const auto it = m_encryptedSources.constFind(token);
        if (it == m_encryptedSources.cend()) return nullptr;
        source = it.value();
    }
    const QByteArray pathBytes = source.first.toUtf8();
    QByteArray keyBytes = source.second.toUtf8();
    source.second.fill(QChar(0));
    EncryptedVideoReader *reader = synapse_video_reader_open(pathBytes.constData(), keyBytes.constData());
    keyBytes.fill('\0');
    return reader;
}

void MpvPlayerItem::clearEncryptedSource(const QString &token) {
    if (token.isEmpty()) return;
    QMutexLocker locker(&m_streamSourcesMutex);
    auto it = m_encryptedSources.find(token);
    if (it == m_encryptedSources.end()) return;
    it.value().second.fill(QChar(0));
    m_encryptedSources.erase(it);
}

void MpvPlayerItem::setPosition(double pos) {
    if (qAbs(m_position - pos) < 0.1) return;
    QByteArray posStr = QByteArray::number(pos);
    const char *cmd[] = {"seek", posStr.constData(), "absolute", nullptr};
    mpv_command_async(m_mpv, 0, cmd);
}

void MpvPlayerItem::setPaused(bool paused) {
    if (!m_mpv || m_paused == paused) return;
    int flag = paused ? 1 : 0;
    const int result = mpv_set_property_async(m_mpv, 0, "pause", MPV_FORMAT_FLAG, &flag);
    if (result < 0) {
        qWarning() << "[MpvPlayerItem] Pause state could not be changed:" << mpv_error_string(result);
        return;
    }
    m_paused = paused;
    emit pausedChanged();
}

void MpvPlayerItem::setVolume(double volume) {
    m_volume = qBound(0.0, volume, 100.0);
    mpv_set_property_async(m_mpv, 0, "volume", MPV_FORMAT_DOUBLE, &m_volume);
    emit volumeChanged();
}

void MpvPlayerItem::play() {
    setPaused(false);
}

void MpvPlayerItem::pause() {
    setPaused(true);
}

void MpvPlayerItem::togglePlay() {
    setPaused(!m_paused);
}

void MpvPlayerItem::seekRelative(double seconds) {
    QByteArray secStr = QByteArray::number(seconds);
    const char *cmd[] = {"seek", secStr.constData(), "relative", nullptr};
    mpv_command_async(m_mpv, 0, cmd);
}

void MpvPlayerItem::setInteractiveSubtitles(bool enabled) {
    if (m_interactiveSubtitles == enabled) return;
    m_interactiveSubtitles = enabled;
    if (m_mpv) {
        mpv_set_option_string(m_mpv, "sub-visibility", enabled ? "no" : "yes");
    }
    emit interactiveSubtitlesChanged();
}

void MpvPlayerItem::command(const QVariantList &args) {
    if (args.isEmpty() || !m_mpv) return;
    QVector<QByteArray> utf8Args;
    utf8Args.reserve(args.size());
    QVector<const char *> cmdList;
    cmdList.reserve(args.size() + 1);
    for (const QVariant &arg : args) {
        utf8Args.append(arg.toString().toUtf8());
        cmdList.append(utf8Args.last().constData());
    }
    cmdList.append(nullptr);
    mpv_command_async(m_mpv, 0, cmdList.data());
}

