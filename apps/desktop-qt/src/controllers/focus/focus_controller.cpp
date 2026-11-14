#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QMetaObject>

// Native focus session, ambient audio, and alarm persistence using prepared statements.

QVariantList SynapseDataController::getLofis() {
    return executeQueryPrepared(
        "SELECT id, title, original_name, duration, file_path, is_local, drive_file_id "
        "FROM lofis WHERE deleted_at IS NULL ORDER BY title ASC",
        {}
    ).toVariantList();
}

bool SynapseDataController::addLofiTrack(const QString &title, const QString &filePath,
                                        double duration) {
    if (title.trimmed().isEmpty()) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString origName = QFileInfo(filePath).fileName();

    const int rows = executeSqlPrepared(
        "INSERT INTO lofis (id, title, original_name, duration, file_path, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        {id, title.trimmed(), origName.isEmpty() ? title.trimmed() : origName,
         duration, filePath.trimmed(), ts}
    );

    return rows == 1;
}

bool SynapseDataController::deleteLofi(const QString &lofiId) {
    if (lofiId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE lofis SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, lofiId.trimmed()}
    );
    return rows == 1;
}

bool SynapseDataController::playLofiTrack(QObject *player, const QString &lofiId) {
    if (!player || lofiId.trimmed().isEmpty()) return false;

    const QJsonArray rows = executeQueryPrepared(
        "SELECT id, title, original_name, duration, file_path, drive_file_id, is_local "
        "FROM lofis WHERE id = ? AND deleted_at IS NULL",
        {lofiId.trimmed()}
    );
    if (rows.isEmpty()) return false;

    const QJsonObject track = rows.first().toObject();
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
    return executeQueryPrepared(
        "SELECT id, tag, description, target_time_minutes, status, summary, created_at "
        "FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 100",
        {}
    ).toVariantList();
}

bool SynapseDataController::recordFocusSession(const QString &tag, int targetMinutes,
                                              const QString &status, const QString &summary,
                                              const QString &description) {
    const QString resolvedTag = tag.trimmed().isEmpty() ? QStringLiteral("Estudo") : tag.trimmed();
    const QString resolvedStatus = status.trimmed().isEmpty() ? QStringLiteral("completed") : status.trimmed();
    const int resolvedMinutes = qMax(1, targetMinutes);
    const QString id = generateUuid();
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, summary, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        {id, resolvedTag, description.trimmed(), resolvedMinutes, resolvedStatus, summary.trimmed(), ts, ts}
    );

    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteFocusSession(const QString &sessionId) {
    if (sessionId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE focus_sessions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, sessionId.trimmed()}
    );
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getAlarms() {
    return executeQueryPrepared(
        "SELECT id, time, label, sound, enabled, days, created_at, updated_at "
        "FROM alarms WHERE deleted_at IS NULL ORDER BY time ASC",
        {}
    ).toVariantList();
}

bool SynapseDataController::createAlarm(const QString &time, const QString &label,
                                       const QString &sound, bool enabled,
                                       const QString &days) {
    if (time.trimmed().isEmpty()) return false;

    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedSound = sound.trimmed().isEmpty() ? QStringLiteral("bell") : sound.trimmed();
    const QString resolvedDays = days.trimmed().isEmpty() ? QStringLiteral("[]") : days.trimmed();

    const int rows = executeSqlPrepared(
        "INSERT INTO alarms (id, time, label, sound, enabled, days, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        {id, time.trimmed(), label.trimmed(), resolvedSound, enabled ? 1 : 0, resolvedDays, ts, ts}
    );

    return rows == 1;
}

bool SynapseDataController::updateAlarm(const QString &alarmId, const QString &time,
                                       const QString &label, const QString &sound,
                                       bool enabled, const QString &days) {
    if (alarmId.trimmed().isEmpty() || time.trimmed().isEmpty()) return false;

    const QString ts = currentTimestamp();
    const QString resolvedSound = sound.trimmed().isEmpty() ? QStringLiteral("bell") : sound.trimmed();
    const QString resolvedDays = days.trimmed().isEmpty() ? QStringLiteral("[]") : days.trimmed();

    const int rows = executeSqlPrepared(
        "UPDATE alarms SET time = ?, label = ?, sound = ?, enabled = ?, days = ?, updated_at = ? "
        "WHERE id = ? AND deleted_at IS NULL",
        {time.trimmed(), label.trimmed(), resolvedSound, enabled ? 1 : 0, resolvedDays, ts, alarmId.trimmed()}
    );

    return rows == 1;
}

bool SynapseDataController::toggleAlarm(const QString &alarmId) {
    if (alarmId.trimmed().isEmpty()) return false;

    const QJsonArray current = executeQueryPrepared(
        "SELECT enabled FROM alarms WHERE id = ? AND deleted_at IS NULL",
        {alarmId.trimmed()}
    );
    if (current.isEmpty()) return false;

    const bool currentlyEnabled = current.at(0).toObject().value(QStringLiteral("enabled")).toInt() != 0;
    const bool newEnabled = !currentlyEnabled;
    const QString ts = currentTimestamp();

    const int rows = executeSqlPrepared(
        "UPDATE alarms SET enabled = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {newEnabled ? 1 : 0, ts, alarmId.trimmed()}
    );

    return rows == 1;
}

bool SynapseDataController::deleteAlarm(const QString &alarmId) {
    if (alarmId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE alarms SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, alarmId.trimmed()}
    );
    return rows == 1;
}
