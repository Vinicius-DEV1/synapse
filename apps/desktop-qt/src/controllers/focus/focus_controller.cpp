#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QMetaObject>

// Native focus session, ambient audio, and alarm persistence delegated to synapse_focus_* domain APIs.

QVariantList SynapseDataController::getLofis() {
    if (!m_db) return {};
    char *jsonStr = synapse_focus_get_lofis(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::addLofiTrack(const QString &title, const QString &filePath,
                                        double duration) {
    if (!m_db || title.trimmed().isEmpty()) return false;
    const int ret = synapse_focus_add_lofi(
        m_db,
        title.trimmed().toUtf8().constData(),
        filePath.trimmed().toUtf8().constData(),
        duration
    );
    return ret == 1;
}

bool SynapseDataController::deleteLofi(const QString &lofiId) {
    if (!m_db || lofiId.trimmed().isEmpty()) return false;
    const int ret = synapse_focus_delete_lofi(m_db, lofiId.trimmed().toUtf8().constData());
    return ret == 1;
}

bool SynapseDataController::playLofiTrack(QObject *player, const QString &lofiId) {
    if (!player || lofiId.trimmed().isEmpty() || !m_db) return false;

    const QVariantList tracks = getLofis();
    QVariantMap track;
    for (const QVariant &t : tracks) {
        const QVariantMap map = t.toMap();
        if (map.value(QStringLiteral("id")).toString() == lofiId.trimmed()) {
            track = map;
            break;
        }
    }
    if (track.isEmpty()) return false;

    QString filePath = track.value(QStringLiteral("file_path")).toString();
    if (filePath.startsWith(QLatin1String("file://"))) {
        filePath = filePath.mid(7);
    }
    const QString origName = track.value(QStringLiteral("original_name")).toString();
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString lofiDirectory = appDirectory + QStringLiteral("/lofi");

    QStringList candidates;
    auto addCand = [&candidates](const QString &p) {
        if (!p.isEmpty() && !candidates.contains(p)) {
            candidates.append(p);
        }
    };

    if (!filePath.isEmpty()) {
        addCand(filePath);
        addCand(filePath + QStringLiteral(".enc"));
        if (!QDir::isAbsolutePath(filePath)) {
            addCand(QDir(appDirectory).filePath(filePath));
            addCand(QDir(lofiDirectory).filePath(filePath));
        }
    }
    if (!origName.isEmpty()) {
        addCand(lofiDirectory + QStringLiteral("/") + origName);
        addCand(lofiDirectory + QStringLiteral("/") + origName + QStringLiteral(".enc"));
        addCand(appDirectory + QStringLiteral("/") + origName);
        addCand(appDirectory + QStringLiteral("/") + origName + QStringLiteral(".enc"));
        addCand(QDir::homePath() + QStringLiteral("/Downloads/") + origName);
    }

    QString resolvedPath;
    for (const QString &cand : candidates) {
        QFileInfo fi(cand);
        if (fi.exists() && fi.isFile() && fi.isReadable()) {
            resolvedPath = fi.canonicalFilePath();
            if (!resolvedPath.isEmpty()) break;
        }
    }

    if (resolvedPath.isEmpty()) {
        const int isLocal = track.value(QStringLiteral("is_local")).toInt();
        const QString driveId = track.value(QStringLiteral("drive_file_id")).toString();
        if (isLocal == 0 || !driveId.isEmpty()) {
            qWarning() << "[SynapseDataController] Lofi track" << lofiId
                       << "is stored on Google Drive and has not been downloaded locally yet.";
        } else {
            qWarning() << "[SynapseDataController] Local audio file not found for lofi track:" << lofiId;
        }
        return false;
    }

    QFile file(resolvedPath);
    if (!file.open(QIODevice::ReadOnly)) {
        qWarning() << "[SynapseDataController] Cannot open lofi audio file:" << resolvedPath;
        return false;
    }
    const bool encryptedAtRest = file.read(4) == QByteArrayLiteral("ENC1");
    file.close();

    QString focusKey;
    if (encryptedAtRest) {
        if (m_isVaultConfigured && !m_isVaultUnlocked) {
            qWarning() << "[SynapseDataController] Vault is locked. Cannot play encrypted lofi audio.";
            return false;
        }
        focusKey = m_unlockedKeys.value(QStringLiteral("focus"));
        if (focusKey.isEmpty()) focusKey = m_unlockedKeys.value(QStringLiteral("core"));
        if (focusKey.isEmpty()) focusKey = m_unlockedKeys.value(QStringLiteral("culture"));
        if (focusKey.isEmpty()) focusKey = m_unlockedKeys.value(QStringLiteral("files"));
        if (focusKey.isEmpty()) {
            qWarning() << "[SynapseDataController] Focus decryption key is unavailable.";
            return false;
        }
    }

    const QMetaObject *meta = player->metaObject();
    if (meta->indexOfProperty("keyHex") < 0 || meta->indexOfProperty("source") < 0) {
        focusKey.fill(QChar(0));
        qWarning() << "[SynapseDataController] Player item does not support keyHex or source property.";
        return false;
    }

    player->setProperty("keyHex", focusKey);
    const bool sourceAccepted = player->setProperty("source", resolvedPath);
    focusKey.fill(QChar(0));

    if (!sourceAccepted) {
        player->setProperty("keyHex", QString());
        return false;
    }

    player->setProperty("paused", false);
    return true;
}

QVariantList SynapseDataController::getFocusSessions() {
    if (!m_db) return {};
    char *jsonStr = synapse_focus_get_sessions(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::recordFocusSession(const QString &tag, int targetMinutes,
                                              const QString &status, const QString &summary,
                                              const QString &description) {
    if (!m_db) return false;
    const QByteArray tagBytes = tag.trimmed().toUtf8();
    const QByteArray statusBytes = status.trimmed().toUtf8();
    const QByteArray sumBytes = summary.trimmed().toUtf8();
    const QByteArray descBytes = description.trimmed().toUtf8();

    const int ret = synapse_focus_record_session(
        m_db,
        tagBytes.isEmpty() ? nullptr : tagBytes.constData(),
        targetMinutes,
        statusBytes.isEmpty() ? nullptr : statusBytes.constData(),
        sumBytes.isEmpty() ? nullptr : sumBytes.constData(),
        descBytes.isEmpty() ? nullptr : descBytes.constData()
    );

    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteFocusSession(const QString &sessionId) {
    if (!m_db || sessionId.trimmed().isEmpty()) return false;
    const int ret = synapse_focus_delete_session(m_db, sessionId.trimmed().toUtf8().constData());
    if (ret == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getAlarms() {
    if (!m_db) return {};
    char *jsonStr = synapse_focus_get_alarms(m_db);
    if (!jsonStr) return {};

    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(jsonStr));
    synapse_free_string(jsonStr);
    return doc.array().toVariantList();
}

bool SynapseDataController::createAlarm(const QString &time, const QString &label,
                                       const QString &sound, bool enabled,
                                       const QString &days) {
    if (!m_db || time.trimmed().isEmpty()) return false;

    const QByteArray timeBytes = time.trimmed().toUtf8();
    const QByteArray labelBytes = label.trimmed().toUtf8();
    const QByteArray soundBytes = sound.trimmed().toUtf8();
    const QByteArray daysBytes = days.trimmed().toUtf8();

    const int ret = synapse_focus_create_alarm(
        m_db,
        timeBytes.constData(),
        labelBytes.isEmpty() ? nullptr : labelBytes.constData(),
        soundBytes.isEmpty() ? nullptr : soundBytes.constData(),
        enabled ? 1 : 0,
        daysBytes.isEmpty() ? nullptr : daysBytes.constData()
    );

    return ret == 1;
}

bool SynapseDataController::updateAlarm(const QString &alarmId, const QString &time,
                                       const QString &label, const QString &sound,
                                       bool enabled, const QString &days) {
    if (!m_db || alarmId.trimmed().isEmpty() || time.trimmed().isEmpty()) return false;

    const QByteArray idBytes = alarmId.trimmed().toUtf8();
    const QByteArray timeBytes = time.trimmed().toUtf8();
    const QByteArray labelBytes = label.trimmed().toUtf8();
    const QByteArray soundBytes = sound.trimmed().toUtf8();
    const QByteArray daysBytes = days.trimmed().toUtf8();

    const int ret = synapse_focus_update_alarm(
        m_db,
        idBytes.constData(),
        timeBytes.constData(),
        labelBytes.isEmpty() ? nullptr : labelBytes.constData(),
        soundBytes.isEmpty() ? nullptr : soundBytes.constData(),
        enabled ? 1 : 0,
        daysBytes.isEmpty() ? nullptr : daysBytes.constData()
    );

    return ret == 1;
}

bool SynapseDataController::toggleAlarm(const QString &alarmId) {
    if (!m_db || alarmId.trimmed().isEmpty()) return false;
    const int ret = synapse_focus_toggle_alarm(m_db, alarmId.trimmed().toUtf8().constData());
    return ret == 1;
}

bool SynapseDataController::deleteAlarm(const QString &alarmId) {
    if (!m_db || alarmId.trimmed().isEmpty()) return false;
    const int ret = synapse_focus_delete_alarm(m_db, alarmId.trimmed().toUtf8().constData());
    return ret == 1;
}
