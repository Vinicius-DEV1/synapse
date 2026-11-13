#include "synapse_controller.h"

#include <QtCore/QDateTime>
#include <QtCore/QHash>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRandomGenerator>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <cmath>
#include <functional>

// Native finance, accounts, transfers and wishlist persistence.

QVariantList SynapseDataController::getTransactions(const QString &typeFilter, const QString &accountIdFilter) {
    QString sql = "SELECT id, description, amount, type, category, date, status, account_id, destination_account_id, is_paid "
                  "FROM transactions WHERE deleted_at IS NULL ";
    QVariantList params;
    if (!typeFilter.isEmpty() && typeFilter != "all") {
        sql += "AND type = ? ";
        params.append(typeFilter);
    }
    if (!accountIdFilter.isEmpty() && accountIdFilter != "all") {
        sql += "AND (account_id = ? OR destination_account_id = ?) ";
        params.append(accountIdFilter);
        params.append(accountIdFilter);
    }
    sql += "ORDER BY date DESC, created_at DESC LIMIT 200";
    return executeQueryPrepared(sql, params).toVariantList();
}

QVariantList SynapseDataController::getAccounts() {
    const QJsonArray accountsJson = executeQuery(
        "SELECT id, name, color, icon, initial_balance FROM finance_accounts WHERE deleted_at IS NULL ORDER BY name ASC");
    if (accountsJson.isEmpty()) return QVariantList();

    // Compute real-time balance delta for each account from non-pending transactions
    const QJsonArray txRows = executeQuery(
        "SELECT account_id, destination_account_id, type, amount FROM transactions "
        "WHERE deleted_at IS NULL AND (status IS NULL OR status != 'pending') AND (is_paid IS NULL OR is_paid != 0)");

    QHash<QString, double> deltas;
    for (const auto &val : txRows) {
        const QJsonObject obj = val.toObject();
        const QString type = obj.value("type").toString();
        const QString rawAccId = obj.value("account_id").toString();
        const QString accId = rawAccId.isEmpty() ? QStringLiteral("default-wallet") : rawAccId;
        const QString destId = obj.value("destination_account_id").toString();
        const double amt = obj.value("amount").toDouble();

        if (type == "income") {
            if (!accId.isEmpty()) deltas[accId] += amt;
        } else if (type == "expense") {
            if (!accId.isEmpty()) deltas[accId] -= amt;
        } else if (type == "transfer") {
            if (!accId.isEmpty()) deltas[accId] -= amt;
            if (!destId.isEmpty()) deltas[destId] += amt;
        } else if (type == "loan_made") {
            if (!accId.isEmpty()) deltas[accId] -= amt;
        } else if (type == "loan_taken") {
            if (!accId.isEmpty()) deltas[accId] += amt;
        }
    }

    QVariantList res;
    for (const auto &val : accountsJson) {
        QVariantMap acc = val.toObject().toVariantMap();
        const QString id = acc.value("id").toString();
        const double initial = acc.value("initial_balance").toDouble();
        acc["current_balance"] = initial + deltas.value(id, 0.0);
        res.append(acc);
    }
    return res;
}

QVariantMap SynapseDataController::getFinancialSummary() {
    QVariantMap res;
    double income = 0.0;
    double expense = 0.0;

    const QJsonArray arr = executeQuery(
        "SELECT type, SUM(amount) as total FROM transactions WHERE deleted_at IS NULL "
        "AND (status IS NULL OR status != 'pending') AND (is_paid IS NULL OR is_paid != 0) GROUP BY type");
    for (const auto &val : arr) {
        const QJsonObject obj = val.toObject();
        const QString type = obj.value("type").toString();
        const double total = obj.value("total").toDouble();
        if (type == "income") {
            income += total;
        } else if (type == "expense") {
            expense += total;
        }
    }

    // Total net worth across all non-deleted accounts
    const QVariantList accounts = getAccounts();
    double totalNetWorth = 0.0;
    for (const auto &accVal : accounts) {
        totalNetWorth += accVal.toMap().value("current_balance").toDouble();
    }

    res["income"] = income;
    res["expense"] = expense;
    res["balance"] = income - expense;
    res["total_balance"] = totalNetWorth;
    return res;
}

