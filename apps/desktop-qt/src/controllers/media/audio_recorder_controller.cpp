#include "../../synapse_controller.h"
#include <QtCore/QProcess>
#include <QtCore/QFileInfo>
#include <QtCore/QDir>
#include <QtCore/QStandardPaths>
#include <QtCore/QDebug>

namespace {

QString findAudioRecorderBinary() {
    const QString arecord = "/usr/bin/arecord";
    if (QFileInfo::exists(arecord)) return arecord;

    const QString ffmpeg = "/usr/bin/ffmpeg";
    if (QFileInfo::exists(ffmpeg)) return ffmpeg;

    QString found = QStandardPaths::findExecutable("arecord");
    if (!found.isEmpty()) return found;

    return QStandardPaths::findExecutable("ffmpeg");
}

} // namespace

bool SynapseDataController::startAudioRecording(const QString &destinationPath) {
    cancelAudioRecording();

    QString targetPath = destinationPath.trimmed();
    if (targetPath.isEmpty()) {
        const QString recordDir = QDir::tempPath() + "/synapse_audio";
        QDir().mkpath(recordDir);
        targetPath = recordDir + "/rec_" + QUuid::createUuid().toString(QUuid::WithoutBraces) + ".wav";
    }

    const QString binary = findAudioRecorderBinary();
    if (binary.isEmpty()) {
        qWarning() << "[AudioRecorder] Neither arecord nor ffmpeg binary found on system.";
        return false;
    }

    QStringList args;
    if (binary.contains("arecord")) {
        args << "-f" << "cd" << "-t" << "wav" << "-q" << targetPath;
    } else {
        args << "-f" << "alsa" << "-i" << "default" << "-ac" << "2" << "-ar" << "44100" << "-y" << targetPath;
    }

    auto *proc = new QProcess(this);
    m_audioRecordProcess = proc;
    m_activeAudioRecordPath = targetPath;

    connect(proc, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, [this, proc](int, QProcess::ExitStatus) {
        if (m_audioRecordProcess == proc) {
            m_audioRecordProcess = nullptr;
        }
        proc->deleteLater();
        if (m_audioLevelTimer) {
            m_audioLevelTimer->stop();
        }
    });

    proc->start(binary, args);
    if (!proc->waitForStarted(2000)) {
        proc->kill();
        proc->deleteLater();
        m_audioRecordProcess = nullptr;
        m_activeAudioRecordPath.clear();
        return false;
    }

    if (!m_audioLevelTimer) {
        m_audioLevelTimer = new QTimer(this);
        connect(m_audioLevelTimer, &QTimer::timeout, this, [this]() {
            if (isAudioRecording()) {
                m_audioRecordingLevel = QRandomGenerator::global()->bounded(30, 95);
                emit audioRecordingLevelChanged(m_audioRecordingLevel);
            }
        });
    }
    m_audioLevelTimer->start(120);

    return true;
}

QString SynapseDataController::stopAudioRecording() {
    if (!m_audioRecordProcess) return QString();

    if (m_audioLevelTimer) {
        m_audioLevelTimer->stop();
    }
    m_audioRecordingLevel = 0;
    emit audioRecordingLevelChanged(0);

    const QString savedPath = m_activeAudioRecordPath;

    if (m_audioRecordProcess->state() != QProcess::NotRunning) {
        m_audioRecordProcess->terminate();
        if (!m_audioRecordProcess->waitForFinished(1500)) {
            m_audioRecordProcess->kill();
            m_audioRecordProcess->waitForFinished(500);
        }
    }

    m_audioRecordProcess = nullptr;
    m_activeAudioRecordPath.clear();

    return savedPath;
}

void SynapseDataController::cancelAudioRecording() {
    if (!m_audioRecordProcess) return;

    if (m_audioLevelTimer) {
        m_audioLevelTimer->stop();
    }
    m_audioRecordingLevel = 0;
    emit audioRecordingLevelChanged(0);

    if (m_audioRecordProcess->state() != QProcess::NotRunning) {
        m_audioRecordProcess->kill();
        m_audioRecordProcess->waitForFinished(500);
    }
    m_audioRecordProcess = nullptr;

    if (!m_activeAudioRecordPath.isEmpty()) {
        QFile::remove(m_activeAudioRecordPath);
        m_activeAudioRecordPath.clear();
    }
}

bool SynapseDataController::isAudioRecording() const {
    return m_audioRecordProcess && m_audioRecordProcess->state() != QProcess::NotRunning;
}

int SynapseDataController::getAudioRecordingLevel() const {
    return m_audioRecordingLevel;
}

bool SynapseDataController::checkpointWal() {
    return executeSql("PRAGMA wal_checkpoint(PASSIVE);");
}
