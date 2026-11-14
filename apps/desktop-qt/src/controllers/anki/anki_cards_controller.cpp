#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

namespace {
QJsonArray parseJsonArray(char* raw) {
    if (!raw) return QJsonArray();
    QByteArray bytes(raw);
    synapse_free_string(raw);
    QJsonDocument doc = QJsonDocument::fromJson(bytes);
    return doc.isArray() ? doc.array() : QJsonArray();
}
} // namespace

// Native Anki card scheduling and review persistence delegated to synapse-core.

QVariantList SynapseDataController::getDeckCards(const QString &deckId) {
    if (!m_db || deckId.trimmed().isEmpty()) return QVariantList();
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    char* raw = synapse_anki_get_deck_cards(m_db, idUtf8.constData());
    return parseJsonArray(raw).toVariantList();
}

QVariantList SynapseDataController::getDueCards(const QString &deckId) {
    if (!m_db || deckId.trimmed().isEmpty()) return QVariantList();
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    char* raw = synapse_anki_get_due_cards(m_db, idUtf8.constData());
    return parseJsonArray(raw).toVariantList();
}

bool SynapseDataController::createCard(const QString &deckId, const QString &front, const QString &back, const QString &tags, const QString &cardType, const QString &extraNote) {
    if (!m_db || deckId.trimmed().isEmpty() || front.trimmed().isEmpty()) {
        return false;
    }
    QByteArray deckUtf8 = deckId.trimmed().toUtf8();
    QByteArray frontUtf8 = front.trimmed().toUtf8();
    QByteArray backUtf8 = back.toUtf8();
    QByteArray tagsUtf8 = tags.trimmed().toUtf8();
    QByteArray typeUtf8 = cardType.trimmed().toUtf8();
    QByteArray noteUtf8 = extraNote.trimmed().toUtf8();

    char* idRaw = synapse_anki_create_card(
        m_db,
        deckUtf8.constData(),
        frontUtf8.constData(),
        backUtf8.constData(),
        tagsUtf8.isEmpty() ? nullptr : tagsUtf8.constData(),
        typeUtf8.isEmpty() ? nullptr : typeUtf8.constData(),
        noteUtf8.isEmpty() ? nullptr : noteUtf8.constData()
    );

    if (!idRaw) return false;
    synapse_free_string(idRaw);
    refreshStats();
    return true;
}

bool SynapseDataController::updateCard(const QString &cardId, const QString &front, const QString &back, const QString &tags, const QString &cardType, const QString &extraNote) {
    if (!m_db || cardId.trimmed().isEmpty() || front.trimmed().isEmpty()) {
        return false;
    }
    QByteArray idUtf8 = cardId.trimmed().toUtf8();
    QByteArray frontUtf8 = front.trimmed().toUtf8();
    QByteArray backUtf8 = back.toUtf8();
    QByteArray tagsUtf8 = tags.trimmed().toUtf8();
    QByteArray typeUtf8 = cardType.trimmed().toUtf8();
    QByteArray noteUtf8 = extraNote.trimmed().toUtf8();

    return synapse_anki_update_card(
        m_db,
        idUtf8.constData(),
        frontUtf8.constData(),
        backUtf8.constData(),
        tagsUtf8.isEmpty() ? nullptr : tagsUtf8.constData(),
        typeUtf8.isEmpty() ? nullptr : typeUtf8.constData(),
        noteUtf8.isEmpty() ? nullptr : noteUtf8.constData()
    ) == 1;
}

bool SynapseDataController::deleteCard(const QString &cardId) {
    if (!m_db || cardId.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = cardId.trimmed().toUtf8();
    bool ok = synapse_anki_delete_card(m_db, idUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::recordCardReview(const QString &cardId, int rating) {
    if (!m_db || cardId.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = cardId.trimmed().toUtf8();
    return synapse_anki_record_review(m_db, idUtf8.constData(), rating) == 1;
}
