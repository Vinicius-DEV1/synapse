package com.synapse.features.finance

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.synapse.core.FinanceAccount
import com.synapse.core.FinanceTransaction
import com.synapse.core.FinanceWishlistItem
import com.synapse.core.SynapseFinanceStore
import java.io.File
import java.util.UUID
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinanceApiTest {
    @Test
    fun nativeFinanceApiPersistsAndReconcilesRealRecords() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val databaseFile = File(context.cacheDir, "finance-${UUID.randomUUID()}.sqlite")
        try {
            SynapseFinanceStore.open(databaseFile.absolutePath).use { store ->
                val primaryAccount = store.getAccounts().first()
                val createdAccount = store.createAccount(
                    FinanceAccount("", "Reserve", "#2563eb", "wallet", 10.0, null, null, null, null),
                )
                val updatedAccount = store.updateAccount(createdAccount.copy(name = "Savings", initialBalance = 15.0))
                assertEquals("Savings", updatedAccount.name)
                assertEquals(15.0, updatedAccount.initialBalance!!, 0.0)

                val pendingExpense = store.createTransaction(
                    FinanceTransaction(
                        id = "", description = "Internet", amount = 35.0, expectedAmount = null,
                        type = "expense", category = "Bills", date = "2026-11-20", status = "pending",
                        isPaid = 0, paidAmount = 0.0, isRecurring = 0, recurrencePeriod = null, dueDate = null,
                        accountId = primaryAccount.id, destinationAccountId = null, linkedLoanId = null, person = null,
                        createdAt = null, updatedAt = null,
                    ),
                )
                val editedExpense = store.updateTransaction(pendingExpense.copy(description = "Internet bill"))
                assertEquals("Internet bill", editedExpense.description)
                assertNotNull(editedExpense.updatedAt)
                store.confirmPendingTransaction(editedExpense.id)
                assertEquals("completed", store.getTransactions(null, null).first { it.id == editedExpense.id }.status)

                val transfer = store.createTransaction(
                    FinanceTransaction(
                        id = "", description = "Monthly reserve", amount = 20.0, expectedAmount = null,
                        type = "transfer", category = "Transferência", date = "2026-11-20", status = "completed",
                        isPaid = 1, paidAmount = 0.0, isRecurring = 0, recurrencePeriod = null, dueDate = null,
                        accountId = primaryAccount.id, destinationAccountId = updatedAccount.id, linkedLoanId = null,
                        person = null, createdAt = null, updatedAt = null,
                    ),
                )
                assertEquals(updatedAccount.id, transfer.destinationAccountId)

                val loan = store.createTransaction(
                    FinanceTransaction(
                        id = "", description = "Phone installment", amount = 80.0, expectedAmount = 100.0,
                        type = "loan_made", category = "Personal", date = "2026-11-20", status = "in_progress",
                        isPaid = 0, paidAmount = 0.0, isRecurring = 0, recurrencePeriod = null, dueDate = null,
                        accountId = primaryAccount.id, destinationAccountId = null, linkedLoanId = null, person = "Jamie",
                        createdAt = null, updatedAt = null,
                    ),
                )
                val payment = store.recordLoanPayment(loan.id, 25.0, primaryAccount.id, "2026-11-20")
                assertEquals(loan.id, payment.linkedLoanId)
                assertEquals(25.0, store.getTransactions(null, null).first { it.id == loan.id }.paidAmount!!, 0.0)
                store.reopenLoan(loan.id)
                val reopenedLoan = store.getTransactions(null, null).first { it.id == loan.id }
                assertEquals(0.0, reopenedLoan.paidAmount!!, 0.0)
                assertTrue(store.getTransactions(null, null).none { it.id == payment.id })

                val wish = store.createWishlistItem(
                    FinanceWishlistItem(
                        id = "", title = "Headphones", price = 150.0, priority = "high", category = "Audio",
                        expectedDate = null, description = null, link = null, createdAt = null, updatedAt = null,
                    ),
                )
                val updatedWish = store.updateWishlistItem(wish.copy(title = "Studio headphones"))
                assertEquals("Studio headphones", updatedWish.title)
                store.acquireWishlistItem(updatedWish.id, updatedWish.title, 130.0, primaryAccount.id, "Audio", "2026-11-21", true)
                assertTrue(store.getWishlist().isEmpty())
                assertTrue(store.getTransactions(null, null).any { it.description == "Studio headphones" })
                // The reopened loan remains an outstanding receivable and affects the account balance.
                assertEquals(-265.0, store.getSummaryFor(primaryAccount.id, "2026-11").totalBalance, 0.0)
                assertTrue(store.deleteTransaction(transfer.id))
                assertTrue(store.deleteAccount(updatedAccount.id))
            }

            SynapseFinanceStore.open(databaseFile.absolutePath).use { reopened ->
                assertTrue(reopened.getWishlist().isEmpty())
                assertTrue(reopened.getTransactions(null, null).any { it.description == "Internet bill" })
            }
        } finally {
            databaseFile.delete()
            File(databaseFile.absolutePath + "-wal").delete()
            File(databaseFile.absolutePath + "-shm").delete()
        }
    }
}
