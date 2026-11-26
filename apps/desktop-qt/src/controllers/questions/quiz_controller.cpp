#include "synapse_controller.h"
#include "synapse_bridge.h"

#include <QtCore/QDateTime>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QSet>
#include <algorithm>

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

// Native quiz battery and attempt persistence delegated to synapse-core.

QVariantList SynapseDataController::getQuizBatteries() {
    if (!m_db) return QVariantList();
    char* raw = synapse_quiz_get_batteries(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantMap SynapseDataController::getQuizBattery(const QString &batteryId) {
    if (!m_db || batteryId.trimmed().isEmpty()) return QVariantMap();
    QByteArray idUtf8 = batteryId.trimmed().toUtf8();
    char* raw = synapse_quiz_get_battery(m_db, idUtf8.constData());
    return parseJsonObject(raw).toVariantMap();
}

QVariantList SynapseDataController::getBatteryQuestions(const QString &batteryId) {
    if (!m_db || batteryId.trimmed().isEmpty()) return QVariantList();
    QByteArray batUtf8 = batteryId.trimmed().toUtf8();
    char* raw = synapse_quiz_get_battery_questions(m_db, batUtf8.constData());
    return parseJsonArray(raw).toVariantList();
}

QVariantMap SynapseDataController::applyQuizAssistantActions(
    const QString &batteryId,
    const QVariantList &actions) {
    if (!m_db || batteryId.trimmed().isEmpty() || actions.isEmpty()) {
        return {{QStringLiteral("success"), false},
                {QStringLiteral("error"), QStringLiteral("A bateria e ao menos uma ação são necessárias.")}};
    }
    const QByteArray batteryUtf8 = batteryId.trimmed().toUtf8();
    const QByteArray actionsJson = QJsonDocument::fromVariant(actions).toJson(QJsonDocument::Compact);
    const QVariantMap result = parseJsonObject(synapse_quiz_apply_assistant_actions(
        m_db, batteryUtf8.constData(), actionsJson.constData())).toVariantMap();
    if (result.value(QStringLiteral("success")).toBool()) {
        refreshStats();
        emit quizQuestionsChanged(batteryId.trimmed());
    }
    return result;
}

QVariantMap SynapseDataController::getQuizQuestion(const QString &questionId) {
    if (!m_db || questionId.trimmed().isEmpty()) return QVariantMap();
    QByteArray idUtf8 = questionId.trimmed().toUtf8();
    char* raw = synapse_quiz_get_question(m_db, idUtf8.constData());
    return parseJsonObject(raw).toVariantMap();
}

QVariantList SynapseDataController::getAllQuizQuestions() {
    if (!m_db) return QVariantList();
    char* raw = synapse_quiz_get_all_questions(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantList SynapseDataController::getAllQuizTags() {
    if (!m_db) return QVariantList();
    char* raw = synapse_quiz_get_all_tags(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantMap SynapseDataController::getQuizStats() {
    if (!m_db) return QVariantMap();
    char* raw = synapse_quiz_get_stats(m_db);
    return parseJsonObject(raw).toVariantMap();
}

QVariantList SynapseDataController::getErrorNotebookQuestions() {
    if (!m_db) return QVariantList();
    char* raw = synapse_quiz_get_error_notebook(m_db);
    return parseJsonArray(raw).toVariantList();
}

QVariantList SynapseDataController::getRandomSimulationQuestions(int limit) {
    if (!m_db) return QVariantList();
    char* raw = synapse_quiz_get_random_simulation(m_db, limit);
    return parseJsonArray(raw).toVariantList();
}

QVariantList SynapseDataController::getFilteredQuizQuestions(const QVariantList &tags,
                                                            const QString &status,
                                                            int limit,
                                                            bool shuffle) {
    if (!m_db) return QVariantList();
    QJsonArray tagArr;
    for (const QVariant &t : tags) {
        if (t.canConvert<QString>() && !t.toString().trimmed().isEmpty()) {
            tagArr.append(t.toString().trimmed());
        }
    }
    QByteArray tagsJson = QJsonDocument(tagArr).toJson(QJsonDocument::Compact);
    QByteArray statusUtf8 = status.trimmed().toUtf8();
    char* raw = synapse_quiz_get_filtered_questions(m_db, tagsJson.constData(), statusUtf8.constData(), limit, shuffle ? 1 : 0);
    return parseJsonArray(raw).toVariantList();
}

bool SynapseDataController::createQuizBattery(const QString &title, const QString &description) {
    if (!m_db || title.trimmed().isEmpty()) return false;
    QByteArray titleUtf8 = title.trimmed().toUtf8();
    QByteArray descUtf8 = description.trimmed().toUtf8();
    char* idRaw = synapse_quiz_create_battery(m_db, titleUtf8.constData(), descUtf8.isEmpty() ? nullptr : descUtf8.constData());
    if (!idRaw) return false;
    synapse_free_string(idRaw);
    refreshStats();
    return true;
}

QString SynapseDataController::createNoteQuizBattery(const QString &title,
                                                     const QString &description,
                                                     const QString &pageId) {
    if (!m_db || title.trimmed().isEmpty() || pageId.trimmed().isEmpty()) return QString();
    QByteArray titleUtf8 = title.trimmed().toUtf8();
    QByteArray descriptionUtf8 = description.trimmed().toUtf8();
    QByteArray pageIdUtf8 = pageId.trimmed().toUtf8();
    char* idRaw = synapse_quiz_create_battery_for_page(
        m_db,
        titleUtf8.constData(),
        descriptionUtf8.isEmpty() ? nullptr : descriptionUtf8.constData(),
        pageIdUtf8.constData());
    if (!idRaw) return QString();
    const QString batteryId = QString::fromUtf8(idRaw);
    synapse_free_string(idRaw);
    refreshStats();
    return batteryId;
}

bool SynapseDataController::updateQuizBattery(const QString &batteryId, const QString &title, const QString &description) {
    if (!m_db || batteryId.trimmed().isEmpty() || title.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = batteryId.trimmed().toUtf8();
    QByteArray titleUtf8 = title.trimmed().toUtf8();
    QByteArray descUtf8 = description.trimmed().toUtf8();
    bool ok = synapse_quiz_update_battery(m_db, idUtf8.constData(), titleUtf8.constData(), descUtf8.isEmpty() ? nullptr : descUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteQuizBattery(const QString &batteryId) {
    if (!m_db || batteryId.trimmed().isEmpty()) return false;
    QByteArray idUtf8 = batteryId.trimmed().toUtf8();
    bool ok = synapse_quiz_delete_battery(m_db, idUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::createQuizQuestion(const QString &batteryId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation, const QString &tagsJson) {
    if (!m_db || batteryId.trimmed().isEmpty() || question.trimmed().isEmpty()) return false;
    QByteArray batUtf8 = batteryId.trimmed().toUtf8();
    QByteArray qUtf8 = question.trimmed().toUtf8();
    QByteArray optUtf8 = optionsJson.toUtf8();
    QByteArray explUtf8 = explanation.trimmed().toUtf8();
    QByteArray tagsUtf8 = tagsJson.toUtf8();

    int res = synapse_quiz_create_question(
        m_db,
        batUtf8.constData(),
        qUtf8.constData(),
        optUtf8.constData(),
        correctIndex,
        explUtf8.isEmpty() ? nullptr : explUtf8.constData(),
        tagsUtf8.isEmpty() ? nullptr : tagsUtf8.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateQuizQuestion(const QString &questionId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation, const QString &tagsJson) {
    if (!m_db || questionId.trimmed().isEmpty() || question.trimmed().isEmpty()) return false;
    QByteArray qIdUtf8 = questionId.trimmed().toUtf8();
    QByteArray qUtf8 = question.trimmed().toUtf8();
    QByteArray optUtf8 = optionsJson.toUtf8();
    QByteArray explUtf8 = explanation.trimmed().toUtf8();
    QByteArray tagsUtf8 = tagsJson.toUtf8();

    bool ok = synapse_quiz_update_question(
        m_db,
        qIdUtf8.constData(),
        qUtf8.constData(),
        optUtf8.constData(),
        correctIndex,
        explUtf8.isEmpty() ? nullptr : explUtf8.constData(),
        tagsUtf8.isEmpty() ? nullptr : tagsUtf8.constData()
    ) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteQuizQuestion(const QString &questionId) {
    if (!m_db || questionId.trimmed().isEmpty()) return false;
    QByteArray qIdUtf8 = questionId.trimmed().toUtf8();
    bool ok = synapse_quiz_delete_question(m_db, qIdUtf8.constData()) == 1;
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::recordQuizAttempt(const QString &batteryId, const QString &questionId, int selectedIndex, bool isCorrect) {
    if (!m_db || batteryId.trimmed().isEmpty() || questionId.trimmed().isEmpty()) return false;
    QByteArray batUtf8 = batteryId.trimmed().toUtf8();
    QByteArray qIdUtf8 = questionId.trimmed().toUtf8();

    int res = synapse_quiz_record_attempt(
        m_db,
        batUtf8.constData(),
        qIdUtf8.constData(),
        selectedIndex,
        isCorrect ? 1 : 0
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantMap SynapseDataController::recordOpenQuizAttempt(
    const QString &batteryId,
    const QString &questionId,
    const QString &userTypedAnswer,
    const QString &verdict,
    const QString &feedback,
    const QString &model) {
    if (!m_db || batteryId.trimmed().isEmpty() || questionId.trimmed().isEmpty()
        || userTypedAnswer.trimmed().isEmpty() || verdict.trimmed().isEmpty()
        || feedback.trimmed().isEmpty()) {
        return QVariantMap();
    }
    const QByteArray batteryUtf8 = batteryId.trimmed().toUtf8();
    const QByteArray questionUtf8 = questionId.trimmed().toUtf8();
    const QByteArray answerUtf8 = userTypedAnswer.trimmed().toUtf8();
    const QByteArray verdictUtf8 = verdict.trimmed().toUtf8();
    const QByteArray feedbackUtf8 = feedback.trimmed().toUtf8();
    const QByteArray modelUtf8 = model.trimmed().toUtf8();
    char *raw = synapse_quiz_record_open_answer_attempt(
        m_db,
        batteryUtf8.constData(),
        questionUtf8.constData(),
        answerUtf8.constData(),
        verdictUtf8.constData(),
        feedbackUtf8.constData(),
        modelUtf8.isEmpty() ? nullptr : modelUtf8.constData());
    const QVariantMap attempt = parseJsonObject(raw).toVariantMap();
    if (!attempt.isEmpty()) refreshStats();
    return attempt;
}

QVariantMap SynapseDataController::getLatestQuizAttempts(
    const QString &batteryId,
    const QString &questionId) {
    if (!m_db || (batteryId.trimmed().isEmpty() && questionId.trimmed().isEmpty())) {
        return QVariantMap();
    }
    const QByteArray batteryUtf8 = batteryId.trimmed().toUtf8();
    const QByteArray questionUtf8 = questionId.trimmed().toUtf8();
    const QJsonArray attempts = parseJsonArray(synapse_quiz_get_latest_attempts(
        m_db,
        batteryUtf8.isEmpty() ? nullptr : batteryUtf8.constData(),
        questionUtf8.isEmpty() ? nullptr : questionUtf8.constData()));
    QVariantMap latestByQuestion;
    for (const QJsonValue &value : attempts) {
        const QJsonObject attempt = value.toObject();
        const QString id = attempt.value(QStringLiteral("question_id")).toString();
        if (!id.isEmpty()) latestByQuestion.insert(id, attempt.toVariantMap());
    }
    return latestByQuestion;
}

QVariantList SynapseDataController::getQuizBatteryTree() {
    if (!m_db) return QVariantList();
    char *raw = synapse_quiz_get_battery_tree(m_db);
    return parseJsonArray(raw).toVariantList();
}

QString SynapseDataController::createChildQuizBattery(const QString &parentId, const QString &title, const QString &description) {
    if (!m_db || title.trimmed().isEmpty()) return QString();
    const QByteArray pidUtf8 = parentId.trimmed().toUtf8();
    const QByteArray tUtf8 = title.trimmed().toUtf8();
    const QByteArray dUtf8 = description.trimmed().toUtf8();
    char *idRaw = synapse_quiz_create_child_battery(
        m_db,
        parentId.trimmed().isEmpty() ? nullptr : pidUtf8.constData(),
        tUtf8.constData(),
        dUtf8.isEmpty() ? nullptr : dUtf8.constData()
    );
    if (!idRaw) return QString();
    const QString id = QString::fromUtf8(idRaw);
    synapse_free_string(idRaw);
    refreshStats();
    return id;
}

QVariantList SynapseDataController::getAvailableQuizParentOptions(const QString &movingBatteryId) {
    if (!m_db) return QVariantList();
    const QByteArray midUtf8 = movingBatteryId.trimmed().toUtf8();
    char *raw = synapse_quiz_get_available_parent_options(
        m_db,
        movingBatteryId.trimmed().isEmpty() ? nullptr : midUtf8.constData()
    );
    return parseJsonArray(raw).toVariantList();
}

bool SynapseDataController::moveQuizBattery(const QString &batteryId, const QString &newParentId) {
    if (!m_db || batteryId.trimmed().isEmpty()) return false;
    const QByteArray bUtf8 = batteryId.trimmed().toUtf8();
    const QByteArray pUtf8 = newParentId.trimmed().toUtf8();
    return synapse_quiz_move_battery(
        m_db,
        bUtf8.constData(),
        newParentId.trimmed().isEmpty() ? nullptr : pUtf8.constData()
    ) == 1;
}

QVariantList SynapseDataController::parseQuizImportText(const QString &rawText) {
    const QByteArray rawUtf8 = rawText.toUtf8();
    char *raw = synapse_quiz_parse_import_text(rawUtf8.constData());
    return parseJsonArray(raw).toVariantList();
}
