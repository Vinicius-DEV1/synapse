#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QSysInfo>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>

// Native database maintenance and system diagnostics.

void SynapseDataController::copyToClipboard(const QString &text) {
    QClipboard *cb = QGuiApplication::clipboard();
    if (cb) {
        cb->setText(text);
    }
}

QString SynapseDataController::exportDatabaseBackup(const QString &destinationDir) {
    if (m_dbPath.isEmpty() || !QFile::exists(m_dbPath)) {
        return "";
    }
    QString targetDir = destinationDir.isEmpty() 
        ? QStandardPaths::writableLocation(QStandardPaths::DocumentsLocation)
        : destinationDir;
    QDir().mkpath(targetDir);
    QString timestamp = QDateTime::currentDateTime().toString("yyyyMMdd_hhmmss");
    QString targetFile = targetDir + "/synapse_backup_" + timestamp + ".sqlite";

    // Flush WAL before backing up
    executeSql("PRAGMA wal_checkpoint(PASSIVE)");
    bool ok = QFile::copy(m_dbPath, targetFile);
    if (ok) {
        qDebug() << "[SynapseDataController] Backup successfully created at:" << targetFile;
        return targetFile;
    }
    return "";
}

bool SynapseDataController::optimizeDatabase() {
    executeSql("PRAGMA optimize");
    executeSql("PRAGMA wal_checkpoint(TRUNCATE)");
    refreshStats();
    qDebug() << "[SynapseDataController] Database successfully optimized and WAL truncated.";
    return true;
}

QVariantMap SynapseDataController::getSystemDiagnostics() {
    QVariantMap res;
    QFileInfo dbInfo(m_dbPath);
    res["db_size_bytes"] = dbInfo.size();
    res["db_path"] = m_dbPath;
    
    QFileInfo walInfo(m_dbPath + "-wal");
    res["wal_size_bytes"] = walInfo.exists() ? walInfo.size() : 0;
    
    res["qt_version"] = QString(qVersion());
    res["os_name"] = QSysInfo::prettyProductName();
    res["cpu_arch"] = QSysInfo::currentCpuArchitecture();
    
    QJsonArray tArr = executeQuery("SELECT count(*) as count FROM sqlite_master WHERE type='table'");
    int tableCount = (!tArr.isEmpty()) ? tArr[0].toObject().value("count").toInt() : 0;
    res["table_count"] = tableCount;

    return res;
}

