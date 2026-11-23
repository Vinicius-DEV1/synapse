#include "../../synapse_controller.h"
#include <QtCore/QProcess>
#include <QtCore/QFileInfo>
#include <QtCore/QDir>
#include <QtCore/QStandardPaths>
#include <QtCore/QRegularExpression>
#include <QtCore/QDebug>

namespace {

QString findYtDlpBinary() {
    const QString localBin = "/home/vini/.local/bin/yt-dlp";
    if (QFileInfo::exists(localBin)) return localBin;

    const QString usrBin = "/usr/bin/yt-dlp";
    if (QFileInfo::exists(usrBin)) return usrBin;

    const QString usrLocalBin = "/usr/local/bin/yt-dlp";
    if (QFileInfo::exists(usrLocalBin)) return usrLocalBin;

    return QStandardPaths::findExecutable("yt-dlp");
}

QString sanitizeYtDlpError(const QString &stderrStr) {
    const QString lower = stderrStr.toLower();
    if (lower.contains("temporary failure in name resolution")
        || lower.contains("failed to resolve")
        || lower.contains("unable to download webpage")
        || lower.contains("network is unreachable")
        || lower.contains("timed out")) {
        return "Não foi possível conectar ao YouTube. Verifique sua conexão com a internet.";
    }
    if (lower.contains("playlist does not exist")) {
        return "A playlist informada não existe ou foi removida do YouTube.";
    }
    if (lower.contains("private video")) {
        return "Este vídeo é privado ou requer permissão especial no YouTube.";
    }
    if (lower.contains("video unavailable") || lower.contains("this video is unavailable")) {
        return "Este vídeo não está disponível no YouTube.";
    }
    if (lower.contains("sign in to confirm your age") || lower.contains("age-restricted")) {
        return "Este vídeo possui restrição de idade no YouTube.";
    }

    const QStringList lines = stderrStr.split('\n');
    for (int i = lines.size() - 1; i >= 0; --i) {
        const QString line = lines[i].trimmed();
        if (line.startsWith("ERROR:")) {
            const int bracketPos = line.indexOf("] ");
            if (bracketPos != -1) {
                return line.mid(bracketPos + 2).trimmed();
            }
            return line.mid(6).trimmed();
        }
    }
    return "Falha na comunicação com o YouTube via yt-dlp.";
}

} // namespace

QVariantMap SynapseDataController::fetchYouTubeInfo(const QString &url) {
    QVariantMap result;
    const QString trimmedUrl = url.trimmed();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
        result["success"] = false;
        result["error"] = "URL do YouTube inválida: deve iniciar com http:// ou https://";
        return result;
    }

    const QString ytdlp = findYtDlpBinary();
    if (ytdlp.isEmpty()) {
        result["success"] = false;
        result["error"] = "Binário yt-dlp não encontrado no sistema operacional.";
        return result;
    }

    QProcess proc;
    QStringList args;
    args << "-j" << "--no-warnings" << "--no-playlist" << "--" << trimmedUrl;
    proc.start(ytdlp, args);

    if (!proc.waitForFinished(20000)) {
        proc.kill();
        result["success"] = false;
        result["error"] = "Tempo limite excedido ao buscar metadados do YouTube.";
        return result;
    }

    if (proc.exitStatus() != QProcess::NormalExit || proc.exitCode() != 0) {
        const QString stderrOutput = QString::fromUtf8(proc.readAllStandardError());
        result["success"] = false;
        result["error"] = sanitizeYtDlpError(stderrOutput);
        return result;
    }

    const QByteArray stdoutData = proc.readAllStandardOutput();
    QJsonParseError parseErr;
    const QJsonDocument doc = QJsonDocument::fromJson(stdoutData, &parseErr);
    if (!doc.isObject()) {
        result["success"] = false;
        result["error"] = "Resposta do yt-dlp em formato JSON inválido.";
        return result;
    }

    const QJsonObject rootObj = doc.object();
    QVariantMap videoInfo;
    videoInfo["title"] = rootObj.value("title").toString("Vídeo do YouTube");
    videoInfo["channel"] = rootObj.value("uploader").toString(rootObj.value("channel").toString("Canal Desconhecido"));
    videoInfo["duration"] = rootObj.value("duration").toInt(0);
    videoInfo["thumbnail"] = rootObj.value("thumbnail").toString("");

    QVariantList subtitlesList;
    const QJsonObject subsObj = rootObj.value("subtitles").toObject();
    for (auto it = subsObj.begin(); it != subsObj.end(); ++it) {
        QVariantMap sub;
        sub["lang"] = it.key();
        sub["name"] = it.key().toUpper();
        sub["isAuto"] = false;
        subtitlesList.append(sub);
    }
    const QJsonObject autoSubsObj = rootObj.value("automatic_captions").toObject();
    for (auto it = autoSubsObj.begin(); it != autoSubsObj.end(); ++it) {
        bool exists = false;
        for (const auto &item : subtitlesList) {
            if (item.toMap().value("lang").toString() == it.key()) {
                exists = true;
                break;
            }
        }
        if (!exists) {
            QVariantMap sub;
            sub["lang"] = it.key();
            sub["name"] = it.key().toUpper() + " (Auto)";
            sub["isAuto"] = true;
            subtitlesList.append(sub);
        }
    }
    videoInfo["subtitles"] = subtitlesList;

    result["success"] = true;
    result["videoInfo"] = videoInfo;
    return result;
}

