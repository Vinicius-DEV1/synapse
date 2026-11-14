#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

QString SynapseDataController::startLibraryReadingSession(const QString &bookId, int startPage) {
    const QString normalizedBookId = bookId.trimmed();
    if (normalizedBookId.isEmpty() || !m_db || (m_isVaultConfigured && !m_isVaultUnlocked)) return {};
    if (!finishActiveLibraryReadingSession()) return {};

    const QByteArray bidBytes = normalizedBookId.toUtf8();
    char *raw = synapse_library_start_reading_session(m_db, bidBytes.constData(), qMax(1, startPage));
    if (!raw) return {};

    const QString sessionId = QString::fromUtf8(raw);
    synapse_free_string(raw);

    m_activeLibraryReadingSessionId = sessionId;
    m_activeLibraryReadingBookId = normalizedBookId;
    m_activeLibraryReadingStartPage = qMax(1, startPage);
    m_activeLibraryReadingLastPage = qMax(1, startPage);
    resetAutoLockTimer();
    return sessionId;
}

bool SynapseDataController::endLibraryReadingSession(const QString &sessionId, int endPage) {
    const QString normalizedSessionId = sessionId.trimmed();
    if (normalizedSessionId.isEmpty() || !m_db || normalizedSessionId != m_activeLibraryReadingSessionId) return false;

    const QByteArray sidBytes = normalizedSessionId.toUtf8();
    const int normalizedEndPage = qMax(1, endPage);
    const bool success = synapse_library_end_reading_session(
        m_db, sidBytes.constData(), normalizedEndPage, m_activeLibraryReadingStartPage) == 1;

    m_activeLibraryReadingSessionId.clear();
    m_activeLibraryReadingBookId.clear();
    m_activeLibraryReadingStartPage = 0;
    m_activeLibraryReadingLastPage = 0;
    return success;
}

bool SynapseDataController::finishActiveLibraryReadingSession() {
    if (m_activeLibraryReadingSessionId.isEmpty()) return true;
    return endLibraryReadingSession(m_activeLibraryReadingSessionId, m_activeLibraryReadingLastPage);
}

QVariantMap SynapseDataController::getLibraryReadingStats() {
    if (!m_db || (m_isVaultConfigured && !m_isVaultUnlocked)) return {};

    char *raw = synapse_library_get_reading_stats(m_db);
    if (!raw) return {};

    const QJsonObject stats = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);

    return {
        {"totalBooksStarted", stats.value("total_books_started").toInt()},
        {"totalBooksFinished", stats.value("total_books_finished").toInt()},
        {"totalTimeMinutes", stats.value("total_time_minutes").toInteger()},
        {"totalPagesRead", stats.value("total_pages_read").toInteger()},
        {"totalHighlights", stats.value("total_highlights").toInt()},
        {"currentStreak", stats.value("current_streak").toInt()},
        {"longestStreak", stats.value("longest_streak").toInt()},
        {"readingDays", stats.value("reading_days").toArray().toVariantList()}
    };
}
