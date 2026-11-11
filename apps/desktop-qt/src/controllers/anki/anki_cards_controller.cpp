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

// Native Anki card scheduling and review persistence.

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

