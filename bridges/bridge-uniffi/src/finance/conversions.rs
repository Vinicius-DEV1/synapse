use super::models::{FinanceAccount, FinanceSummary, FinanceTransaction, FinanceWishlistItem};
use synapse_core::domain::finance::{Account, FinancialSummary, Transaction, WishlistItem};

impl From<Account> for FinanceAccount {
    fn from(value: Account) -> Self {
        Self {
            id: value.id,
            name: value.name,
            color: value.color,
            icon: value.icon,
            initial_balance: value.initial_balance,
            current_balance: value.current_balance,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<FinanceAccount> for Account {
    fn from(value: FinanceAccount) -> Self {
        Self {
            id: value.id,
            name: value.name,
            color: value.color,
            icon: value.icon,
            initial_balance: value.initial_balance,
            current_balance: value.current_balance,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<Transaction> for FinanceTransaction {
    fn from(value: Transaction) -> Self {
        Self {
            id: value.id,
            description: value.description,
            amount: value.amount,
            expected_amount: value.expected_amount,
            type_: value.type_,
            category: value.category,
            date: value.date,
            status: value.status,
            is_paid: value.is_paid,
            paid_amount: value.paid_amount,
            is_recurring: value.is_recurring,
            recurrence_period: value.recurrence_period,
            due_date: value.due_date,
            account_id: value.account_id,
            destination_account_id: value.destination_account_id,
            linked_loan_id: value.linked_loan_id,
            person: value.person,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<FinanceTransaction> for Transaction {
    fn from(value: FinanceTransaction) -> Self {
        Self {
            id: value.id,
            description: value.description,
            amount: value.amount,
            expected_amount: value.expected_amount,
            type_: value.type_,
            category: value.category,
            date: value.date,
            status: value.status,
            is_paid: value.is_paid,
            paid_amount: value.paid_amount,
            is_recurring: value.is_recurring,
            recurrence_period: value.recurrence_period,
            due_date: value.due_date,
            account_id: value.account_id,
            destination_account_id: value.destination_account_id,
            linked_loan_id: value.linked_loan_id,
            person: value.person,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<WishlistItem> for FinanceWishlistItem {
    fn from(value: WishlistItem) -> Self {
        Self {
            id: value.id,
            title: value.title,
            price: value.price,
            priority: value.priority,
            category: value.category,
            expected_date: value.expected_date,
            description: value.description,
            link: value.link,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<FinanceWishlistItem> for WishlistItem {
    fn from(value: FinanceWishlistItem) -> Self {
        Self {
            id: value.id,
            title: value.title,
            price: value.price,
            priority: value.priority,
            category: value.category,
            expected_date: value.expected_date,
            description: value.description,
            link: value.link,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<FinancialSummary> for FinanceSummary {
    fn from(value: FinancialSummary) -> Self {
        Self {
            income: value.income,
            expense: value.expense,
            balance: value.balance,
            total_balance: value.total_balance,
        }
    }
}
