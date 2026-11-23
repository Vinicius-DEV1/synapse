#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// ---------------------------------------------------------------------------
// 1. Notes and hierarchical pages
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getPages(const QString &filter) {
    if (!m_db) return {};
    const QByteArray fBytes = filter.trimmed().toUtf8();
    char *raw = synapse_notes_get_pages(m_db, filter.trimmed().isEmpty() ? nullptr : fBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QVariantList SynapseDataController::getPinnedPages() {
    if (!m_db) return {};
    char *raw = synapse_notes_get_pinned_pages(m_db);
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QVariantList SynapseDataController::getPageTree(const QString &filter) {
    if (!m_db) return {};
    const QByteArray fBytes = filter.trimmed().toUtf8();
    char *raw = synapse_notes_get_page_tree(m_db, filter.trimmed().isEmpty() ? nullptr : fBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QVariantMap SynapseDataController::getPage(const QString &pageId) {
    if (!m_db || pageId.trimmed().isEmpty()) return {};
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    char *raw = synapse_notes_get_page(m_db, idBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    if (!doc.isObject()) return {};
    QJsonObject object = doc.object();
    const QString encryptedContent = object.value("encrypted_content").toString();
    if (!encryptedContent.isEmpty()) {
        const QString notesKey = m_unlockedKeys.value("notes");
        if (m_isVaultConfigured && !m_isVaultUnlocked) {
            object["content"] = "🔒 [Encrypted note]";
        } else if (notesKey.isEmpty()) {
            object["content"] = QString();
            object["decryption_error"] = true;
        } else {
            const QString decrypted = decryptContent(notesKey, encryptedContent);
            if (decrypted.isNull()) {
                object["content"] = QString();
                object["decryption_error"] = true;
            } else {
                object["content"] = decrypted;
            }
        }
    }
    return object.toVariantMap();
}

bool SynapseDataController::savePage(const QString &pageId, const QString &title, const QString &content, const QString &icon, const QString &expectedUpdatedAt) {
    if (!m_db) return false;
    if (m_isVaultConfigured && !m_isVaultUnlocked) return false;
    const bool encryptAtRest = m_isVaultConfigured;
    const QString notesKey = m_unlockedKeys.value("notes");
    if (encryptAtRest && notesKey.isEmpty()) return false;
    QString encrypted;
    if (encryptAtRest) {
        encrypted = encryptContent(notesKey, content);
        if (encrypted.isNull()) return false;
    }

    const bool inserting = pageId.isEmpty();
    const QString targetId = inserting ? generateUuid() : pageId;

    if (!inserting) {
        const QVariantMap existing = getPage(targetId);
        if (existing.isEmpty()) return false;
        const QString currentUpdatedAt = existing.value("updated_at").toString();

        if (!expectedUpdatedAt.isEmpty() && currentUpdatedAt != expectedUpdatedAt) {
            QString existingContent = existing.value("content").toString();
            if (existingContent != content) {
                const QByteArray pidBytes = targetId.toUtf8();
                const QByteArray cBytes = encryptAtRest ? QByteArray() : content.toUtf8();
                const QByteArray encBytes = encryptAtRest ? encrypted.toUtf8() : QByteArray();
                char *hid = synapse_notes_record_history(
                    m_db,
                    pidBytes.constData(),
                    cBytes.constData(),
                    encBytes.isEmpty() ? nullptr : encBytes.constData()
                );
                if (hid) synapse_free_string(hid);
                emit pageConflictDetected(targetId, existingContent);
                return false;
            }
        }
    }

    const QByteArray targetBytes = targetId.toUtf8();
    const QByteArray titleBytes = title.toUtf8();
    const QByteArray contentBytes = encryptAtRest ? QByteArray() : content.toUtf8();
    const QByteArray encBytes = encryptAtRest ? encrypted.toUtf8() : QByteArray();
    const QByteArray iconBytes = icon.toUtf8();

    const bool saved = synapse_notes_save_page(
        m_db,
        targetBytes.constData(),
        titleBytes.constData(),
        contentBytes.constData(),
        encBytes.isEmpty() ? nullptr : encBytes.constData(),
        iconBytes.constData()
    ) == 1;

    if (!saved) return false;

    qint64 nextHistoryTime = 0;
    if (!pageId.isEmpty()) {
        const qint64 now = QDateTime::currentSecsSinceEpoch();
        if (!m_pageHistoryCooldown.contains(pageId) || now - m_pageHistoryCooldown.value(pageId) >= 60) {
            nextHistoryTime = now;
            char *hid = synapse_notes_record_history(
                m_db,
                targetBytes.constData(),
                contentBytes.constData(),
                encBytes.isEmpty() ? nullptr : encBytes.constData()
            );
            if (!hid) return false;
            synapse_free_string(hid);
        }
    }

    if (nextHistoryTime > 0) m_pageHistoryCooldown[pageId] = nextHistoryTime;
    refreshStats();
    return true;
}

QVariantList SynapseDataController::getPageHistory(const QString &pageId) {
    if (!m_db || pageId.trimmed().isEmpty()) return {};
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    char *raw = synapse_notes_get_history(m_db, idBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    if (!doc.isArray()) return {};
    QVariantList history;
    const QString notesKey = m_isVaultConfigured && m_isVaultUnlocked ? m_unlockedKeys.value("notes") : QString();
    for (const QJsonValue &row : doc.array()) {
        QJsonObject revision = row.toObject();
        const QString encrypted = revision.value("encrypted_content").toString();
        if (!encrypted.isEmpty()) {
            const QString decrypted = decryptContent(notesKey, encrypted);
            if (decrypted.isNull()) {
                revision["content"] = QString();
                revision["decryption_error"] = true;
            } else {
                revision["content"] = decrypted;
            }
        }
        history.append(revision.toVariantMap());
    }
    return history;
}

bool SynapseDataController::restorePageRevision(const QString &pageId, const QString &revisionId) {
    if (!m_db || pageId.trimmed().isEmpty() || revisionId.trimmed().isEmpty()) return false;
    const QVariantList history = getPageHistory(pageId);
    QString content;
    bool found = false;
    for (const QVariant &item : history) {
        const QVariantMap rev = item.toMap();
        if (rev.value("id").toString() == revisionId) {
            if (rev.value("decryption_error").toBool()) return false;
            content = rev.value("content").toString();
            found = true;
            break;
        }
    }
    if (!found) return false;
    const QVariantMap page = getPage(pageId);
    return savePage(pageId, page.value("title").toString(), content, page.value("icon").toString());
}

QString SynapseDataController::createSubPage(const QString &parentId, const QString &title, const QString &icon) {
    if (!m_db) return {};
    const QByteArray pBytes = parentId.trimmed().toUtf8();
    const QByteArray tBytes = title.trimmed().toUtf8();
    const QByteArray iBytes = icon.trimmed().toUtf8();
    char *rawId = synapse_notes_create_subpage(
        m_db,
        parentId.trimmed().isEmpty() ? nullptr : pBytes.constData(),
        tBytes.constData(),
        icon.trimmed().isEmpty() ? nullptr : iBytes.constData()
    );
    if (!rawId) return {};
    const QString id = QString::fromUtf8(rawId);
    synapse_free_string(rawId);
    refreshStats();
    return id;
}

bool SynapseDataController::deletePage(const QString &pageId) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    const bool deleted = synapse_notes_delete_page(m_db, idBytes.constData()) == 1;
    if (deleted) refreshStats();
    return deleted;
}

bool SynapseDataController::togglePinPage(const QString &pageId) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    return synapse_notes_toggle_pin(m_db, idBytes.constData()) == 1;
}

bool SynapseDataController::renamePage(const QString &pageId, const QString &newTitle) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    const QByteArray tBytes = newTitle.trimmed().toUtf8();
    return synapse_notes_rename_page(m_db, idBytes.constData(), tBytes.constData()) == 1;
}

bool SynapseDataController::updatePageIcon(const QString &pageId, const QString &newIcon) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    const QByteArray iBytes = newIcon.trimmed().toUtf8();
    return synapse_notes_update_icon(m_db, idBytes.constData(), iBytes.constData()) == 1;
}

bool SynapseDataController::updatePageDescription(const QString &pageId, const QString &description) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    const QByteArray dBytes = description.trimmed().toUtf8();
    return synapse_notes_update_description(m_db, idBytes.constData(), dBytes.constData()) == 1;
}

bool SynapseDataController::updatePageCover(const QString &pageId, const QString &coverImage) {
    if (!m_db || pageId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = pageId.trimmed().toUtf8();
    const QByteArray cBytes = coverImage.trimmed().toUtf8();
    return synapse_notes_update_cover(
        m_db,
        idBytes.constData(),
        coverImage.trimmed().isEmpty() ? nullptr : cBytes.constData()
    ) == 1;
}

QString SynapseDataController::createRandomPageCoverUrl() const {
    const QString seed = QString::number(QRandomGenerator::global()->generate64(), 36);
    return QStringLiteral("https://picsum.photos/seed/%1/1600/400").arg(seed);
}

QVariantList SynapseDataController::parseNoteBlocks(const QString &html) {
    const QByteArray htmlBytes = html.toUtf8();
    char *raw = synapse_notes_parse_blocks(htmlBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}

QString SynapseDataController::serializeNoteBlocks(const QVariantList &blocks) {
    const QJsonDocument doc(QJsonArray::fromVariantList(blocks));
    const QByteArray jsonBytes = doc.toJson(QJsonDocument::Compact);
    char *raw = synapse_notes_serialize_blocks(jsonBytes.constData());
    if (!raw) return {};
    const QString html = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return html;
}

QVariantMap SynapseDataController::applyNoteSearchReplace(const QString &original, const QString &aiResponse) {
    const QByteArray origBytes = original.toUtf8();
    const QByteArray aiBytes = aiResponse.toUtf8();
    char *raw = synapse_notes_apply_search_replace(origBytes.constData(), aiBytes.constData());
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isObject() ? doc.object().toVariantMap() : QVariantMap();
}

QString SynapseDataController::computeNoteWordDiffHtml(const QString &oldText, const QString &newText) {
    const QByteArray oldBytes = oldText.toUtf8();
    const QByteArray newBytes = newText.toUtf8();
    char *raw = synapse_notes_compute_word_diff_html(oldBytes.constData(), newBytes.constData());
    if (!raw) return {};
    const QString diff = QString::fromUtf8(raw);
    synapse_free_string(raw);
    return diff;
}

QVariantList SynapseDataController::findDuplicateNoteLinks(const QString &url, const QString &excludePageId) {
    if (!m_db || url.trimmed().isEmpty()) return {};
    const QByteArray urlBytes = url.trimmed().toUtf8();
    const QByteArray exclBytes = excludePageId.trimmed().toUtf8();
    char *raw = synapse_notes_find_duplicate_links(
        m_db,
        urlBytes.constData(),
        excludePageId.trimmed().isEmpty() ? nullptr : exclBytes.constData()
    );
    if (!raw) return {};
    const QByteArray json(raw);
    synapse_free_string(raw);
    const QJsonDocument doc = QJsonDocument::fromJson(json);
    return doc.isArray() ? doc.array().toVariantList() : QVariantList();
}
