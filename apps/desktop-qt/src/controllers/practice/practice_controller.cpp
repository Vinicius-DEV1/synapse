#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonObject>

// Native practice and AI tutor persistence and session management.

QVariantList SynapseDataController::getPracticeSessions() {
    return executeQueryPrepared(
        "SELECT id, title, started_at, ended_at, custom_prompt FROM tutor_sessions "
        "WHERE deleted_at IS NULL ORDER BY started_at DESC LIMIT 100",
        {}
    ).toVariantList();
}

QVariantMap SynapseDataController::getPracticeSession(const QString &sessionId) {
    if (sessionId.trimmed().isEmpty()) return {};
    const QJsonArray arr = executeQueryPrepared(
        "SELECT id, title, started_at, ended_at, custom_prompt FROM tutor_sessions "
        "WHERE id = ? AND deleted_at IS NULL",
        {sessionId.trimmed()}
    );
    return arr.isEmpty() ? QVariantMap() : arr[0].toObject().toVariantMap();
}

QString SynapseDataController::createPracticeSession(const QString &title, const QString &customPrompt) {
    const QString trimmedTitle = title.trimmed().isEmpty() ? QStringLiteral("Sessão de Prática") : title.trimmed();
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QVariant promptVal = customPrompt.trimmed().isEmpty()
        ? QVariant(QMetaType::fromType<QString>())
        : QVariant(customPrompt.trimmed());
    const bool ok = executeSqlPrepared(
        "INSERT INTO tutor_sessions (id, title, started_at, custom_prompt) VALUES (?, ?, ?, ?)",
        {id, trimmedTitle, now, promptVal}
    );
    return ok ? id : QString();
}

bool SynapseDataController::deletePracticeSession(const QString &sessionId) {
    if (sessionId.trimmed().isEmpty()) return false;
    const QString now = currentTimestamp();
    return executeSqlPrepared(
        "UPDATE tutor_sessions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL",
        {now, sessionId.trimmed()}
    );
}

QVariantList SynapseDataController::getPracticeMessages(const QString &sessionId) {
    if (sessionId.trimmed().isEmpty()) return {};
    return executeQueryPrepared(
        "SELECT id, session_id, role, text_content, created_at FROM tutor_messages "
        "WHERE session_id = ? ORDER BY created_at ASC",
        {sessionId.trimmed()}
    ).toVariantList();
}

QString SynapseDataController::createPracticeMessage(const QString &sessionId, const QString &role, const QString &textContent) {
    if (sessionId.trimmed().isEmpty() || textContent.trimmed().isEmpty()) return QString();
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QString cleanRole = role.trimmed().isEmpty() ? QStringLiteral("user") : role.trimmed();
    const bool ok = executeSqlPrepared(
        "INSERT INTO tutor_messages (id, session_id, role, text_content, created_at) VALUES (?, ?, ?, ?, ?)",
        {id, sessionId.trimmed(), cleanRole, textContent.trimmed(), now}
    );
    return ok ? id : QString();
}

QVariantList SynapseDataController::getPracticeMemories() {
    return executeQueryPrepared(
        "SELECT id, category, fact, created_at FROM tutor_memories ORDER BY created_at DESC LIMIT 100",
        {}
    ).toVariantList();
}

QString SynapseDataController::createPracticeMemory(const QString &fact, const QString &category) {
    if (fact.trimmed().isEmpty()) return QString();
    const QString id = generateUuid();
    const QString now = currentTimestamp();
    const QString cleanCat = category.trimmed().isEmpty() ? QStringLiteral("general") : category.trimmed();
    const bool ok = executeSqlPrepared(
        "INSERT INTO tutor_memories (id, category, fact, created_at) VALUES (?, ?, ?, ?)",
        {id, cleanCat, fact.trimmed(), now}
    );
    return ok ? id : QString();
}

bool SynapseDataController::deletePracticeMemory(const QString &memoryId) {
    if (memoryId.trimmed().isEmpty()) return false;
    return executeSqlPrepared(
        "DELETE FROM tutor_memories WHERE id = ?",
        {memoryId.trimmed()}
    );
}

