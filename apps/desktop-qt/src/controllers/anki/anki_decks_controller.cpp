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

QJsonObject parseJsonObject(char* raw) {
    if (!raw) return QJsonObject();
    QByteArray bytes(raw);
    synapse_free_string(raw);
    QJsonDocument doc = QJsonDocument::fromJson(bytes);
    return doc.isObject() ? doc.object() : QJsonObject();
}
} // namespace

// Native Anki deck hierarchy and statistics persistence delegated to synapse-core.

QVariantList SynapseDataController::getDecks() {
    if (!m_db) return QVariantList();
    char* raw = synapse_anki_get_decks(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantList SynapseDataController::getHierarchicalDecks() {
    if (!m_db) return QVariantList();
    char* raw = synapse_anki_get_hierarchical_decks(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantMap SynapseDataController::getDeckStats(const QString &deckId) {
    if (!m_db || deckId.trimmed().isEmpty()) return QVariantMap();
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    char* raw = synapse_anki_get_deck_stats(m_db, idUtf8.constData());
    return parseJsonObject(raw).toVariantMap();
}

QVariantMap SynapseDataController::getGlobalAnkiStats() {
    if (!m_db) return QVariantMap();
    char* raw = synapse_anki_get_global_stats(m_db);
    return parseJsonObject(raw).toVariantMap();
}

bool SynapseDataController::createDeck(const QString &name, const QString &description, const QString &color, const QString &parentId) {
    if (!m_db || name.trimmed().isEmpty()) return false;
    QByteArray nameUtf8 = name.trimmed().toUtf8();
    QByteArray descUtf8 = description.trimmed().toUtf8();
    QByteArray colorUtf8 = color.trimmed().toUtf8();
    QByteArray parentUtf8 = parentId.trimmed().toUtf8();

    char* idRaw = synapse_anki_create_deck(
        m_db,
        nameUtf8.constData(),
        descUtf8.isEmpty() ? nullptr : descUtf8.constData(),
        colorUtf8.isEmpty() ? nullptr : colorUtf8.constData(),
        parentUtf8.isEmpty() ? nullptr : parentUtf8.constData()
    );

    if (!idRaw) return false;
    synapse_free_string(idRaw);
    refreshStats();
    return true;
}

bool SynapseDataController::updateDeck(const QString &deckId, const QString &name, const QString &description, const QString &color) {
    if (!m_db || deckId.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    QByteArray nameUtf8 = name.trimmed().toUtf8();
    QByteArray descUtf8 = description.trimmed().toUtf8();
    QByteArray colorUtf8 = color.trimmed().toUtf8();

    bool ok = synapse_anki_update_deck(
        m_db,
        idUtf8.constData(),
        nameUtf8.constData(),
        descUtf8.isEmpty() ? nullptr : descUtf8.constData(),
        colorUtf8.isEmpty() ? nullptr : colorUtf8.constData()
    ) == 1;

    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteDeck(const QString &deckId) {
    if (!m_db || deckId.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    bool ok = synapse_anki_delete_deck(m_db, idUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::resetDeckProgress(const QString &deckId) {
    if (!m_db || deckId.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = deckId.trimmed().toUtf8();
    bool ok = synapse_anki_reset_deck(m_db, idUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}
