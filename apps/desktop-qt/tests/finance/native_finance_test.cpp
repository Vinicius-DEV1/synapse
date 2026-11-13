#include "synapse_controller.h"

#include <QtCore/QTemporaryDir>
#include <QtTest/QtTest>

class NativeFinanceTest final : public QObject {
    Q_OBJECT

private slots:
    void transactionsCanBeEditedWithoutChangingTheirDateOrAccount() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-finance.sqlite")));
        QVERIFY(controller.addTransaction("Coffee", 4.50, "expense", "Food", "2026-11-10"));
        const QVariantMap initialTransaction = controller.getTransactions().first().toMap();
        const QString transactionId = initialTransaction.value("id").toString();

        QVERIFY(controller.updateTransaction(transactionId, "Coffee and snack", 8.25, "expense", "Food"));
        const QVariantMap updatedTransaction = controller.getTransactions().first().toMap();
        QCOMPARE(updatedTransaction.value("description").toString(), QString("Coffee and snack"));
        QCOMPARE(updatedTransaction.value("amount").toDouble(), 8.25);
        QCOMPARE(updatedTransaction.value("category").toString(), QString("Food"));
        QCOMPARE(updatedTransaction.value("date").toString(), QString("2026-11-10"));
        QVERIFY(updatedTransaction.value("account_id").isNull() || updatedTransaction.value("account_id").toString().isEmpty());

        QVERIFY(!controller.updateTransaction("missing", "No row", 1.0, "expense", "Food"));
        QVERIFY(!controller.updateTransaction(transactionId, " ", 1.0, "expense", "Food"));
        QVERIFY(!controller.updateTransaction(transactionId, "Invalid type", 1.0, "unknown", "Food"));
    }

    void accountLifecycleTransfersAndRealtimeBalances() {
        QTemporaryDir sandbox;
        QVERIFY(sandbox.isValid());

        SynapseDataController controller(nullptr, false);
        QVERIFY(controller.openDatabase(sandbox.filePath("native-finance-accounts.sqlite")));

        // The database migration seeds the initial default-wallet account
        QVariantList initialAccounts = controller.getAccounts();
        QCOMPARE(initialAccounts.size(), 1);
        QCOMPARE(initialAccounts.first().toMap().value("id").toString(), QString("default-wallet"));

        // Test account creation
        QVERIFY(controller.createAccount("Checking", "#2563eb", "bank", 1000.0));
        QVERIFY(controller.createAccount("Savings", "#10b981", "wallet", 500.0));
        QVERIFY(!controller.createAccount("")); // empty name rejected

        QVariantList accounts = controller.getAccounts();
        QCOMPARE(accounts.size(), 3);

        QString checkingId, savingsId;
        for (const auto &val : accounts) {
            const QVariantMap m = val.toMap();
            if (m.value("name").toString() == "Checking") {
                checkingId = m.value("id").toString();
                QCOMPARE(m.value("initial_balance").toDouble(), 1000.0);
                QCOMPARE(m.value("current_balance").toDouble(), 1000.0);
            } else if (m.value("name").toString() == "Savings") {
                savingsId = m.value("id").toString();
                QCOMPARE(m.value("initial_balance").toDouble(), 500.0);
                QCOMPARE(m.value("current_balance").toDouble(), 500.0);
            }
        }
        QVERIFY(!checkingId.isEmpty());
        QVERIFY(!savingsId.isEmpty());

        // Add income to Checking
        QVERIFY(controller.addTransaction("Salary", 200.0, "income", "Salário", "2026-11-12", checkingId));

        // Add expense from Checking
        QVERIFY(controller.addTransaction("Groceries", 50.0, "expense", "Alimentação", "2026-11-12", checkingId));

        // Add transfer from Checking to Savings
        QVERIFY(controller.addTransfer("Emergency reserve", 300.0, checkingId, savingsId, "2026-11-12"));

        // Reject invalid transfers
        QVERIFY(!controller.addTransfer("Invalid", -50.0, checkingId, savingsId, "2026-11-12"));
        QVERIFY(!controller.addTransfer("Invalid", 50.0, checkingId, checkingId, "2026-11-12")); // same account
        QVERIFY(!controller.addTransfer("Invalid", 50.0, "", savingsId, "2026-11-12"));

        // Verify balances
        accounts = controller.getAccounts();
        for (const auto &val : accounts) {
            const QVariantMap m = val.toMap();
            if (m.value("id").toString() == checkingId) {
                // 1000 + 200 (income) - 50 (expense) - 300 (transfer out) = 850
                QCOMPARE(m.value("current_balance").toDouble(), 850.0);
            } else if (m.value("id").toString() == savingsId) {
                // 500 + 300 (transfer in) = 800
                QCOMPARE(m.value("current_balance").toDouble(), 800.0);
            }
        }

        // Verify summary
        const QVariantMap summary = controller.getFinancialSummary();
        QCOMPARE(summary.value("income").toDouble(), 200.0);
        QCOMPARE(summary.value("expense").toDouble(), 50.0);
        QCOMPARE(summary.value("balance").toDouble(), 150.0);
        QCOMPARE(summary.value("total_balance").toDouble(), 1650.0);

        // Filter transactions by account
        const QVariantList checkingTxs = controller.getTransactions("all", checkingId);
        // Checking has Salary (income), Groceries (expense), Emergency reserve (transfer out) = 3
        QCOMPARE(checkingTxs.size(), 3);
        const QVariantList savingsTxs = controller.getTransactions("all", savingsId);
        // Savings has Emergency reserve (transfer in) = 1
        QCOMPARE(savingsTxs.size(), 1);

        // Update Account
        QVERIFY(controller.updateAccount(checkingId, "Main Checking", "#3b82f6", "bank", 1200.0));
        accounts = controller.getAccounts();
        for (const auto &val : accounts) {
            const QVariantMap m = val.toMap();
            if (m.value("id").toString() == checkingId) {
                QCOMPARE(m.value("name").toString(), QString("Main Checking"));
                // 1200 + 200 - 50 - 300 = 1050
                QCOMPARE(m.value("current_balance").toDouble(), 1050.0);
            }
        }

        // Delete Account
        QVERIFY(controller.deleteAccount(savingsId));
        accounts = controller.getAccounts();
        QCOMPARE(accounts.size(), 2);
        bool savingsStillPresent = false;
        for (const auto &val : accounts) {
            if (val.toMap().value("id").toString() == savingsId) savingsStillPresent = true;
        }
        QVERIFY(!savingsStillPresent);
    }
};

int runNativeFinanceTest(int argc, char **argv) {
    NativeFinanceTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_finance_test.moc"
