#include "synapse_controller.h"

#include <QtCore/QDate>
#include <QtCore/QDateTime>
#include <QtCore/QSet>
#include <algorithm>

QString SynapseDataController::startLibraryReadingSession(const QString &bookId, int startPage) {
    const QString normalizedBookId = bookId.trimmed();
    if (normalizedBookId.isEmpty() || (m_isVaultConfigured && !m_isVaultUnlocked)) return {};
    if (executeQueryPrepared("SELECT id FROM library_books WHERE id = ?1 AND deleted_at IS NULL",
                             {normalizedBookId}).isEmpty()) return {};
    if (!finishActiveLibraryReadingSession()) return {};

    const QString sessionId = generateUuid();
    const int normalizedStartPage = qMax(1, startPage);
    const QString timestamp = currentTimestamp();
    const int insertedRows = executeSqlPrepared(
        "INSERT INTO library_reading_sessions (id, book_id, started_at, start_page, end_page) "
        "VALUES (?1, ?2, ?3, ?4, ?4)",
        {sessionId, normalizedBookId, timestamp, normalizedStartPage});
    if (insertedRows != 1) return {};

    m_activeLibraryReadingSessionId = sessionId;
    m_activeLibraryReadingBookId = normalizedBookId;
    m_activeLibraryReadingStartPage = normalizedStartPage;
    m_activeLibraryReadingLastPage = normalizedStartPage;
    resetAutoLockTimer();
    return sessionId;
}

bool SynapseDataController::endLibraryReadingSession(const QString &sessionId, int endPage) {
    const QString normalizedSessionId = sessionId.trimmed();
    if (normalizedSessionId.isEmpty() || normalizedSessionId != m_activeLibraryReadingSessionId) return false;
    const int normalizedEndPage = qMax(1, endPage);
    const int pagesRead = qMax(1, qAbs(normalizedEndPage - m_activeLibraryReadingStartPage) + 1);
    const int updatedRows = executeSqlPrepared(
        "UPDATE library_reading_sessions SET ended_at = ?1, pages_read = ?2, end_page = ?3 "
        "WHERE id = ?4 AND ended_at IS NULL",
        {currentTimestamp(), pagesRead, normalizedEndPage, normalizedSessionId});
    if (updatedRows < 0) return false;
    if (updatedRows == 0) {
        const QJsonArray existing = executeQueryPrepared(
            "SELECT ended_at FROM library_reading_sessions WHERE id = ?1", {normalizedSessionId});
        if (existing.isEmpty() || !existing.at(0).toObject().value(QStringLiteral("ended_at")).isNull()) {
            m_activeLibraryReadingSessionId.clear();
            m_activeLibraryReadingBookId.clear();
            m_activeLibraryReadingStartPage = 0;
            m_activeLibraryReadingLastPage = 0;
            return !existing.isEmpty();
        }
        return false;
    }

    m_activeLibraryReadingSessionId.clear();
    m_activeLibraryReadingBookId.clear();
    m_activeLibraryReadingStartPage = 0;
    m_activeLibraryReadingLastPage = 0;
    return true;
}

bool SynapseDataController::finishActiveLibraryReadingSession() {
    if (m_activeLibraryReadingSessionId.isEmpty()) return true;
    return endLibraryReadingSession(m_activeLibraryReadingSessionId, m_activeLibraryReadingLastPage);
}

