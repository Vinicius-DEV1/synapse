#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QSet>
#include <algorithm>
#include <cmath>
#include <functional>

// Native quiz battery and attempt persistence.


QVariantList SynapseDataController::getQuizBatteries() {
    QString sql = "SELECT b.id, b.title, b.description, "
                  "(SELECT count(*) FROM quiz_questions q WHERE q.battery_id = b.id AND q.deleted_at IS NULL) as question_count "
                  "FROM quiz_batteries b WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getBatteryQuestions(const QString &batteryId) {
    const QString sql = "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order "
                        "FROM quiz_questions WHERE battery_id = ? AND deleted_at IS NULL "
                        "ORDER BY sort_order ASC, created_at ASC, id ASC";
    return executeQueryPrepared(sql, {batteryId}).toVariantList();
}

QVariantList SynapseDataController::getAllQuizQuestions() {
    const QString sql = "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order "
                        "FROM quiz_questions q INNER JOIN quiz_batteries b ON b.id = q.battery_id "
                        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL "
                        "ORDER BY b.sort_order ASC, q.sort_order ASC, q.created_at ASC, q.id ASC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getAllQuizTags() {
    const QJsonArray rows = executeQuery(
        "SELECT q.tags FROM quiz_questions q INNER JOIN quiz_batteries b ON b.id = q.battery_id "
        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL");
    QSet<QString> seen;
    QStringList tags;

    for (const QJsonValue &row : rows) {
        const QJsonDocument document = QJsonDocument::fromJson(row.toObject().value("tags").toString().toUtf8());
        if (!document.isArray()) continue;
        for (const QJsonValue &tagValue : document.array()) {
            if (!tagValue.isString()) continue;
            const QString tag = tagValue.toString().trimmed();
            const QString normalized = tag.toCaseFolded();
            if (!tag.isEmpty() && !seen.contains(normalized)) {
                seen.insert(normalized);
                tags.append(tag);
            }
        }
    }

    std::sort(tags.begin(), tags.end(), [](const QString &left, const QString &right) {
        return left.compare(right, Qt::CaseInsensitive) < 0;
    });
    QVariantList result;
    for (const QString &tag : tags) result.append(tag);
    return result;
}

QVariantMap SynapseDataController::getQuizStats() {
    QVariantMap res;
    QJsonArray batArr = executeQuery("SELECT count(*) as total FROM quiz_batteries WHERE deleted_at IS NULL");
    int totalBatteries = batArr.isEmpty() ? 0 : batArr[0].toObject()["total"].toInt();

    QJsonArray qArr = executeQuery("SELECT count(*) as total FROM quiz_questions q "
                                   "INNER JOIN quiz_batteries b ON b.id = q.battery_id "
                                   "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL");
    int totalQuestions = qArr.isEmpty() ? 0 : qArr[0].toObject()["total"].toInt();

    QJsonArray attArr = executeQuery(
        "SELECT count(*) as total_attempts, "
        "SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_attempts FROM quiz_attempts");
    QJsonArray currentAttemptArr = executeQuery(
        "SELECT count(*) as answered_questions, "
        "SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_questions, "
        "SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_questions "
        "FROM quiz_questions q INNER JOIN quiz_batteries b ON b.id = q.battery_id "
        "INNER JOIN quiz_attempts a ON a.question_id = q.id "
        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL "
        "AND NOT EXISTS (SELECT 1 FROM quiz_attempts newer WHERE newer.question_id = a.question_id "
        "AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid)))"
    );
    QJsonArray reviewableMistakeArr = executeQuery(
        "SELECT count(DISTINCT q.id) as total FROM quiz_questions q "
        "INNER JOIN quiz_batteries b ON b.id = q.battery_id "
        "INNER JOIN quiz_attempts a ON a.question_id = q.id "
        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice' AND a.is_correct = 0 "
        "AND NOT EXISTS (SELECT 1 FROM quiz_attempts newer WHERE newer.question_id = a.question_id "
        "AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid)))"
    );

    int totalAttempts = 0;
    int historicalIncorrectAttempts = 0;
    int answeredQuestions = 0;
    int correctAttempts = 0;
    int incorrectAttempts = 0;
    int accuracyRate = 0;

    if (!attArr.isEmpty()) {
        totalAttempts = attArr[0].toObject()["total_attempts"].toInt();
        historicalIncorrectAttempts = attArr[0].toObject()["incorrect_attempts"].toInt();
    }
    if (!currentAttemptArr.isEmpty()) {
        const QJsonObject o = currentAttemptArr[0].toObject();
        answeredQuestions = o["answered_questions"].toInt();
        correctAttempts = o["correct_questions"].toInt();
        incorrectAttempts = o["incorrect_questions"].toInt();
        if (answeredQuestions > 0) accuracyRate = (correctAttempts * 100) / answeredQuestions;
    }

    res["total_batteries"] = totalBatteries;
    res["total_questions"] = totalQuestions;
    res["total_attempts"] = totalAttempts;
    res["answered_questions"] = answeredQuestions;
    res["correct_attempts"] = correctAttempts;
    res["incorrect_attempts"] = historicalIncorrectAttempts;
    res["incorrect_questions"] = incorrectAttempts;
    res["reviewable_incorrect_questions"] = reviewableMistakeArr.isEmpty()
        ? 0
        : reviewableMistakeArr[0].toObject()["total"].toInt();
    res["accuracy_rate"] = accuracyRate;
    return res;
}

QVariantList SynapseDataController::getErrorNotebookQuestions() {
    const QString sql = "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order "
                  "FROM quiz_questions q "
                  "INNER JOIN quiz_batteries b ON b.id = q.battery_id "
                  "INNER JOIN quiz_attempts a ON q.id = a.question_id "
                  "WHERE a.is_correct = 0 AND q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice' "
                  "AND NOT EXISTS (SELECT 1 FROM quiz_attempts newer WHERE newer.question_id = a.question_id "
                  "AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid))) "
                  "ORDER BY a.created_at DESC, a.rowid DESC";
    return executeQuery(sql).toVariantList();
}

QVariantList SynapseDataController::getRandomSimulationQuestions(int limit) {
    const int safeLimit = std::max(1, std::min(limit, 500));
    const QString sql = "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order "
                        "FROM quiz_questions q INNER JOIN quiz_batteries b ON b.id = q.battery_id "
                        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice' "
                        "ORDER BY RANDOM() LIMIT ?";
    return executeQueryPrepared(sql, {safeLimit}).toVariantList();
}

QVariantList SynapseDataController::getFilteredQuizQuestions(const QVariantList &tags,
                                                              const QString &status,
                                                              int limit,
                                                              bool shuffle) {
    const QString normalizedStatus = status == "unanswered" || status == "incorrect" ? status : "all";
    const QString sql = "SELECT q.id, q.battery_id, q.type, q.question, q.options, q.correct_index, q.expected_answer, q.explanation, q.tags, q.sort_order "
                        "FROM quiz_questions q INNER JOIN quiz_batteries b ON b.id = q.battery_id "
                        "WHERE q.deleted_at IS NULL AND b.deleted_at IS NULL AND q.type = 'multiple_choice' "
                        "AND (? = 'all' OR (? = 'unanswered' AND NOT EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.question_id = q.id)) "
                        "OR (? = 'incorrect' AND EXISTS (SELECT 1 FROM quiz_attempts a WHERE a.question_id = q.id AND a.is_correct = 0 "
                        "AND NOT EXISTS (SELECT 1 FROM quiz_attempts newer WHERE newer.question_id = a.question_id "
                        "AND (newer.created_at > a.created_at OR (newer.created_at = a.created_at AND newer.rowid > a.rowid)))))) "
                        "ORDER BY b.sort_order ASC, q.sort_order ASC, q.created_at ASC, q.id ASC";
    const QJsonArray rows = executeQueryPrepared(
        sql, {normalizedStatus, normalizedStatus, normalizedStatus});

    QSet<QString> selectedTags;
    for (const QVariant &tagValue : tags) {
        if (tagValue.metaType().id() != QMetaType::QString) continue;
        const QString tag = tagValue.toString().trimmed().toCaseFolded();
        if (!tag.isEmpty()) selectedTags.insert(tag);
    }

    QVariantList candidates;
    for (const QJsonValue &rowValue : rows) {
        const QJsonObject row = rowValue.toObject();
        if (!selectedTags.isEmpty()) {
            const QJsonDocument tagDocument = QJsonDocument::fromJson(row.value("tags").toString().toUtf8());
            if (!tagDocument.isArray()) continue;

            bool matchesTag = false;
            for (const QJsonValue &tagValue : tagDocument.array()) {
                if (tagValue.isString() && selectedTags.contains(tagValue.toString().trimmed().toCaseFolded())) {
                    matchesTag = true;
                    break;
                }
            }
            if (!matchesTag) continue;
        }
        candidates.append(row.toVariantMap());
    }

    if (shuffle) {
        for (qsizetype i = candidates.size() - 1; i > 0; --i) {
            const qsizetype randomIndex = QRandomGenerator::global()->bounded(static_cast<int>(i + 1));
            candidates.swapItemsAt(i, randomIndex);
        }
    }

    const qsizetype selectedCount = limit > 0
        ? std::min(static_cast<qsizetype>(limit), candidates.size())
        : candidates.size();
    candidates.erase(candidates.begin() + selectedCount, candidates.end());
    return candidates;
}

bool SynapseDataController::createQuizBattery(const QString &title, const QString &description) {
    QString id = generateUuid();
    QString ts = currentTimestamp();
    QString sql = QString("INSERT INTO quiz_batteries (id, title, description, layout, sort_order, created_at, updated_at) "
                          "VALUES ('%1', '%2', '%3', 'zen', 0, '%4', '%5')")
        .arg(id, escapeSql(title), escapeSql(description), ts, ts);
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteQuizBattery(const QString &batteryId) {
    QString ts = currentTimestamp();
    QString sql = QString("UPDATE quiz_batteries SET deleted_at = '%1' WHERE id = '%2'").arg(ts, escapeSql(batteryId));
    bool ok = executeSql(sql);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::createQuizQuestion(const QString &batteryId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation, const QString &tagsJson) {
    const QJsonDocument optionsDocument = QJsonDocument::fromJson(optionsJson.toUtf8());
    const QJsonDocument tagsDocument = QJsonDocument::fromJson(tagsJson.toUtf8());
    if (batteryId.trimmed().isEmpty() || question.trimmed().isEmpty()
            || !optionsDocument.isArray() || !tagsDocument.isArray()) return false;
    const QJsonArray options = optionsDocument.array();
    QJsonArray normalizedTags;
    QSet<QString> seenTags;
    for (const QJsonValue &tagValue : tagsDocument.array()) {
        if (!tagValue.isString()) return false;
        const QString tag = tagValue.toString().trimmed();
        const QString normalized = tag.toCaseFolded();
        if (!tag.isEmpty() && !seenTags.contains(normalized)) {
            seenTags.insert(normalized);
            normalizedTags.append(tag);
        }
    }
    if (options.size() < 2 || correctIndex < 0 || correctIndex >= options.size()) return false;
    for (const QJsonValue &option : options) {
        if (!option.isString() || option.toString().trimmed().isEmpty()) return false;
    }

    const QJsonArray batteryRows = executeQueryPrepared(
        "SELECT id FROM quiz_batteries WHERE id = ? AND deleted_at IS NULL", {batteryId});
    if (batteryRows.isEmpty()) return false;

    QString id = generateUuid();
    QString ts = currentTimestamp();
    const QString correctAnswer = options.at(correctIndex).toString();
    const QString sql = "INSERT INTO quiz_questions (id, battery_id, type, question, options, correct_answer, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at) "
                        "VALUES (?, ?, 'multiple_choice', ?, ?, ?, ?, '', ?, ?, "
                        "COALESCE((SELECT MAX(sort_order) + 1 FROM quiz_questions WHERE battery_id = ?), 0), ?, ?)";
    const bool saved = executeSqlPrepared(sql, {id, batteryId, question.trimmed(),
        QString::fromUtf8(QJsonDocument(options).toJson(QJsonDocument::Compact)), correctAnswer,
        correctIndex, explanation, QString::fromUtf8(QJsonDocument(normalizedTags).toJson(QJsonDocument::Compact)),
        batteryId, ts, ts}) == 1;
    if (saved) refreshStats();
    return saved;
}

bool SynapseDataController::recordQuizAttempt(const QString &batteryId, const QString &questionId, int selectedIndex, bool isCorrect) {
    const QJsonArray questionRows = executeQueryPrepared(
        "SELECT options FROM quiz_questions WHERE id = ? AND battery_id = ? AND deleted_at IS NULL",
        {questionId, batteryId});
    if (questionRows.isEmpty()) return false;
    const QJsonDocument optionsDocument = QJsonDocument::fromJson(
        questionRows[0].toObject().value("options").toString().toUtf8());
    if (!optionsDocument.isArray() || selectedIndex < 0 || selectedIndex >= optionsDocument.array().size()) return false;

    QString id = generateUuid();
    QString ts = currentTimestamp();
    const QString userAnswer = optionsDocument.array().at(selectedIndex).toString();
    const QString sql = "INSERT INTO quiz_attempts (id, question_id, battery_id, type, selected_index, user_typed_answer, user_answer, is_correct, duration_ms, created_at) "
                        "VALUES (?, ?, ?, 'multiple_choice', ?, '', ?, ?, 0, ?)";
    const bool saved = executeSqlPrepared(sql, {id, questionId, batteryId, selectedIndex,
        userAnswer, isCorrect ? 1 : 0, ts}) == 1;
    if (saved) refreshStats();
    return saved;
}

