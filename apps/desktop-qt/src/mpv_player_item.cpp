#include "mpv_player_item.h"
#include <QtOpenGL/QOpenGLFramebufferObject>
#include <QtGui/QOpenGLContext>
#include <QtCore/QDebug>
#include <clocale>
#include <mpv/stream_cb.h>

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

        int flip_y = 1;
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

// ---------------------------------------------------------------------------
// mpv_stream_cb C-Callbacks connecting to Synapse Core
// ---------------------------------------------------------------------------

struct StreamCbContext {
    EncryptedVideoReader *reader;
};

static int64_t cb_size(void *user_data) {
    auto *ctx = static_cast<StreamCbContext *>(user_data);
    return synapse_video_reader_size(ctx->reader);
}

static int64_t cb_read(void *user_data, char *buf, size_t nbytes) {
    auto *ctx = static_cast<StreamCbContext *>(user_data);
    return synapse_video_reader_read(ctx->reader, reinterpret_cast<uint8_t *>(buf), nbytes);
}

static int64_t cb_seek(void *user_data, int64_t offset) {
    auto *ctx = static_cast<StreamCbContext *>(user_data);
    return synapse_video_reader_seek(ctx->reader, offset);
}

static void cb_close(void *user_data) {
    auto *ctx = static_cast<StreamCbContext *>(user_data);
    synapse_video_reader_close(ctx->reader);
    delete ctx;
}

static int cb_open(void *user_data, char *uri, mpv_stream_cb_info *info) {
    Q_UNUSED(user_data);
    QString sUri = QString::fromUtf8(uri);
    // Format: synapse-enc://path_to_file?key=hex_key
    if (!sUri.startsWith("synapse-enc://")) return -1;

    QString clean = sUri.mid(14);
    QStringList parts = clean.split("?key=");
    if (parts.size() != 2) return -1;

    QString filePath = parts[0];
    QString keyHex = parts[1];

    EncryptedVideoReader *reader = synapse_video_reader_open(
        filePath.toUtf8().constData(),
        keyHex.toUtf8().constData()
    );

    if (!reader) {
        qWarning() << "[StreamCb] Failed to open encrypted video reader for:" << filePath;
        return -1;
    }

    auto *ctx = new StreamCbContext{reader};
    info->cookie = ctx;
    info->size_fn = cb_size;
    info->read_fn = cb_read;
    info->seek_fn = cb_seek;
    info->close_fn = cb_close;

    return 0;
}

// ---------------------------------------------------------------------------
// MpvPlayerItem Implementation
// ---------------------------------------------------------------------------

MpvPlayerItem::MpvPlayerItem(QQuickItem *parent)
    : QQuickFramebufferObject(parent),
      m_mpv(create_mpv_instance()),
      m_mpvGl(nullptr),
      m_activeReader(nullptr),
      m_position(0),
      m_duration(0),
      m_paused(false),
      m_volume(100) {

    if (!m_mpv) {
        qFatal("[MpvPlayerItem] Cannot create mpv instance");
    }

    // Enable hardware acceleration directly on the GPU (VA-API on Linux / DXVA2/D3D11VA on Windows)
    mpv_set_option_string(m_mpv, "hwdec", "auto-safe");
    mpv_set_option_string(m_mpv, "vo", "libmpv");
    mpv_set_option_string(m_mpv, "keep-open", "yes");

    // Register custom synapse-enc protocol callback
    mpv_stream_cb_add_ro(m_mpv, "synapse-enc", this, cb_open);

    if (mpv_initialize(m_mpv) < 0) {
        qFatal("[MpvPlayerItem] Cannot initialize mpv");
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
}

QQuickFramebufferObject::Renderer *MpvPlayerItem::createRenderer() const {
    return new MpvRenderer(this);
}

void MpvPlayerItem::onMpvWakeup(void *ctx) {
    auto *self = static_cast<MpvPlayerItem *>(ctx);
    QMetaObject::invokeMethod(self, "onMpvEvents", Qt::QueuedConnection);
}

void MpvPlayerItem::onMpvEvents() {
    while (m_mpv) {
        mpv_event *event = mpv_wait_event(m_mpv, 0);
        if (event->event_id == MPV_EVENT_NONE) break;

        if (event->event_id == MPV_EVENT_PROPERTY_CHANGE) {
            auto *prop = static_cast<mpv_event_property *>(event->data);
            if (strcmp(prop->name, "time-pos") == 0 && prop->format == MPV_FORMAT_DOUBLE) {
                m_position = *static_cast<double *>(prop->data);
                emit positionChanged();
            } else if (strcmp(prop->name, "duration") == 0 && prop->format == MPV_FORMAT_DOUBLE) {
                m_duration = *static_cast<double *>(prop->data);
                emit durationChanged();
            } else if (strcmp(prop->name, "pause") == 0 && prop->format == MPV_FORMAT_FLAG) {
                m_paused = *static_cast<int *>(prop->data) != 0;
                emit pausedChanged();
            }
        } else if (event->event_id == MPV_EVENT_END_FILE) {
            emit endOfFile();
        }
    }
}

void MpvPlayerItem::setSource(const QString &source) {
    if (m_source == source) return;
    m_source = source;
    emit sourceChanged();

    if (m_source.isEmpty()) return;

    QString playUri;
    if (m_source.endsWith(".enc", Qt::CaseInsensitive)) {
        playUri = QString("synapse-enc://%1?key=%2").arg(m_source, m_keyHex);
    } else {
        playUri = m_source;
    }

    QByteArray uriBytes = playUri.toUtf8();
    const char *cmd[] = {"loadfile", uriBytes.constData(), nullptr};
    mpv_command_async(m_mpv, 0, cmd);
}

void MpvPlayerItem::setKeyHex(const QString &keyHex) {
    if (m_keyHex == keyHex) return;
    m_keyHex = keyHex;
    emit keyHexChanged();
}

void MpvPlayerItem::setPosition(double pos) {
    if (qAbs(m_position - pos) < 0.1) return;
    QByteArray posStr = QByteArray::number(pos);
    const char *cmd[] = {"seek", posStr.constData(), "absolute", nullptr};
    mpv_command_async(m_mpv, 0, cmd);
}

void MpvPlayerItem::setPaused(bool paused) {
    if (m_paused == paused) return;
    int flag = paused ? 1 : 0;
    mpv_set_property_async(m_mpv, 0, "pause", MPV_FORMAT_FLAG, &flag);
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

void MpvPlayerItem::setLoopAB(double a, double b) {
    QByteArray aStr = QByteArray::number(a);
    QByteArray bStr = QByteArray::number(b);
    mpv_set_property_string(m_mpv, "ab-loop-a", aStr.constData());
    mpv_set_property_string(m_mpv, "ab-loop-b", bStr.constData());
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


