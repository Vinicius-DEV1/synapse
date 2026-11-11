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

// Native finance and wishlist persistence.


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

bool SynapseDataController::updateTransaction(const QString &txId, const QString &description,
                                               double amount, const QString &type, const QString &category) {
    static const QSet<QString> supportedTypes = {
        "income", "expense"
    };
    if (txId.trimmed().isEmpty() || description.trimmed().isEmpty() ||
        !std::isfinite(amount) || amount < 0.0 || !supportedTypes.contains(type)) {
        return false;
    }

    const int updatedRows = executeSqlPrepared(
        "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, updated_at = ?5 "
        "WHERE id = ?6 AND deleted_at IS NULL",
        {description.trimmed(), amount, type, category.trimmed().isEmpty() ? QStringLiteral("Geral") : category.trimmed(),
         currentTimestamp(), txId});
    if (updatedRows != 1) return false;
    refreshStats();
    return true;
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