QString SynapseDataController::downloadYouTubeVideo(const QString &url, const QString &collectionId,
                                                   const QString &quality, const QStringList &subtitles) {
    const QString trimmedUrl = url.trimmed();
    if (trimmedUrl.isEmpty()) return QString();

    const QString ytdlp = findYtDlpBinary();
    if (ytdlp.isEmpty()) {
        emit youtubeDownloadFinished(false, "Binário yt-dlp não encontrado no sistema.", "");
        return QString();
    }

    cancelYouTubeDownload();

    const QString taskId = startTask("Download do YouTube: " + trimmedUrl, "youtube-download");
    m_activeYouTubeTaskId = taskId;

    const QString tempDir = QDir::tempPath() + "/synapse_yt_" + QUuid::createUuid().toString(QUuid::WithoutBraces);
    QDir().mkpath(tempDir);
    const QString outputTemplate = tempDir + "/video.%(ext)s";

    QString formatArg = "bestvideo[height<=720]+bestaudio/best[height<=720]";
    if (quality == "1080p") {
        formatArg = "bestvideo[height<=1080]+bestaudio/best[height<=1080]";
    } else if (quality == "480p") {
        formatArg = "bestvideo[height<=480]+bestaudio/best[height<=480]";
    } else if (quality == "360p") {
        formatArg = "bestvideo[height<=360]+bestaudio/best[height<=360]";
    }

    QStringList args;
    args << "-f" << formatArg;
    args << "--merge-output-format" << "mp4";
    args << "-o" << outputTemplate;
    args << "--no-playlist";

    if (!subtitles.isEmpty()) {
        args << "--write-sub" << "--sub-lang" << subtitles.join(",");
    }
    args << "--" << trimmedUrl;

    auto *proc = new QProcess(this);
    m_youtubeProcess = proc;

    connect(proc, &QProcess::readyReadStandardOutput, this, [this, proc, taskId]() {
        const QString output = QString::fromUtf8(proc->readAllStandardOutput());
        static const QRegularExpression regex(R"(\[download\]\s+(\d+(\.\d+)?)%)");
        const auto match = regex.match(output);
        if (match.hasMatch()) {
            const double percent = match.captured(1).toDouble();
            const double fraction = qBound(0.0, percent / 100.0, 1.0);
            updateTaskProgress(taskId, static_cast<int>(percent), "downloading");
            emit youtubeDownloadProgress(fraction, QString("Baixando: %1%").arg(percent, 0, 'f', 1));
        }
    });

    connect(proc, QOverload<int, QProcess::ExitStatus>::of(&QProcess::finished),
            this, [this, proc, taskId, tempDir, collectionId](int exitCode, QProcess::ExitStatus exitStatus) {
        m_youtubeProcess = nullptr;
        proc->deleteLater();

        if (exitStatus == QProcess::NormalExit && exitCode == 0) {
            QDir dir(tempDir);
            const QStringList files = dir.entryList({"*.mp4", "*.mkv", "*.webm"}, QDir::Files);
            if (!files.isEmpty()) {
                const QString downloadedFilePath = dir.filePath(files.first());
                updateTaskProgress(taskId, 100, "completed");
                emit youtubeDownloadProgress(1.0, "Download concluído com sucesso!");
                emit youtubeDownloadFinished(true, "", downloadedFilePath);
                importVideo(downloadedFilePath, "", collectionId);
                return;
            }
        }

        const QString stderrStr = QString::fromUtf8(proc->readAllStandardError());
        const QString errorMsg = sanitizeYtDlpError(stderrStr);
        updateTaskProgress(taskId, 0, "error", errorMsg);
        emit youtubeDownloadFinished(false, errorMsg, "");
        QDir(tempDir).removeRecursively();
    });

    proc->start(ytdlp, args);
    return taskId;
}

void SynapseDataController::cancelYouTubeDownload() {
    if (m_youtubeProcess && m_youtubeProcess->state() != QProcess::NotRunning) {
        m_youtubeProcess->kill();
        m_youtubeProcess->waitForFinished(1000);
        m_youtubeProcess->deleteLater();
        m_youtubeProcess = nullptr;
    }
    if (!m_activeYouTubeTaskId.isEmpty()) {
        cancelTask(m_activeYouTubeTaskId);
        m_activeYouTubeTaskId.clear();
    }
}
