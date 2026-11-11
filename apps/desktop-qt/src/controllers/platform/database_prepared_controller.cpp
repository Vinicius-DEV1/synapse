#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonValue>
#include <QtCore/QDebug>

QJsonArray SynapseDataController::executeQueryPrepared(const QString &sql,
                                                       const QVariantList &parameters) {
    if (!m_db) return {};
    QJsonArray values;
    for (const QVariant &parameter : parameters) values.append(QJsonValue::fromVariant(parameter));

    const QByteArray sqlBytes = sql.toUtf8();
    const QByteArray parameterBytes = QJsonDocument(values).toJson(QJsonDocument::Compact);
    char *raw = synapse_db_query_json_params(m_db, sqlBytes.constData(), parameterBytes.constData());
    if (!raw) return {};
    const QByteArray bytes(raw);
    synapse_free_string(raw);
    const QJsonDocument document = QJsonDocument::fromJson(bytes);
    return document.isArray() ? document.array() : QJsonArray();
}

int SynapseDataController::executeSqlPrepared(const QString &sql, const QVariantList &parameters) {
    if (!m_db) return -1;

    QJsonArray values;
    for (const QVariant &parameter : parameters) values.append(QJsonValue::fromVariant(parameter));

    const QByteArray sqlBytes = sql.toUtf8();
    const QByteArray parameterBytes = QJsonDocument(values).toJson(QJsonDocument::Compact);
    const int changedRows = synapse_db_execute_params(m_db, sqlBytes.constData(), parameterBytes.constData());
    if (changedRows < 0) qWarning() << "[SynapseDataController] Parameterized database write failed.";
    return changedRows;
}