QVariantMap SynapseDataController::getLibraryReadingStats() {
    if (m_isVaultConfigured && !m_isVaultUnlocked) return {};

    const int booksStarted = executeQueryPrepared(
        "SELECT COUNT(*) AS count FROM library_books WHERE reading_status = 'reading' AND deleted_at IS NULL", {})
        .at(0).toObject().value(QStringLiteral("count")).toInt();
    const int booksFinished = executeQueryPrepared(
        "SELECT COUNT(*) AS count FROM library_books WHERE reading_status = 'finished' AND deleted_at IS NULL", {})
        .at(0).toObject().value(QStringLiteral("count")).toInt();
    const int highlights = executeQueryPrepared(
        "SELECT COUNT(*) AS count FROM library_highlights WHERE deleted_at IS NULL", {})
        .at(0).toObject().value(QStringLiteral("count")).toInt();
    const QJsonArray sessions = executeQueryPrepared(
        "SELECT started_at, ended_at, COALESCE(pages_read, 0) AS pages_read "
        "FROM library_reading_sessions", {});

    qint64 totalDurationSeconds = 0;
    qint64 totalPagesRead = 0;
    QSet<QString> uniqueReadingDays;
    for (const QJsonValue &sessionValue : sessions) {
        const QJsonObject session = sessionValue.toObject();
        const QString startedAt = session.value(QStringLiteral("started_at")).toString();
        const QString endedAt = session.value(QStringLiteral("ended_at")).toString();
        totalPagesRead += qMax(0, session.value(QStringLiteral("pages_read")).toInt());

        QDateTime start = QDateTime::fromString(startedAt, Qt::ISODateWithMs);
        if (!start.isValid()) start = QDateTime::fromString(startedAt, Qt::ISODate);
        if (start.isValid()) uniqueReadingDays.insert(start.toUTC().date().toString(Qt::ISODate));
        else if (startedAt.size() >= 10) uniqueReadingDays.insert(startedAt.left(10));

        if (!startedAt.isEmpty() && !endedAt.isEmpty()) {
            QDateTime end = QDateTime::fromString(endedAt, Qt::ISODateWithMs);
            if (!end.isValid()) end = QDateTime::fromString(endedAt, Qt::ISODate);
            if (start.isValid() && end.isValid()) {
                const qint64 duration = start.secsTo(end);
                if (duration > 0) totalDurationSeconds += qMin<qint64>(duration, 28800);
            }
        }
    }

    QStringList readingDays = uniqueReadingDays.values();
    std::sort(readingDays.begin(), readingDays.end());
    int longestStreak = 0;
    int streakLength = 0;
    QDate previousDay;
    for (const QString &dayText : readingDays) {
        const QDate day = QDate::fromString(dayText, Qt::ISODate);
        if (!day.isValid()) continue;
        streakLength = previousDay.isValid() && previousDay.daysTo(day) == 1 ? streakLength + 1 : 1;
        longestStreak = qMax(longestStreak, streakLength);
        previousDay = day;
    }

    int currentStreak = 0;
    const QDate currentUtcDay = QDateTime::currentDateTimeUtc().date();
    if (!readingDays.isEmpty()) {
        QDate latestDay = QDate::fromString(readingDays.last(), Qt::ISODate);
        if (latestDay.isValid() && (latestDay == currentUtcDay || latestDay == currentUtcDay.addDays(-1))) {
            currentStreak = 1;
            for (qsizetype index = readingDays.size() - 1; index > 0; --index) {
                const QDate current = QDate::fromString(readingDays.at(index), Qt::ISODate);
                const QDate previous = QDate::fromString(readingDays.at(index - 1), Qt::ISODate);
                if (!current.isValid() || !previous.isValid() || previous.daysTo(current) != 1) break;
                ++currentStreak;
            }
        }
    }

    QVariantList dayValues;
    dayValues.reserve(readingDays.size());
    for (const QString &day : readingDays) dayValues.append(day);
    return {{"totalBooksStarted", booksStarted},
            {"totalBooksFinished", booksFinished},
            {"totalTimeMinutes", qRound(static_cast<double>(totalDurationSeconds) / 60.0)},
            {"totalPagesRead", static_cast<qlonglong>(totalPagesRead)},
            {"totalHighlights", highlights},
            {"currentStreak", currentStreak},
            {"longestStreak", longestStreak},
            {"readingDays", dayValues}};
}
