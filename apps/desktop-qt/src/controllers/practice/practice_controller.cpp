#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QJsonArray>

// Native practice and AI tutor persistence and session management.

QVariantList SynapseDataController::getPracticeSessions() {
    if (!m_db) return {};
    char *raw = synapse_practice_get_sessions(m_db);
    if (!raw) return {};
    const auto doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

QVariantMap SynapseDataController::getPracticeSession(const QString &sessionId) {
    if (!m_db || sessionId.trimmed().isEmpty()) return {};
    const QByteArray sid = sessionId.trimmed().toUtf8();
    char *raw = synapse_practice_get_session(m_db, sid.constData());
    if (!raw) return {};
    const auto doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.object().toVariantMap();
}

QString SynapseDataController::createPracticeSession(const QString &title, const QString &customPrompt) {
    if (!m_db) return {};
    const QByteArray t = title.trimmed().toUtf8();
    const QByteArray p = customPrompt.trimmed().toUtf8();
    char *raw = synapse_practice_create_session(
        m_db,
        t.isEmpty() ? nullptr : t.constData(),
        p.isEmpty() ? nullptr : p.constData()
    );
    if (!raw) return {};
    const QString id = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return id;
}

bool SynapseDataController::deletePracticeSession(const QString &sessionId) {
    if (!m_db || sessionId.trimmed().isEmpty()) return false;
    const QByteArray sid = sessionId.trimmed().toUtf8();
    return synapse_practice_delete_session(m_db, sid.constData()) == 1;
}

QVariantList SynapseDataController::getPracticeMessages(const QString &sessionId) {
    if (!m_db || sessionId.trimmed().isEmpty()) return {};
    const QByteArray sid = sessionId.trimmed().toUtf8();
    char *raw = synapse_practice_get_messages(m_db, sid.constData());
    if (!raw) return {};
    const auto doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

QString SynapseDataController::createPracticeMessage(const QString &sessionId, const QString &role, const QString &textContent) {
    if (!m_db || sessionId.trimmed().isEmpty() || textContent.trimmed().isEmpty()) return {};
    const QByteArray sid = sessionId.trimmed().toUtf8();
    const QByteArray r = role.trimmed().isEmpty() ? QByteArray("user") : role.trimmed().toUtf8();
    const QByteArray c = textContent.trimmed().toUtf8();
    char *raw = synapse_practice_create_message(m_db, sid.constData(), r.constData(), c.constData());
    if (!raw) return {};
    const QString id = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return id;
}

QVariantList SynapseDataController::getPracticeMemories() {
    if (!m_db) return {};
    char *raw = synapse_practice_get_memories(m_db);
    if (!raw) return {};
    const auto doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

QString SynapseDataController::createPracticeMemory(const QString &fact, const QString &category) {
    if (!m_db || fact.trimmed().isEmpty()) return {};
    const QByteArray f = fact.trimmed().toUtf8();
    const QByteArray cat = category.trimmed().toUtf8();
    char *raw = synapse_practice_create_memory(
        m_db,
        cat.isEmpty() ? nullptr : cat.constData(),
        f.constData()
    );
    if (!raw) return {};
    const QString id = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return id;
}

bool SynapseDataController::deletePracticeMemory(const QString &memoryId) {
    if (!m_db || memoryId.trimmed().isEmpty()) return false;
    const QByteArray mid = memoryId.trimmed().toUtf8();
    return synapse_practice_delete_memory(m_db, mid.constData()) == 1;
}
