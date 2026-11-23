#include "synapse_controller.h"

#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// Native finance, accounts, transfers and wishlist presentation controller.
// Delegates domain queries, balance calculations, and persistence to core/synapse-core via bridge-qt.

static QVariantList parseJsonArrayAndFree(char *rawJson) {
    if (!rawJson) return QVariantList();
    const QByteArray bytes(rawJson);
    synapse_free_string(rawJson);
    const QJsonDocument doc = QJsonDocument::fromJson(bytes);
    if (!doc.isArray()) return QVariantList();
    return doc.array().toVariantList();
}

static QVariantMap parseJsonObjectAndFree(char *rawJson) {
    if (!rawJson) return QVariantMap();
    const QByteArray bytes(rawJson);
    synapse_free_string(rawJson);
    const QJsonDocument doc = QJsonDocument::fromJson(bytes);
    if (!doc.isObject()) return QVariantMap();
    return doc.object().toVariantMap();
}

QVariantList SynapseDataController::getTransactions(const QString &typeFilter, const QString &accountIdFilter) {
    if (!m_db) return QVariantList();
    const QByteArray typeBytes = typeFilter.toUtf8();
    const QByteArray accBytes = accountIdFilter.toUtf8();
    char *raw = synapse_finance_get_transactions(
        m_db,
        typeFilter.isEmpty() ? nullptr : typeBytes.constData(),
        accountIdFilter.isEmpty() ? nullptr : accBytes.constData()
    );
    return parseJsonArrayAndFree(raw);
}

QVariantList SynapseDataController::getAccounts() {
    if (!m_db) return QVariantList();
    char *raw = synapse_finance_get_accounts(m_db);
    return parseJsonArrayAndFree(raw);
}

QVariantMap SynapseDataController::getFinancialSummary() {
    if (!m_db) return QVariantMap();
    char *raw = synapse_finance_get_summary(m_db);
    return parseJsonObjectAndFree(raw);
}

