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
};

int runNativeFinanceTest(int argc, char **argv) {
    NativeFinanceTest test;
    return QTest::qExec(&test, argc, argv);
}

#include "native_finance_test.moc"
