#include "synapse_controller.h"
#include <QtCore/QFile>
#include <QtCore/QDir>
#include <QtCore/QStandardPaths>
#include <QtCore/QDebug>
#include <QtGui/QGuiApplication>
#include <QtGui/QClipboard>

SynapseDataController::SynapseDataController(QObject *parent)
    : QObject(parent),
      m_db(nullptr),
      m_pageCount(0),
      m_videoCount(0),
      m_deckCount(0),
      m_bookCount(0),
      m_cultureCount(0),
      m_vaultItemCount(0),
      m_transactionCount(0),
      m_eventCount(0),
      m_habitCount(0),
      m_quizBatteryCount(0),
      m_focusSessionCount(0) {
    
    // Automatically locate user's canonical Caderno SQLite database
    QString home = QDir::homePath();
    QString canonicalTauriPath = home + "/.local/share/com.caderno.app/caderno.sqlite";
    QString legacyPath = home + "/.local/share/caderno/caderno.sqlite";
    QString defaultQtPath = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) + "/caderno.sqlite";

    if (QFile::exists(canonicalTauriPath)) {
        openDatabase(canonicalTauriPath);
    } else if (QFile::exists(legacyPath)) {
        openDatabase(legacyPath);
    } else {
        openDatabase(defaultQtPath);
    }
}

SynapseDataController::~SynapseDataController() {
    if (m_db) {
        synapse_db_close(m_db);
        m_db = nullptr;
    }
}

bool SynapseDataController::openDatabase(const QString &path) {
    if (m_db) {
        synapse_db_close(m_db);
        m_db = nullptr;
    }

    QDir().mkpath(QFileInfo(path).absolutePath());
    m_dbPath = path;
    qInfo() << "[SynapseDataController] Connecting to database:" << m_dbPath;

    m_db = synapse_db_open(m_dbPath.toUtf8().constData());
    if (!m_db) {
        qWarning() << "[SynapseDataController] Error opening database!";
        return false;
    }

    emit dbPathChanged();
    refreshStats();
    return true;
}

QString SynapseDataController::escapeSql(const QString &str) const {
    QString res = str;
    res.replace("'", "''");
    return res;
}

QString SynapseDataController::generateUuid() const {
    return QUuid::createUuid().toString(QUuid::WithoutBraces);
}

QString SynapseDataController::currentTimestamp() const {
    return QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs);
}

QJsonArray SynapseDataController::executeQuery(const QString &sql) {
    if (!m_db) return QJsonArray();

    char *jsonRaw = synapse_db_query_json(m_db, sql.toUtf8().constData());
    if (!jsonRaw) return QJsonArray();

    QByteArray bytes(jsonRaw);
    synapse_free_string(jsonRaw);

    QJsonDocument doc = QJsonDocument::fromJson(bytes);
    return doc.isArray() ? doc.array() : QJsonArray();
}

bool SynapseDataController::executeSql(const QString &sql) {
    if (!m_db) return false;
    int res = synapse_db_execute(m_db, sql.toUtf8().constData());
    if (res != 0) {
        qWarning() << "[SynapseDataController] Execute failed for SQL:" << sql;
        return false;
    }
    return true;
}

void SynapseDataController::refreshStats() {
    if (!m_db) return;

    auto getCount = [this](const QString &table) -> int {
        QString sql = QString("SELECT count(*) as count FROM %1 WHERE deleted_at IS NULL").arg(table);
        QJsonArray arr = executeQuery(sql);
        if (!arr.isEmpty()) {
            return arr[0].toObject().value("count").toInt();
        }
        return 0;
    };

    m_pageCount = getCount("pages");
    m_videoCount = getCount("videos");
    m_deckCount = getCount("anki_decks");
    m_bookCount = getCount("library_books");
    m_cultureCount = getCount("culture_items");
    m_vaultItemCount = getCount("vault_items");
    m_transactionCount = getCount("transactions");
    m_eventCount = getCount("calendar_events");
    m_habitCount = getCount("habits");
    m_quizBatteryCount = getCount("quiz_batteries");
    m_focusSessionCount = getCount("focus_sessions");

    qInfo() << "[SynapseDataController] Stats updated -> Pages:" << m_pageCount
            << "| Videos:" << m_videoCount
            << "| Decks:" << m_deckCount
            << "| Books:" << m_bookCount
            << "| Culture:" << m_cultureCount
            << "| Vault:" << m_vaultItemCount
            << "| Transactions:" << m_transactionCount
            << "| Batteries:" << m_quizBatteryCount
            << "| FocusSessions:" << m_focusSessionCount;
    emit countsChanged();
}

