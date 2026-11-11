#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <cmath>
#include <functional>

// Native Anki deck hierarchy and statistics persistence.


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

bool SynapseDataController::resetDeckProgress(const QString &deckId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE anki_srs_state SET reps = 0, lapses = 0, stability = 0.0, difficulty = 0.0, "
                          "state = 'new', due_date = '%1' "
                          "WHERE id IN (SELECT id FROM anki_cards WHERE deck_id = '%2')")
        .arg(ts, escapeSql(deckId));
    return executeSql(sql);
}

