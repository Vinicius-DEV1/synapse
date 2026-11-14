#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>

bool SynapseDataController::movePage(const QString &pageId, const QString &newParentId) {
    if (!m_db) return false;
    const QString normalizedPageId = pageId.trimmed();
    const QString normalizedParentId = newParentId.trimmed();
    if (normalizedPageId.isEmpty() || normalizedPageId == normalizedParentId) {
        return false;
    }

    const QByteArray pidBytes = normalizedPageId.toUtf8();
    const QByteArray parentBytes = normalizedParentId.toUtf8();
    return synapse_notes_move_page(
        m_db,
        pidBytes.constData(),
        normalizedParentId.isEmpty() ? nullptr : parentBytes.constData()
    ) == 1;
}

bool SynapseDataController::reorderSubPages(const QString &parentId, const QVariantList &orderedPageIds) {
    if (!m_db) return false;
    const QString normalizedParentId = parentId.trimmed();
    const QByteArray parentBytes = normalizedParentId.toUtf8();

    QJsonArray array;
    for (const QVariant &v : orderedPageIds) {
        array.append(v.toString().trimmed());
    }
    const QByteArray jsonBytes = QJsonDocument(array).toJson(QJsonDocument::Compact);

    return synapse_notes_reorder_pages(
        m_db,
        normalizedParentId.isEmpty() ? nullptr : parentBytes.constData(),
        jsonBytes.constData()
    ) == 1;
}