// ---------------------------------------------------------------------------
// 1. Pages / Editor (Hierarchical & Pinned Support)
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getPages(const QString &filter) {
    QString sql = "SELECT id, title, icon, parent_id, updated_at, sort_order, is_pinned, pinned_order FROM pages WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) {
        sql += QString("AND title LIKE '%%1%' ").arg(escapeSql(filter));
    }
    sql += "ORDER BY updated_at DESC LIMIT 150";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getPinnedPages() {
    QString sql = "SELECT id, parent_id, title, icon, is_pinned, pinned_order, updated_at FROM pages "
                  "WHERE deleted_at IS NULL AND is_pinned = 1 ORDER BY pinned_order ASC, updated_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getPageTree(const QString &filter) {
    QString sql = "SELECT id, parent_id, title, icon, is_pinned, pinned_order, updated_at FROM pages WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) {
        sql += QString("AND title LIKE '%%1%' ").arg(escapeSql(filter));
    }
    sql += "ORDER BY updated_at DESC";
    QJsonArray rows = executeQuery(sql);

    QMap<QString, QList<QJsonObject>> parentToChildren;
    QList<QJsonObject> rootItems;
    QSet<QString> allIds;

    for (int i = 0; i < rows.size(); ++i) {
        QJsonObject obj = rows[i].toObject();
        allIds.insert(obj["id"].toString());
    }

    for (int i = 0; i < rows.size(); ++i) {
        QJsonObject obj = rows[i].toObject();
        QString pid = obj["parent_id"].toString();
        if (pid.isEmpty() || pid == "null" || !allIds.contains(pid)) {
            rootItems.append(obj);
        } else {
            parentToChildren[pid].append(obj);
        }
    }

    QVariantList result;
    std::function<void(const QJsonObject&, int)> addNode = [&](const QJsonObject &node, int depth) {
        QJsonObject enriched = node;
        QString nid = node["id"].toString();
        QList<QJsonObject> children = parentToChildren.value(nid);
        enriched["depth"] = depth;
        enriched["has_children"] = !children.isEmpty();
        enriched["children_count"] = children.size();
        result.append(enriched.toVariantMap());

        for (const QJsonObject &child : children) {
            addNode(child, depth + 1);
        }
    };

    for (const QJsonObject &root : rootItems) {
        addNode(root, 0);
    }

    return result;
}

QVariantMap SynapseDataController::getPage(const QString &pageId) {
    QString sql = QString("SELECT id, title, content, icon, parent_id, is_pinned, pinned_order, updated_at FROM pages WHERE id = '%1'").arg(escapeSql(pageId));
    QJsonArray arr = executeQuery(sql);
    if (!arr.isEmpty()) {
        return arr[0].toObject().toVariantMap();
    }
    return QVariantMap();
}

bool SynapseDataController::savePage(const QString &pageId, const QString &title, const QString &content, const QString &icon) {
    QString ts = currentTimestamp();
    QString sql;
    if (pageId.isEmpty()) {
        QString newId = generateUuid();
        sql = QString("INSERT INTO pages (id, title, content, icon, created_at, updated_at, sort_order, is_pinned, pinned_order) VALUES ('%1', '%2', '%3', '%4', '%5', '%6', 0, 0, 0.0)")
            .arg(newId, escapeSql(title), escapeSql(content), escapeSql(icon), ts, ts);
    } else {
        sql = QString("UPDATE pages SET title = '%1', content = '%2', icon = '%3', updated_at = '%4' WHERE id = '%5'")
            .arg(escapeSql(title), escapeSql(content), escapeSql(icon), ts, escapeSql(pageId));
    }
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QString SynapseDataController::createSubPage(const QString &parentId, const QString &title, const QString &icon) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString pidVal = parentId.trimmed().isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(parentId));
    QString sql = QString("INSERT INTO pages (id, parent_id, title, content, icon, created_at, updated_at, sort_order, is_pinned, pinned_order) "
                          "VALUES ('%1', %2, '%3', '', '%4', '%5', '%6', 0, 0, 0.0);")
        .arg(id, pidVal, escapeSql(title), escapeSql(icon), ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok ? id : "";
}

