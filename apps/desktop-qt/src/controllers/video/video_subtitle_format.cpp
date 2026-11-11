#include "video_subtitle_format.h"

#include <QtCore/QRegularExpression>
#include <QtCore/QString>

QByteArray convertSubtitleToWebVtt(const QByteArray &source, bool *valid) {
    if (valid) *valid = false;
    if (source.isEmpty()) return {};

    QString text = QString::fromUtf8(source);
    if (!text.isEmpty() && text.front() == QChar(0xFEFF)) text.remove(0, 1);
    text.replace(QStringLiteral("\r\n"), QStringLiteral("\n"));
    text.replace(QChar('\r'), QChar('\n'));

    const bool alreadyWebVtt = text.trimmed().startsWith(QStringLiteral("WEBVTT"));
    const QRegularExpression arrow(QStringLiteral("-->"));
    if (!arrow.match(text).hasMatch()) {
        text.fill(QChar(0));
        return {};
    }

    if (!alreadyWebVtt) text.prepend(QStringLiteral("WEBVTT\n\n"));
    const QRegularExpression srtTimestamp(
        QStringLiteral("(\\d{2}:\\d{2}:\\d{2}),(\\d{3})"));
    text.replace(srtTimestamp, QStringLiteral("\\1.\\2"));

    QByteArray result = text.toUtf8();
    text.fill(QChar(0));
    if (valid) *valid = !result.isEmpty();
    return result;
}