bool SynapseDataController::createAccount(const QString &name, const QString &color, const QString &icon, double initialBalance) {
    if (!m_db || name.trimmed().isEmpty()) return false;
    const QByteArray nameBytes = name.toUtf8();
    const QByteArray colorBytes = color.toUtf8();
    const QByteArray iconBytes = icon.toUtf8();

    const int res = synapse_finance_create_account(
        m_db,
        nameBytes.constData(),
        color.trimmed().isEmpty() ? nullptr : colorBytes.constData(),
        icon.trimmed().isEmpty() ? nullptr : iconBytes.constData(),
        initialBalance
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateAccount(const QString &accountId, const QString &name, const QString &color, const QString &icon, double initialBalance) {
    if (!m_db || accountId.trimmed().isEmpty() || name.trimmed().isEmpty()) return false;
    const QByteArray idBytes = accountId.toUtf8();
    const QByteArray nameBytes = name.toUtf8();
    const QByteArray colorBytes = color.toUtf8();
    const QByteArray iconBytes = icon.toUtf8();

    const int res = synapse_finance_update_account(
        m_db,
        idBytes.constData(),
        nameBytes.constData(),
        color.trimmed().isEmpty() ? nullptr : colorBytes.constData(),
        icon.trimmed().isEmpty() ? nullptr : iconBytes.constData(),
        initialBalance
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteAccount(const QString &accountId) {
    if (!m_db || accountId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = accountId.toUtf8();
    const int res = synapse_finance_delete_account(m_db, idBytes.constData());
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::addTransaction(const QString &description, double amount, const QString &type,
                                           const QString &category, const QString &date, const QString &accountId,
                                           const QString &status) {
    if (!m_db || description.trimmed().isEmpty() || !std::isfinite(amount) || amount < 0.0) return false;
    const QByteArray descBytes = description.toUtf8();
    const QByteArray typeBytes = type.toUtf8();
    const QByteArray catBytes = category.toUtf8();
    const QByteArray dateBytes = date.toUtf8();
    const QByteArray accBytes = accountId.toUtf8();
    const QByteArray statusBytes = status.toUtf8();

    const int res = synapse_finance_add_transaction_with_status(
        m_db,
        descBytes.constData(),
        amount,
        typeBytes.constData(),
        category.trimmed().isEmpty() ? nullptr : catBytes.constData(),
        date.trimmed().isEmpty() ? nullptr : dateBytes.constData(),
        accountId.trimmed().isEmpty() ? nullptr : accBytes.constData(),
        status.trimmed().isEmpty() ? nullptr : statusBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::confirmPendingTransaction(const QString &txId, double amount, const QString &date,
                                                      const QString &accountId, const QString &description,
                                                      const QString &category) {
    if (!m_db || txId.trimmed().isEmpty() || !std::isfinite(amount) || amount < 0.0) return false;
    const QByteArray idBytes = txId.toUtf8();
    const QByteArray dateBytes = date.toUtf8();
    const QByteArray accBytes = accountId.toUtf8();
    const QByteArray descBytes = description.toUtf8();
    const QByteArray catBytes = category.toUtf8();

    const int res = synapse_finance_confirm_pending_transaction(
        m_db,
        idBytes.constData(),
        amount,
        date.trimmed().isEmpty() ? nullptr : dateBytes.constData(),
        accountId.trimmed().isEmpty() ? nullptr : accBytes.constData(),
        description.trimmed().isEmpty() ? nullptr : descBytes.constData(),
        category.trimmed().isEmpty() ? nullptr : catBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::addTransfer(const QString &description, double amount,
                                        const QString &fromAccountId, const QString &toAccountId, const QString &date) {
    if (!m_db || description.trimmed().isEmpty() || !std::isfinite(amount) || amount <= 0.0 ||
        fromAccountId.trimmed().isEmpty() || toAccountId.trimmed().isEmpty() || fromAccountId == toAccountId) {
        return false;
    }
    const QByteArray descBytes = description.toUtf8();
    const QByteArray fromBytes = fromAccountId.toUtf8();
    const QByteArray toBytes = toAccountId.toUtf8();
    const QByteArray dateBytes = date.toUtf8();

    const int res = synapse_finance_add_transfer(
        m_db,
        descBytes.constData(),
        amount,
        fromBytes.constData(),
        toBytes.constData(),
        date.trimmed().isEmpty() ? nullptr : dateBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::updateTransaction(const QString &txId, const QString &description,
                                                double amount, const QString &type, const QString &category,
                                                const QString &date, const QString &accountId, const QString &destinationAccountId) {
    if (!m_db || txId.trimmed().isEmpty() || description.trimmed().isEmpty() || !std::isfinite(amount) || amount < 0.0) {
        return false;
    }
    const QByteArray idBytes = txId.toUtf8();
    const QByteArray descBytes = description.toUtf8();
    const QByteArray typeBytes = type.toUtf8();
    const QByteArray catBytes = category.toUtf8();
    const QByteArray dateBytes = date.toUtf8();
    const QByteArray accBytes = accountId.toUtf8();
    const QByteArray destBytes = destinationAccountId.toUtf8();

    const int res = synapse_finance_update_transaction(
        m_db,
        idBytes.constData(),
        descBytes.constData(),
        amount,
        typeBytes.constData(),
        category.trimmed().isEmpty() ? nullptr : catBytes.constData(),
        date.trimmed().isEmpty() ? nullptr : dateBytes.constData(),
        accountId.trimmed().isEmpty() ? nullptr : accBytes.constData(),
        destinationAccountId.trimmed().isEmpty() ? nullptr : destBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteTransaction(const QString &txId) {
    if (!m_db || txId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = txId.toUtf8();
    const int res = synapse_finance_delete_transaction(m_db, idBytes.constData());
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantList SynapseDataController::getWishlist() {
    if (!m_db) return QVariantList();
    char *raw = synapse_finance_get_wishlist(m_db);
    return parseJsonArrayAndFree(raw);
}

bool SynapseDataController::addWishlistItem(const QString &title, double price, const QString &priority,
                                            const QString &category, const QString &link) {
    if (!m_db || title.trimmed().isEmpty() || !std::isfinite(price) || price < 0.0) return false;
    const QByteArray titleBytes = title.toUtf8();
    const QByteArray prioBytes = priority.toUtf8();
    const QByteArray catBytes = category.toUtf8();
    const QByteArray linkBytes = link.toUtf8();

    const int res = synapse_finance_add_wishlist_item(
        m_db,
        titleBytes.constData(),
        price,
        priority.trimmed().isEmpty() ? nullptr : prioBytes.constData(),
        category.trimmed().isEmpty() ? nullptr : catBytes.constData(),
        link.trimmed().isEmpty() ? nullptr : linkBytes.constData()
    );
    return res == 0;
}

bool SynapseDataController::deleteWishlistItem(const QString &itemId) {
    if (!m_db || itemId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = itemId.toUtf8();
    const int res = synapse_finance_delete_wishlist_item(m_db, idBytes.constData());
    return res == 0;
}

QVariantList SynapseDataController::getLoans() {
    if (!m_db) return QVariantList();
    char *raw = synapse_finance_get_loans(m_db);
    return parseJsonArrayAndFree(raw);
}

bool SynapseDataController::createLoan(const QString &description, const QString &person,
                                       double amount, const QString &loanType,
                                       const QString &accountId, const QString &date) {
    if (!m_db || description.trimmed().isEmpty() || person.trimmed().isEmpty() || !std::isfinite(amount) || amount <= 0.0) return false;
    const QByteArray descBytes = description.toUtf8();
    const QByteArray personBytes = person.toUtf8();
    const QByteArray typeBytes = loanType.toUtf8();
    const QByteArray accBytes = accountId.toUtf8();
    const QByteArray dateBytes = date.toUtf8();

    const int res = synapse_finance_create_loan(
        m_db,
        descBytes.constData(),
        personBytes.constData(),
        amount,
        typeBytes.constData(),
        accountId.trimmed().isEmpty() ? nullptr : accBytes.constData(),
        date.trimmed().isEmpty() ? nullptr : dateBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::recordLoanPayment(const QString &loanId, double amount,
                                             const QString &accountId, const QString &paymentDate) {
    if (!m_db || loanId.trimmed().isEmpty() || accountId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = loanId.toUtf8();
    const QByteArray accBytes = accountId.toUtf8();
    const QByteArray dateBytes = paymentDate.toUtf8();

    const int res = synapse_finance_record_loan_payment(
        m_db,
        idBytes.constData(),
        amount,
        accBytes.constData(),
        paymentDate.trimmed().isEmpty() ? nullptr : dateBytes.constData()
    );
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

bool SynapseDataController::deleteLoan(const QString &loanId) {
    if (!m_db || loanId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = loanId.toUtf8();
    const int res = synapse_finance_delete_loan(m_db, idBytes.constData());
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}

QVariantMap SynapseDataController::getFinancialPeriodMetrics(const QString &accountId, const QString &period) {
    if (!m_db) return QVariantMap();
    const QByteArray accBytes = accountId.trimmed().toUtf8();
    const QByteArray perBytes = period.trimmed().toUtf8();
    char *raw = synapse_finance_get_period_metrics(
        m_db,
        accountId.trimmed().isEmpty() ? nullptr : accBytes.constData(),
        period.trimmed().isEmpty() ? nullptr : perBytes.constData()
    );
    return parseJsonObjectAndFree(raw);
}

bool SynapseDataController::reopenLoan(const QString &loanId) {
    if (!m_db || loanId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = loanId.trimmed().toUtf8();
    const int res = synapse_finance_reopen_loan(m_db, idBytes.constData());
    if (res == 0) {
        refreshStats();
        return true;
    }
    return false;
}