bool SynapseDataController::deletePage(const QString &pageId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE pages SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(pageId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::togglePinPage(const QString &pageId) {
    QString fetchSql = QString("SELECT is_pinned FROM pages WHERE id = '%1'").arg(escapeSql(pageId));
    QJsonArray arr = executeQuery(fetchSql);
    if (arr.isEmpty()) return false;
    int isPinned = arr[0].toObject()["is_pinned"].toInt();
    int newPinned = (isPinned == 1) ? 0 : 1;
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE pages SET is_pinned = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(newPinned).arg(ts, escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::movePage(const QString &pageId, const QString &newParentId) {
    if (pageId == newParentId) return false;
    QString pidVal = newParentId.trimmed().isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(newParentId));
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE pages SET parent_id = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(pidVal, ts, escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::renamePage(const QString &pageId, const QString &newTitle) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE pages SET title = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(escapeSql(newTitle), ts, escapeSql(pageId));
    return executeSql(sql);
}

bool SynapseDataController::updatePageIcon(const QString &pageId, const QString &newIcon) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE pages SET icon = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(escapeSql(newIcon), ts, escapeSql(pageId));
    return executeSql(sql);
}

// ---------------------------------------------------------------------------
// 2. Videos / Media Center
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getVideos(const QString &collectionFilter) {
    QString sql = "SELECT id, title, duration, file_path, progress, is_local, collection_name "
                  "FROM videos WHERE deleted_at IS NULL ";
    if (!collectionFilter.trimmed().isEmpty() && collectionFilter != "Todos") {
        sql += QString("AND collection_name = '%1' ").arg(escapeSql(collectionFilter));
    }
    sql += "ORDER BY updated_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getVideoCollections() {
    QString sql = "SELECT DISTINCT collection_name FROM videos WHERE deleted_at IS NULL AND collection_name IS NOT NULL AND collection_name != '' ORDER BY collection_name ASC";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::updateVideoProgress(const QString &videoId, double progress) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE videos SET progress = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(progress).arg(ts, escapeSql(videoId));
    return executeSql(sql);
}

bool SynapseDataController::deleteVideo(const QString &videoId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE videos SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(videoId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QVariantList SynapseDataController::getVideoWords(const QString &videoId) {
    QString sql = QString("SELECT id, video_id, word, context, timestamp "
                          "FROM video_words WHERE video_id = '%1' AND deleted_at IS NULL "
                          "ORDER BY timestamp ASC").arg(escapeSql(videoId));
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::addVideoWord(const QString &videoId, const QString &word, const QString &context, double timestamp) {
    QString id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO video_words (id, video_id, word, context, timestamp, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%6')")
        .arg(id, escapeSql(videoId), escapeSql(word), escapeSql(context))
        .arg(timestamp).arg(ts);
    return executeSql(sql);
}

bool SynapseDataController::deleteVideoWord(const QString &wordId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE video_words SET deleted_at = '%1' WHERE id = '%2'")
        .arg(ts, escapeSql(wordId));
    return executeSql(sql);
}

// ---------------------------------------------------------------------------
// 3. Anki & Flashcards (Hierarchical Tree & FSRS v5)
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getDecks() {
    QString sql = "SELECT d.id, d.name, d.description, d.color, d.parent_id, "
                  "(SELECT count(*) FROM anki_cards c WHERE c.deck_id = d.id AND c.deleted_at IS NULL) as card_count "
                  "FROM anki_decks d WHERE d.deleted_at IS NULL ORDER BY d.name ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getHierarchicalDecks() {
    QString sql = "SELECT id, name, description, color, parent_id FROM anki_decks WHERE deleted_at IS NULL ORDER BY name ASC";
    QJsonArray rows = executeQuery(sql);

    // Compute stats for all decks
    QString statsSql = "SELECT c.deck_id, "
                       "count(*) as total_cards, "
                       "SUM(CASE WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 1 ELSE 0 END) as novos, "
                       "SUM(CASE WHEN s.state IN ('learning', 'relearning') THEN 1 ELSE 0 END) as aprender, "
                       "SUM(CASE WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 1 ELSE 0 END) as revisar "
                       "FROM anki_cards c "
                       "LEFT JOIN anki_srs_state s ON c.id = s.id "
                       "WHERE c.deleted_at IS NULL "
                       "GROUP BY c.deck_id";
    QJsonArray statsRows = executeQuery(statsSql);
    QMap<QString, QJsonObject> statsMap;
    for (int i = 0; i < statsRows.size(); ++i) {
        QJsonObject o = statsRows[i].toObject();
        statsMap[o["deck_id"].toString()] = o;
    }

    QMap<QString, QList<QJsonObject>> parentToChildren;
    QList<QJsonObject> rootItems;
    QSet<QString> allIds;

    for (int i = 0; i < rows.size(); ++i) {
        QJsonObject obj = rows[i].toObject();
        allIds.insert(obj["id"].toString());
    }

    for (int i = 0; i < rows.size(); ++i) {
        QJsonObject obj = rows[i].toObject();
        QString pid = obj["parent_id"].toString();
        if (pid.isEmpty() || pid == "null" || !allIds.contains(pid)) {
            rootItems.append(obj);
        } else {
            parentToChildren[pid].append(obj);
        }
    }

    QVariantList result;
    std::function<void(const QJsonObject&, int)> addDeck = [&](const QJsonObject &deck, int depth) {
        QJsonObject enriched = deck;
        QString did = deck["id"].toString();
        QList<QJsonObject> children = parentToChildren.value(did);
        enriched["depth"] = depth;
        enriched["has_children"] = !children.isEmpty();
        enriched["children_count"] = children.size();

        QJsonObject st = statsMap.value(did);
        enriched["card_count"] = st["total_cards"].toInt();
        enriched["novos"] = st["novos"].toInt();
        enriched["aprender"] = st["aprender"].toInt();
        enriched["revisar"] = st["revisar"].toInt();

        result.append(enriched.toVariantMap());

        for (const QJsonObject &child : children) {
            addDeck(child, depth + 1);
        }
    };

    for (const QJsonObject &root : rootItems) {
        addDeck(root, 0);
    }

    return result;
}

QVariantMap SynapseDataController::getDeckStats(const QString &deckId) {
    QString allDecksSql = "SELECT id, parent_id FROM anki_decks WHERE deleted_at IS NULL";
    QJsonArray deckRows = executeQuery(allDecksSql);
    QMap<QString, QStringList> childrenMap;
    for (int i = 0; i < deckRows.size(); ++i) {
        QJsonObject o = deckRows[i].toObject();
        QString pid = o["parent_id"].toString();
        if (!pid.isEmpty()) childrenMap[pid].append(o["id"].toString());
    }

    QStringList targetDeckIds;
    std::function<void(const QString&)> collectDecks = [&](const QString &did) {
        targetDeckIds.append(did);
        for (const QString &cid : childrenMap.value(did)) {
            collectDecks(cid);
        }
    };
    collectDecks(deckId);

    QString idList;
    for (int i = 0; i < targetDeckIds.size(); ++i) {
        if (i > 0) idList += ",";
        idList += QString("'%1'").arg(escapeSql(targetDeckIds[i]));
    }

    QString sql = QString(
        "SELECT count(*) as total, "
        "SUM(CASE WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 1 ELSE 0 END) as novos, "
        "SUM(CASE WHEN s.state IN ('learning', 'relearning') THEN 1 ELSE 0 END) as aprender, "
        "SUM(CASE WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 1 ELSE 0 END) as revisar "
        "FROM anki_cards c "
        "LEFT JOIN anki_srs_state s ON c.id = s.id "
        "WHERE c.deck_id IN (%1) AND c.deleted_at IS NULL"
    ).arg(idList.isEmpty() ? "''" : idList);

    QJsonArray arr = executeQuery(sql);
    if (!arr.isEmpty()) return arr[0].toObject().toVariantMap();
    return QVariantMap();
}

QVariantMap SynapseDataController::getGlobalAnkiStats() {
    QVariantMap res;
    QJsonArray totalArr = executeQuery("SELECT count(*) as total FROM anki_cards WHERE deleted_at IS NULL");
    int totalCards = totalArr.isEmpty() ? 0 : totalArr[0].toObject()["total"].toInt();

    QJsonArray srsArr = executeQuery(
        "SELECT "
        "SUM(CASE WHEN reps = 0 OR state = 'new' THEN 1 ELSE 0 END) as novos, "
        "SUM(CASE WHEN state IN ('learning', 'relearning') THEN 1 ELSE 0 END) as aprendendo, "
        "SUM(CASE WHEN state = 'review' AND stability >= 21.0 THEN 1 ELSE 0 END) as maduros, "
        "SUM(CASE WHEN state = 'review' AND stability < 21.0 THEN 1 ELSE 0 END) as jovens, "
        "AVG(stability) as avg_stability, "
        "AVG(difficulty) as avg_difficulty "
        "FROM anki_srs_state WHERE deleted_at IS NULL"
    );

    QJsonArray revArr = executeQuery(
        "SELECT count(*) as total_reviews, "
        "SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as errei, "
        "SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as dificil, "
        "SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as bom, "
        "SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as facil "
        "FROM anki_reviews"
    );

    res["total_cards"] = totalCards;
    if (!srsArr.isEmpty()) {
        QJsonObject o = srsArr[0].toObject();
        res["novos"] = o["novos"].toInt();
        res["aprendendo"] = o["aprendendo"].toInt();
        res["maduros"] = o["maduros"].toInt();
        res["jovens"] = o["jovens"].toInt();
        res["avg_stability"] = o["avg_stability"].toDouble();
        res["avg_difficulty"] = o["avg_difficulty"].toDouble();
    }
    if (!revArr.isEmpty()) {
        QJsonObject r = revArr[0].toObject();
        int totalRev = r["total_reviews"].toInt();
        res["total_reviews"] = totalRev;
        res["errei"] = r["errei"].toInt();
        res["dificil"] = r["dificil"].toInt();
        res["bom"] = r["bom"].toInt();
        res["facil"] = r["facil"].toInt();
        int successRev = r["bom"].toInt() + r["facil"].toInt();
        res["retention_rate"] = totalRev > 0 ? (double)(successRev * 100) / totalRev : 90.0;
    } else {
        res["total_reviews"] = 0;
        res["retention_rate"] = 90.0;
    }
    return res;
}

bool SynapseDataController::createDeck(const QString &name, const QString &description, const QString &color, const QString &parentId) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString pidVal = parentId.trimmed().isEmpty() ? "NULL" : QString("'%1'").arg(escapeSql(parentId));
    QString sql = QString("INSERT INTO anki_decks (id, name, description, color, parent_id, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%7')")
        .arg(id, escapeSql(name), escapeSql(description), escapeSql(color), pidVal, ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::updateDeck(const QString &deckId, const QString &name, const QString &description, const QString &color) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE anki_decks SET name = '%1', description = '%2', color = '%3', updated_at = '%4' WHERE id = '%5'")
        .arg(escapeSql(name), escapeSql(description), escapeSql(color), ts, escapeSql(deckId));
    return executeSql(sql);
}

bool SynapseDataController::deleteDeck(const QString &deckId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE anki_decks SET deleted_at = '%1' WHERE id = '%2' OR parent_id = '%2'")
        .arg(ts, escapeSql(deckId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QVariantList SynapseDataController::getDeckCards(const QString &deckId) {
    QString sql = QString("SELECT c.id, c.deck_id, c.front, c.back, c.tags, c.card_type, "
                          "c.validation_mode, c.extra_note, c.media_url, "
                          "COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, "
                          "COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, "
                          "COALESCE(s.state, 'new') as state, s.due_date "
                          "FROM anki_cards c LEFT JOIN anki_srs_state s ON c.id = s.id "
                          "WHERE c.deck_id = '%1' AND c.deleted_at IS NULL ORDER BY c.created_at ASC")
        .arg(escapeSql(deckId));
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getDueCards(const QString &deckId) {
    QString allDecksSql = "SELECT id, parent_id FROM anki_decks WHERE deleted_at IS NULL";
    QJsonArray deckRows = executeQuery(allDecksSql);
    QMap<QString, QStringList> childrenMap;
    for (int i = 0; i < deckRows.size(); ++i) {
        QJsonObject o = deckRows[i].toObject();
        QString pid = o["parent_id"].toString();
        if (!pid.isEmpty()) childrenMap[pid].append(o["id"].toString());
    }

    QStringList targetDeckIds;
    std::function<void(const QString&)> collectDecks = [&](const QString &did) {
        targetDeckIds.append(did);
        for (const QString &cid : childrenMap.value(did)) {
            collectDecks(cid);
        }
    };
    collectDecks(deckId);

    QString idList;
    for (int i = 0; i < targetDeckIds.size(); ++i) {
        if (i > 0) idList += ",";
        idList += QString("'%1'").arg(escapeSql(targetDeckIds[i]));
    }

    QString sql = QString(
        "SELECT c.id, c.deck_id, c.front, c.back, c.tags, c.card_type, "
        "c.validation_mode, c.extra_note, c.media_url, "
        "COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, "
        "COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, "
        "COALESCE(s.state, 'new') as state, s.due_date "
        "FROM anki_cards c "
        "LEFT JOIN anki_srs_state s ON c.id = s.id "
        "WHERE c.deck_id IN (%1) AND c.deleted_at IS NULL "
        "ORDER BY CASE "
        "  WHEN s.state IN ('learning', 'relearning') THEN 1 "
        "  WHEN s.state = 'review' AND datetime(s.due_date) <= datetime('now') THEN 2 "
        "  WHEN COALESCE(s.state, 'new') = 'new' OR COALESCE(s.reps, 0) = 0 THEN 3 "
        "  ELSE 4 END ASC, c.created_at ASC"
    ).arg(idList.isEmpty() ? "''" : idList);

    QVariantList list = executeQuery(sql).toVariantList();
    // If no due cards in current schedule, provide all cards in the deck for practice study
    if (list.isEmpty()) {
        QString fallbackSql = QString("SELECT c.id, c.deck_id, c.front, c.back, c.tags, c.card_type, "
                                      "c.validation_mode, c.extra_note, c.media_url, "
                                      "COALESCE(s.stability, 0) as stability, COALESCE(s.difficulty, 0) as difficulty, "
                                      "COALESCE(s.reps, 0) as reps, COALESCE(s.lapses, 0) as lapses, "
                                      "COALESCE(s.state, 'new') as state, s.due_date "
                                      "FROM anki_cards c LEFT JOIN anki_srs_state s ON c.id = s.id "
                                      "WHERE c.deck_id IN (%1) AND c.deleted_at IS NULL ORDER BY c.created_at ASC")
            .arg(idList.isEmpty() ? "''" : idList);
        list = executeQuery(fallbackSql).toVariantList();
    }
    return list;
}

bool SynapseDataController::createCard(const QString &deckId, const QString &front, const QString &back, const QString &tags) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString cardSql = QString("INSERT INTO anki_cards (id, deck_id, front, back, tags, card_type, validation_mode, created_at, updated_at) "
                              "VALUES ('%1', '%2', '%3', '%4', '%5', 'basic', 'default', '%6', '%7');")
        .arg(id, escapeSql(deckId), escapeSql(front), escapeSql(back), escapeSql(tags), ts, ts);
    
    QString srsSql = QString("INSERT INTO anki_srs_state (id, due_date, stability, difficulty, elapsed_days, reps, lapses, state, scheduled_days, created_at, updated_at) "
                             "VALUES ('%1', '%2', 0.0, 0.0, 0, 0, 0, 'new', 0, '%3', '%4');")
        .arg(id, ts, ts, ts);

    bool ok = executeSql(cardSql + srsSql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::updateCard(const QString &cardId, const QString &front, const QString &back, const QString &tags) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE anki_cards SET front = '%1', back = '%2', tags = '%3', updated_at = '%4' WHERE id = '%5'")
        .arg(escapeSql(front), escapeSql(back), escapeSql(tags), ts, escapeSql(cardId));
    return executeSql(sql);
}

bool SynapseDataController::deleteCard(const QString &cardId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE anki_cards SET deleted_at = '%1' WHERE id = '%2'; "
                          "UPDATE anki_srs_state SET deleted_at = '%1' WHERE id = '%2';")
        .arg(ts, escapeSql(cardId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::recordCardReview(const QString &cardId, int rating) {
    // 1. Fetch current SRS state
    QString fetchSql = QString("SELECT stability, difficulty, reps, lapses, elapsed_days FROM anki_srs_state WHERE id = '%1'").arg(escapeSql(cardId));
    QJsonArray arr = executeQuery(fetchSql);

    double curStability = 0.0;
    double curDifficulty = 0.0;
    int curReps = 0;
    int curLapses = 0;
    int elapsedDays = 0;

    if (!arr.isEmpty()) {
        QJsonObject obj = arr[0].toObject();
        curStability = obj.value("stability").toDouble();
        curDifficulty = obj.value("difficulty").toDouble();
        curReps = obj.value("reps").toInt();
        curLapses = obj.value("lapses").toInt();
        elapsedDays = obj.value("elapsed_days").toInt();
    }

    double outStability = 0.0;
    double outDifficulty = 0.0;
    int outScheduledDays = 0;

    int res = synapse_fsrs_calculate(
        curStability, curDifficulty, curReps, curLapses, rating, elapsedDays,
        &outStability, &outDifficulty, &outScheduledDays
    );

    if (res != 0) return false;

    QString ts = currentTimestamp();
    QDateTime dueDate = QDateTime::currentDateTimeUtc().addDays(outScheduledDays > 0 ? outScheduledDays : 1);
    QString dueDateStr = dueDate.toString(Qt::ISODateWithMs);

    int newReps = (rating == 1) ? 0 : (curReps + 1);
    int newLapses = (rating == 1) ? (curLapses + 1) : curLapses;
    QString state = (curReps == 0) ? "learning" : "review";

    QString updateSrsSql = QString("UPDATE anki_srs_state SET stability = %1, difficulty = %2, reps = %3, lapses = %4, "
                                   "scheduled_days = %5, state = '%6', due_date = '%7', last_review = '%8', updated_at = '%9' WHERE id = '%10';")
        .arg(outStability).arg(outDifficulty).arg(newReps).arg(newLapses).arg(outScheduledDays)
        .arg(state, dueDateStr, ts, ts, escapeSql(cardId));

    QString reviewId = generateUuid();
    QString insertReviewSql = QString("INSERT INTO anki_reviews (id, card_id, rating, duration, review_time, created_at) "
                                      "VALUES ('%1', '%2', %3, 5000, '%4', '%5');")
        .arg(reviewId, escapeSql(cardId)).arg(rating).arg(ts, ts);

    return executeSql(updateSrsSql + insertReviewSql);
}

// ---------------------------------------------------------------------------
// 4. Baterias de Questões & Simulado Zen
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getQuizBatteries() {
    QString sql = "SELECT b.id, b.title, b.description, "
                  "(SELECT count(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL) as question_count "
                  "FROM quiz_batteries b WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getBatteryQuestions(const QString &batteryId) {
    QString sql = QString("SELECT id, battery_id, question, options, correct_index, explanation, sort_order "
                          "FROM quiz_questions WHERE battery_id = '%1' AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC")
        .arg(escapeSql(batteryId));
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::createQuizBattery(const QString &title, const QString &description) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO quiz_batteries (id, title, description, layout, sort_order, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', 'zen', 0, '%4', '%5')")
        .arg(id, escapeSql(title), escapeSql(description), ts, ts);
    return executeSql(sql);
}

bool SynapseDataController::createQuizQuestion(const QString &batteryId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO quiz_questions (id, battery_id, type, question, options, correct_index, explanation, sort_order, created_at, updated_at) "
                          "VALUES ('%1', '%2', 'multiple_choice', '%3', '%4', %5, '%6', 0, '%7', '%8')")
        .arg(id, escapeSql(batteryId), escapeSql(question), escapeSql(optionsJson)).arg(correctIndex).arg(escapeSql(explanation), ts, ts);
    return executeSql(sql);
}

bool SynapseDataController::recordQuizAttempt(const QString &batteryId, const QString &questionId, int selectedIndex, bool isCorrect) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO quiz_attempts (id, question_id, battery_id, type, selected_index, is_correct, created_at) "
                          "VALUES ('%1', '%2', '%3', 'multiple_choice', %4, %5, '%6')")
        .arg(id, escapeSql(questionId), escapeSql(batteryId)).arg(selectedIndex).arg(isCorrect ? 1 : 0).arg(ts);
    return executeSql(sql);
}

// ---------------------------------------------------------------------------
// 5. Finanças & Wishlist
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getTransactions(const QString &typeFilter) {
    QString sql = "SELECT id, description, amount, type, category, date, status, account_id FROM transactions WHERE deleted_at IS NULL ";
    if (!typeFilter.isEmpty()) {
        sql += QString("AND type = '%1' ").arg(escapeSql(typeFilter));
    }
    sql += "ORDER BY date DESC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getAccounts() {
    QString sql = "SELECT id, name, color, icon, initial_balance FROM finance_accounts WHERE deleted_at IS NULL ORDER BY name ASC";
    return executeQuery(sql).toVariantList();
}

QVariantMap SynapseDataController::getFinancialSummary() {
    QVariantMap res;
    double income = 0.0;
    double expense = 0.0;

    QJsonArray arr = executeQuery("SELECT type, SUM(amount) as total FROM transactions WHERE deleted_at IS NULL GROUP BY type");
    for (const auto &val : arr) {
        QJsonObject obj = val.toObject();
        QString type = obj.value("type").toString();
        double total = obj.value("total").toDouble();
        if (type == "income") {
            income += total;
        } else if (type == "expense") {
            expense += total;
        }
    }

    res["income"] = income;
    res["expense"] = expense;
    res["balance"] = income - expense;
    return res;
}

bool SynapseDataController::addTransaction(const QString &description, double amount, const QString &type, const QString &category, const QString &date, const QString &accountId) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, created_at, updated_at) "
                          "VALUES ('%1', '%2', %3, '%4', '%5', '%6', 'completed', '%7', '%8', '%9')")
        .arg(id, escapeSql(description)).arg(amount).arg(escapeSql(type), escapeSql(category), escapeSql(date), escapeSql(accountId), ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteTransaction(const QString &txId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE transactions SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(txId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QVariantList SynapseDataController::getWishlist() {
    QString sql = "SELECT id, title, price, priority, category, link, description FROM wishlist WHERE deleted_at IS NULL ORDER BY price DESC";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::addWishlistItem(const QString &title, double price, const QString &priority, const QString &category, const QString &link) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO wishlist (id, title, price, priority, category, link, created_at, updated_at) "
                          "VALUES ('%1', '%2', %3, '%4', '%5', '%6', '%7', '%8')")
        .arg(id, escapeSql(title)).arg(price).arg(escapeSql(priority), escapeSql(category), escapeSql(link), ts, ts);
    return executeSql(sql);
}

bool SynapseDataController::deleteWishlistItem(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE wishlist SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(itemId));
    return executeSql(sql);
}

// ---------------------------------------------------------------------------
// 6. Hábitos & Rotina Diária
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getHabits() {
    QString sql = "SELECT id, title, color, icon, target_days_per_week FROM habits WHERE deleted_at IS NULL ORDER BY created_at ASC";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::createHabit(const QString &title, const QString &color, const QString &icon, int targetDays) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO habits (id, title, color, icon, target_days_per_week, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, '%6', '%7')")
        .arg(id, escapeSql(title), escapeSql(color), escapeSql(icon)).arg(targetDays).arg(ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QVariantList SynapseDataController::getHabitLogs(const QString &dateStr) {
    QString sql = QString("SELECT habit_id, completed_at FROM habit_logs WHERE date = '%1' AND deleted_at IS NULL")
        .arg(escapeSql(dateStr));
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getHabitLogsRange(const QString &startDate, const QString &endDate) {
    QString sql = QString("SELECT habit_id, date, completed_at FROM habit_logs WHERE date >= '%1' AND date <= '%2' AND deleted_at IS NULL")
        .arg(escapeSql(startDate), escapeSql(endDate));
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::toggleHabitCheckin(const QString &habitId, const QString &dateStr) {
    QString checkSql = QString("SELECT id FROM habit_logs WHERE habit_id = '%1' AND date = '%2' AND deleted_at IS NULL")
        .arg(escapeSql(habitId), escapeSql(dateStr));
    QJsonArray arr = executeQuery(checkSql);
    QString ts = currentTimestamp();

    if (!arr.isEmpty()) {
        // Toggle OFF (soft delete)
        QString logId = arr[0].toObject().value("id").toString();
        QString delSql = QString("UPDATE habit_logs SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(logId));
        return executeSql(delSql);
    } else {
        // Toggle ON (insert)
        QString newId = generateUuid();
        QString insSql = QString("INSERT INTO habit_logs (id, habit_id, date, completed_at, created_at, updated_at) "
                                 "VALUES ('%1', '%2', '%3', '%4', '%5', '%6')")
            .arg(newId, escapeSql(habitId), escapeSql(dateStr), ts, ts, ts);
        return executeSql(insSql);
    }
}

bool SynapseDataController::deleteHabit(const QString &habitId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE habits SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(habitId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

// ---------------------------------------------------------------------------
// 7. Calendário & Agenda
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getCalendarEvents() {
    QString sql = "SELECT id, title, description, start_date, end_date, type, status, color "
                  "FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::createCalendarEvent(const QString &title, const QString &description, const QString &startDate, const QString &endDate, const QString &type, const QString &color) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', '%5', '%6', 'pending', '%7', '%8', '%9')")
        .arg(id, escapeSql(title), escapeSql(description), escapeSql(startDate), escapeSql(endDate), escapeSql(type), escapeSql(color), ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::toggleEventStatus(const QString &eventId) {
    QString checkSql = QString("SELECT status FROM calendar_events WHERE id = '%1'").arg(escapeSql(eventId));
    QJsonArray arr = executeQuery(checkSql);
    if (arr.isEmpty()) return false;

    QString curStatus = arr[0].toObject().value("status").toString();
    QString newStatus = (curStatus == "completed") ? "pending" : "completed";
    QString ts = currentTimestamp();

    QString sql = QString("UPDATE calendar_events SET status = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(newStatus, ts, escapeSql(eventId));
    return executeSql(sql);
}

bool SynapseDataController::deleteCalendarEvent(const QString &eventId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE calendar_events SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(eventId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

// ---------------------------------------------------------------------------
// 8. Biblioteca & E-Reader
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getLibraryBooks(const QString &filter) {
    QString sql = "SELECT id, title, author, file_path, cover_color, cover_image, total_pages, current_page, reading_status "
                  "FROM library_books WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) {
        sql += QString("AND (title LIKE '%%1%' OR author LIKE '%%1%') ").arg(escapeSql(filter));
    }
    sql += "ORDER BY updated_at DESC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::updateBookProgress(const QString &bookId, int currentPage, int totalPages) {
    QString ts = currentTimestamp();
    QString status = (currentPage >= totalPages && totalPages > 0) ? "completed" : "reading";
    QString sql = QString("UPDATE library_books SET current_page = %1, total_pages = %2, reading_status = '%3', updated_at = '%4' WHERE id = '%5'")
        .arg(currentPage).arg(totalPages).arg(status, ts, escapeSql(bookId));
    return executeSql(sql);
}

bool SynapseDataController::createLibraryBook(const QString &title, const QString &author, int totalPages, const QString &coverColor) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString col = coverColor.trimmed().isEmpty() ? "#7c3aed" : coverColor;
    QString sql = QString("INSERT INTO library_books (id, title, author, total_pages, current_page, reading_status, cover_color, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', %4, 0, 'reading', '%5', '%6', '%6')")
                  .arg(id, escapeSql(title), escapeSql(author.trimmed().isEmpty() ? "Desconhecido" : author)).arg(totalPages).arg(escapeSql(col), ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteLibraryBook(const QString &bookId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE library_books SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(bookId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

// ---------------------------------------------------------------------------
// 9. Cultura & Entretenimento
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getCultureItems(const QString &statusFilter) {
    QString sql = "SELECT id, title, type, synopsis, cover_image, status, progress, total_episodes "
                  "FROM culture_items WHERE deleted_at IS NULL ";
    if (!statusFilter.isEmpty()) {
        sql += QString("AND status = '%1' ").arg(escapeSql(statusFilter));
    }
    sql += "ORDER BY updated_at DESC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::incrementCultureProgress(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET progress = progress + 1, updated_at = '%1' WHERE id = '%2'")
        .arg(ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::updateCultureProgress(const QString &itemId, int progress) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET progress = %1, updated_at = '%2' WHERE id = '%3'")
        .arg(progress).arg(ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::updateCultureStatus(const QString &itemId, const QString &status) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET status = '%1', updated_at = '%2' WHERE id = '%3'")
        .arg(escapeSql(status), ts, escapeSql(itemId));
    return executeSql(sql);
}

bool SynapseDataController::createCultureItem(const QString &title, const QString &type, const QString &synopsis, int totalEpisodes, const QString &coverImage) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO culture_items (id, title, type, synopsis, total_episodes, progress, status, cover_image, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', '%4', %5, 0, 'backlog', '%6', '%7', '%7')")
                  .arg(id, escapeSql(title), escapeSql(type), escapeSql(synopsis)).arg(totalEpisodes).arg(escapeSql(coverImage), ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteCultureItem(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE culture_items SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(itemId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

// ---------------------------------------------------------------------------
// 10. Foco Pomodoro & Lofi
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getLofis() {
    QString sql = "SELECT id, title, original_name, duration, file_path, is_local FROM lofis WHERE deleted_at IS NULL ORDER BY title ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getFocusSessions() {
    QString sql = "SELECT id, tag, description, target_time_minutes, status, summary, created_at "
                  "FROM focus_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::recordFocusSession(const QString &tag, int targetMinutes, const QString &status, const QString &summary) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, summary, created_at, updated_at) "
                          "VALUES ('%1', '%2', '', %3, '%4', '%5', '%6', '%7')")
        .arg(id, escapeSql(tag)).arg(targetMinutes).arg(escapeSql(status), escapeSql(summary), ts, ts);
    return executeSql(sql);
}

bool SynapseDataController::deleteFocusSession(const QString &sessionId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE focus_sessions SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(sessionId));
    return executeSql(sql);
}

// ---------------------------------------------------------------------------
// 11. Cofre E2EE & Credenciais
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getVaultGroups() {
    QString sql = "SELECT id, name, icon, color, position FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, name ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getVaultItems(const QString &groupId) {
    QString sql = "SELECT id, group_id, label, username, email, password, url, notes, is_favorite FROM vault_items WHERE deleted_at IS NULL ";
    if (!groupId.isEmpty()) {
        sql += QString("AND group_id = '%1' ").arg(escapeSql(groupId));
    }
    sql += "ORDER BY label ASC LIMIT 100";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::saveVaultItem(const QString &id, const QString &groupId, const QString &label, const QString &username, const QString &email, const QString &password, const QString &url, const QString &notes) {
    QString ts = currentTimestamp();
    QString sql;
    if (id.isEmpty()) {
        QString newId = generateUuid();
        sql = QString("INSERT INTO vault_items (id, group_id, label, username, email, password, url, notes, is_favorite, created_at, updated_at) "
                      "VALUES ('%1', '%2', '%3', '%4', '%5', '%6', '%7', '%8', 0, '%9', '%10')")
            .arg(newId, escapeSql(groupId), escapeSql(label), escapeSql(username), escapeSql(email), escapeSql(password), escapeSql(url), escapeSql(notes), ts, ts);
    } else {
        sql = QString("UPDATE vault_items SET group_id = '%1', label = '%2', username = '%3', email = '%4', password = '%5', url = '%6', notes = '%7', updated_at = '%8' WHERE id = '%9'")
            .arg(escapeSql(groupId), escapeSql(label), escapeSql(username), escapeSql(email), escapeSql(password), escapeSql(url), escapeSql(notes), ts, escapeSql(id));
    }
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteVaultItem(const QString &itemId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE vault_items SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(itemId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

QString SynapseDataController::generateSecurePassword(int length, bool symbols) {
    const QString letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const QString syms = "!@#$%^&*()-_=+[]{}<>?";
    QString pool = letters + (symbols ? syms : "");
    QString result;
    result.reserve(length);
    auto *rng = QRandomGenerator::global();
    for (int i = 0; i < length; ++i) {
        int idx = rng->bounded(pool.length());
        result.append(pool.at(idx));
    }
    return result;
}

void SynapseDataController::copyToClipboard(const QString &text) {
    QClipboard *cb = QGuiApplication::clipboard();
    if (cb) {
        cb->setText(text);
    }
}
