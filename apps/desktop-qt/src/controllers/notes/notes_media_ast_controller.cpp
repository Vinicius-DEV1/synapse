#include "synapse_controller.h"

#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QtGlobal>
#include <QtCore/QUrl>

QString SynapseDataController::moveTableColumn(const QString &tableHtml, int fromCol, int toCol) {
    const QByteArray bytes = tableHtml.toUtf8();
    char *raw = synapse_notes_move_table_column(bytes.constData(), fromCol, toCol);
    if (!raw) return tableHtml;
    const QString out = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return out;
}

QString SynapseDataController::moveTableRow(const QString &tableHtml, int fromRow, int toRow) {
    const QByteArray bytes = tableHtml.toUtf8();
    char *raw = synapse_notes_move_table_row(bytes.constData(), fromRow, toRow);
    if (!raw) return tableHtml;
    const QString out = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return out;
}

QVariantList SynapseDataController::computeEqualNoteColumnWidths(int columnCount) {
    const int boundedCount = qBound(1, columnCount, 5);
    char *raw = synapse_notes_compute_equal_column_widths(boundedCount);
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QVariantList SynapseDataController::extractLooseFileWidgetIds(const QString &html) {
    const QByteArray bytes = html.toUtf8();
    char *raw = synapse_notes_extract_loose_file_ids(bytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QString SynapseDataController::renderMermaidDataUri(const QString &chart) {
    const QByteArray bytes = chart.toUtf8();
    char *raw = synapse_notes_render_mermaid_data_uri(bytes.constData());
    if (!raw) return {};
    const QString uri = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return uri;
}

QString SynapseDataController::renderMermaidSvg(const QString &chart) {
    const QByteArray bytes = chart.toUtf8();
    char *raw = synapse_notes_render_mermaid_svg(bytes.constData());
    if (!raw) return {};
    const QString svg = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return svg;
}

QString SynapseDataController::getCachedImageDataUri(const QString &imageId) {
    if (!m_db || imageId.trimmed().isEmpty()) return {};
    const QByteArray idBytes = imageId.trimmed().toUtf8();
    QString key = m_unlockedKeys.value(QStringLiteral("notes"));
    if (key.isEmpty()) key = m_unlockedKeys.value(QStringLiteral("files"));
    const QByteArray keyBytes = key.toUtf8();
    char *raw = synapse_notes_get_cached_image_data_uri(
        m_db,
        idBytes.constData(),
        keyBytes.isEmpty() ? nullptr : keyBytes.constData()
    );
    if (!raw) return {};
    const QString uri = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return uri;
}

bool SynapseDataController::saveCachedImageDataUrl(const QString &imageId, const QString &dataUrl) {
    if (!m_db || imageId.trimmed().isEmpty() || !dataUrl.startsWith(QStringLiteral("data:"))) {
        return false;
    }
    const int commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return false;
    const QString header = dataUrl.left(commaIdx);
    const QString mime = header.mid(5).section(';', 0, 0);
    const QByteArray bytes = QByteArray::fromBase64(dataUrl.mid(commaIdx + 1).toUtf8());
    if (bytes.isEmpty()) return false;

    QString key = m_isVaultConfigured ? m_unlockedKeys.value(QStringLiteral("notes")) : QString();
    const QByteArray idBytes = imageId.trimmed().toUtf8();
    const QByteArray mimeBytes = mime.toUtf8();
    const QByteArray keyBytes = key.toUtf8();
    return synapse_notes_put_cached_image_bytes(
        m_db,
        idBytes.constData(),
        reinterpret_cast<const unsigned char *>(bytes.constData()),
        static_cast<int>(bytes.size()),
        mimeBytes.isEmpty() ? nullptr : mimeBytes.constData(),
        keyBytes.isEmpty() ? nullptr : keyBytes.constData()
    ) == 1;
}

bool SynapseDataController::saveCachedImageFromFile(const QString &imageId, const QUrl &fileUrl) {
    if (!m_db || imageId.trimmed().isEmpty()) return false;
    const QString localPath = fileUrl.isLocalFile() ? fileUrl.toLocalFile() : fileUrl.toString();
    QFile f(localPath);
    if (!f.open(QIODevice::ReadOnly)) return false;
    const QByteArray bytes = f.read(25 * 1024 * 1024);
    if (bytes.isEmpty()) return false;

    QString key = m_isVaultConfigured ? m_unlockedKeys.value(QStringLiteral("notes")) : QString();
    const QByteArray idBytes = imageId.trimmed().toUtf8();
    const QByteArray keyBytes = key.toUtf8();
    return synapse_notes_put_cached_image_bytes(
        m_db,
        idBytes.constData(),
        reinterpret_cast<const unsigned char *>(bytes.constData()),
        static_cast<int>(bytes.size()),
        nullptr,
        keyBytes.isEmpty() ? nullptr : keyBytes.constData()
    ) == 1;
}

bool SynapseDataController::deleteCachedImage(const QString &imageId) {
    if (!m_db || imageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = imageId.trimmed().toUtf8();
    return synapse_notes_delete_cached_image(m_db, idBytes.constData()) == 1;
}
