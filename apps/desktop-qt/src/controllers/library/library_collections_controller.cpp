#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

QVariantList SynapseDataController::getLibraryCollections() {
    if (!m_db) return {};
    char *raw = synapse_library_get_collections(m_db);
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

QString SynapseDataController::createLibraryCollection(const QString &name, const QString &color) {
    if (!m_db) return {};
    const QByteArray nameBytes = name.trimmed().toUtf8();
    const QByteArray colorBytes = color.trimmed().toUtf8();
    char *raw = synapse_library_create_collection(m_db, nameBytes.constData(), colorBytes.constData());
    if (!raw) return {};
    const QString id = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return id;
}

bool SynapseDataController::updateLibraryCollection(const QString &collectionId, const QString &name,
                                                    const QString &color) {
    if (!m_db) return false;
    const QByteArray idBytes = collectionId.trimmed().toUtf8();
    const QByteArray nameBytes = name.trimmed().toUtf8();
    const QByteArray colorBytes = color.trimmed().toUtf8();
    return synapse_library_update_collection(m_db, idBytes.constData(), nameBytes.constData(), colorBytes.constData()) == 1;
}

bool SynapseDataController::deleteLibraryCollection(const QString &collectionId) {
    if (!m_db) return false;
    const QByteArray idBytes = collectionId.trimmed().toUtf8();
    return synapse_library_delete_collection(m_db, idBytes.constData()) == 1;
}

bool SynapseDataController::setBookCollections(const QString &bookId, const QVariantList &collectionIds) {
    if (!m_db) return false;
    const QByteArray idBytes = bookId.trimmed().toUtf8();
    QJsonArray array;
    for (const QVariant &v : collectionIds) {
        const QString s = v.toString().trimmed();
        if (!s.isEmpty()) array.append(s);
    }
    const QByteArray jsonBytes = QJsonDocument(array).toJson(QJsonDocument::Compact);
    return synapse_library_set_book_collections(m_db, idBytes.constData(), jsonBytes.constData()) == 1;
}