bool SynapseDataController::createAccount(const QString &name, const QString &color, const QString &icon, double initialBalance) {
    if (name.trimmed().isEmpty()) return false;
    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedColor = color.trimmed().isEmpty() ? QStringLiteral("#10b981") : color.trimmed();
    const QString resolvedIcon = icon.trimmed().isEmpty() ? QStringLiteral("wallet") : icon.trimmed();
    const double resolvedBalance = std::isfinite(initialBalance) ? initialBalance : 0.0;

    const int rows = executeSqlPrepared(
        "INSERT INTO finance_accounts (id, name, color, icon, initial_balance, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        {id, name.trimmed(), resolvedColor, resolvedIcon, resolvedBalance, ts, ts});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateAccount(const QString &accountId, const QString &name, const QString &color, const QString &icon, double initialBalance) {
    if (accountId.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const QString resolvedColor = color.trimmed().isEmpty() ? QStringLiteral("#10b981") : color.trimmed();
    const QString resolvedIcon = icon.trimmed().isEmpty() ? QStringLiteral("wallet") : icon.trimmed();
    const double resolvedBalance = std::isfinite(initialBalance) ? initialBalance : 0.0;

    const int rows = executeSqlPrepared(
        "UPDATE finance_accounts SET name = ?, color = ?, icon = ?, initial_balance = ?, updated_at = ? "
        "WHERE id = ? AND deleted_at IS NULL",
        {name.trimmed(), resolvedColor, resolvedIcon, resolvedBalance, ts, accountId});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteAccount(const QString &accountId) {
    if (accountId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE finance_accounts SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        {ts, ts, accountId});
    if (rows == 1) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::addTransaction(const QString &description, double amount, const QString &type, const QString &category, const QString &date, const QString &accountId) {
    if (description.trimmed().isEmpty() || !std::isfinite(amount) || amount < 0.0) return false;
    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedDate = date.trimmed().isEmpty() ? QDateTime::currentDateTime().toString("yyyy-MM-dd") : date.trimmed();
    const QString resolvedCat = category.trimmed().isEmpty() ? QStringLiteral("Geral") : category.trimmed();
    const QString resolvedAccId = accountId.trimmed().isEmpty() ? QString() : accountId.trimmed();

    const int rows = executeSqlPrepared(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, is_paid, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, 1, ?, ?)",
        {id, description.trimmed(), amount, type, resolvedCat, resolvedDate, resolvedAccId, ts, ts});
    const bool ok = (rows == 1);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::addTransfer(const QString &description, double amount, const QString &fromAccountId, const QString &toAccountId, const QString &date) {
    if (description.trimmed().isEmpty() || !std::isfinite(amount) || amount <= 0.0 ||
        fromAccountId.trimmed().isEmpty() || toAccountId.trimmed().isEmpty() || fromAccountId == toAccountId) {
        return false;
    }
    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const QString resolvedDate = date.trimmed().isEmpty() ? QDateTime::currentDateTime().toString("yyyy-MM-dd") : date.trimmed();

    const int rows = executeSqlPrepared(
        "INSERT INTO transactions (id, description, amount, type, category, date, status, account_id, destination_account_id, is_paid, created_at, updated_at) "
        "VALUES (?, ?, ?, 'transfer', 'Transferência', ?, 'completed', ?, ?, 1, ?, ?)",
        {id, description.trimmed(), amount, resolvedDate, fromAccountId, toAccountId, ts, ts});
    const bool ok = (rows == 1);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::deleteTransaction(const QString &txId) {
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE transactions SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL", {ts, txId});
    const bool ok = (rows == 1);
    if (ok) refreshStats();
    return ok;
}

bool SynapseDataController::updateTransaction(const QString &txId, const QString &description,
                                               double amount, const QString &type, const QString &category,
                                               const QString &date, const QString &accountId, const QString &destinationAccountId) {
    static const QSet<QString> supportedTypes = {
        "income", "expense", "transfer"
    };
    if (txId.trimmed().isEmpty() || description.trimmed().isEmpty() ||
        !std::isfinite(amount) || amount < 0.0 || !supportedTypes.contains(type)) {
        return false;
    }

    const QString resolvedCategory = category.trimmed().isEmpty() ? QStringLiteral("Geral") : category.trimmed();
    const QString ts = currentTimestamp();

    int updatedRows = 0;
    if (date.isEmpty() && accountId.isEmpty() && destinationAccountId.isEmpty()) {
        updatedRows = executeSqlPrepared(
            "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, updated_at = ?5 "
            "WHERE id = ?6 AND deleted_at IS NULL",
            {description.trimmed(), amount, type, resolvedCategory, ts, txId});
    } else {
        updatedRows = executeSqlPrepared(
            "UPDATE transactions SET description = ?1, amount = ?2, type = ?3, category = ?4, date = ?5, "
            "account_id = ?6, destination_account_id = ?7, updated_at = ?8 WHERE id = ?9 AND deleted_at IS NULL",
            {description.trimmed(), amount, type, resolvedCategory, date.trimmed(), accountId, destinationAccountId, ts, txId});
    }

    if (updatedRows != 1) return false;
    refreshStats();
    return true;
}

QVariantList SynapseDataController::getWishlist() {
    const QString sql = "SELECT id, title, price, priority, category, link, description FROM wishlist WHERE deleted_at IS NULL ORDER BY price DESC";
    return executeQuery(sql).toVariantList();
}

bool SynapseDataController::addWishlistItem(const QString &title, double price, const QString &priority, const QString &category, const QString &link) {
    if (title.trimmed().isEmpty() || !std::isfinite(price) || price < 0.0) return false;
    const QString id = generateUuid();
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "INSERT INTO wishlist (id, title, price, priority, category, link, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        {id, title.trimmed(), price, priority.trimmed().isEmpty() ? QStringLiteral("medium") : priority.trimmed(),
         category.trimmed().isEmpty() ? QStringLiteral("Geral") : category.trimmed(), link.trimmed(), ts, ts});
    return rows == 1;
}

bool SynapseDataController::deleteWishlistItem(const QString &itemId) {
    if (itemId.trimmed().isEmpty()) return false;
    const QString ts = currentTimestamp();
    const int rows = executeSqlPrepared(
        "UPDATE wishlist SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL", {ts, itemId});
    return rows == 1;
}

