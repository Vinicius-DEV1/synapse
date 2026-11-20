use super::models::{FinanceAccount, FinanceSummary, FinanceTransaction, FinanceWishlistItem};
use crate::SynapseError;
use std::sync::Arc;
use synapse_core::domain::finance::{
    acquire_wishlist_item, confirm_pending_transaction, delete_transaction_with_links,
    get_financial_summary_for, record_loan_payment, reopen_loan, update_transaction_with_links,
    FinanceRepository,
};
use synapse_core::Database;

#[derive(uniffi::Object)]
pub struct SynapseFinanceStore {
    database: Database,
}

#[uniffi::export]
impl SynapseFinanceStore {
    #[uniffi::constructor]
    pub fn open(database_path: String) -> Result<Arc<Self>, SynapseError> {
        let database =
            Database::open(database_path).map_err(|msg| SynapseError::IoError { msg })?;
        Ok(Arc::new(Self { database }))
    }

    pub fn get_accounts(&self) -> Result<Vec<FinanceAccount>, SynapseError> {
        FinanceRepository::get_accounts(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_account(&self, account: FinanceAccount) -> Result<FinanceAccount, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        FinanceRepository::create_account_struct(&conn, account.into())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_account(&self, account: FinanceAccount) -> Result<FinanceAccount, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        let rows = FinanceRepository::update_account_struct(&conn, account.clone().into())
            .map_err(map_core_error)?;
        if rows == 0 {
            return Err(not_found("account", &account.id));
        }
        FinanceRepository::get_accounts_conn(&conn)
            .map_err(map_core_error)?
            .into_iter()
            .find(|saved| saved.id == account.id)
            .map(Into::into)
            .ok_or_else(|| not_found("account", &account.id))
    }

    pub fn delete_account(&self, account_id: String) -> Result<bool, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        FinanceRepository::delete_account_conn(&conn, &account_id).map_err(map_core_error)
    }

    pub fn get_transactions(
        &self,
        type_filter: Option<String>,
        account_filter: Option<String>,
    ) -> Result<Vec<FinanceTransaction>, SynapseError> {
        FinanceRepository::get_transactions(
            &self.database,
            type_filter.as_deref(),
            account_filter.as_deref(),
        )
        .map(|items| items.into_iter().map(Into::into).collect())
        .map_err(map_core_error)
    }

    pub fn create_transaction(
        &self,
        transaction: FinanceTransaction,
    ) -> Result<FinanceTransaction, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        FinanceRepository::add_transaction_struct(&conn, transaction.into())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_transaction(
        &self,
        transaction: FinanceTransaction,
    ) -> Result<FinanceTransaction, SynapseError> {
        update_transaction_with_links(&self.database, transaction.into())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn delete_transaction(&self, transaction_id: String) -> Result<bool, SynapseError> {
        delete_transaction_with_links(&self.database, &transaction_id).map_err(map_core_error)
    }

    pub fn confirm_pending_transaction(&self, transaction_id: String) -> Result<(), SynapseError> {
        confirm_pending_transaction(&self.database, &transaction_id).map_err(map_core_error)
    }

    pub fn acquire_wishlist_item(
        &self,
        wishlist_id: String,
        description: String,
        amount: f64,
        account_id: String,
        category: String,
        date: String,
        remove_from_list: bool,
    ) -> Result<FinanceTransaction, SynapseError> {
        acquire_wishlist_item(
            &self.database,
            &wishlist_id,
            &description,
            amount,
            &account_id,
            &category,
            &date,
            remove_from_list,
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn record_loan_payment(
        &self,
        loan_id: String,
        amount: Option<f64>,
        account_id: String,
        payment_date: Option<String>,
    ) -> Result<FinanceTransaction, SynapseError> {
        record_loan_payment(
            &self.database,
            &loan_id,
            amount,
            &account_id,
            payment_date.as_deref(),
        )
        .map(Into::into)
        .map_err(map_core_error)
    }

    pub fn reopen_loan(&self, loan_id: String) -> Result<(), SynapseError> {
        reopen_loan(&self.database, &loan_id).map_err(map_core_error)
    }

    pub fn get_summary_for(
        &self,
        account_id: Option<String>,
        period: Option<String>,
    ) -> Result<FinanceSummary, SynapseError> {
        get_financial_summary_for(&self.database, account_id.as_deref(), period.as_deref())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn get_wishlist(&self) -> Result<Vec<FinanceWishlistItem>, SynapseError> {
        FinanceRepository::get_wishlist(&self.database)
            .map(|items| items.into_iter().map(Into::into).collect())
            .map_err(map_core_error)
    }

    pub fn create_wishlist_item(
        &self,
        item: FinanceWishlistItem,
    ) -> Result<FinanceWishlistItem, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        FinanceRepository::add_wishlist_struct(&conn, item.into())
            .map(Into::into)
            .map_err(map_core_error)
    }

    pub fn update_wishlist_item(
        &self,
        item: FinanceWishlistItem,
    ) -> Result<FinanceWishlistItem, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        let rows = FinanceRepository::update_wishlist_struct(&conn, item.clone().into())
            .map_err(map_core_error)?;
        if rows == 0 {
            return Err(not_found("wishlist item", &item.id));
        }
        FinanceRepository::get_wishlist_conn(&conn)
            .map_err(map_core_error)?
            .into_iter()
            .find(|saved| saved.id == item.id)
            .map(Into::into)
            .ok_or_else(|| not_found("wishlist item", &item.id))
    }

    pub fn delete_wishlist_item(&self, item_id: String) -> Result<bool, SynapseError> {
        let conn = self
            .database
            .lock()
            .map_err(|msg| SynapseError::IoError { msg })?;
        FinanceRepository::delete_wishlist_conn(&conn, &item_id).map_err(map_core_error)
    }

    pub fn get_summary(&self) -> Result<FinanceSummary, SynapseError> {
        FinanceRepository::get_financial_summary(&self.database)
            .map(Into::into)
            .map_err(map_core_error)
    }
}

fn map_core_error(error: synapse_core::error::SynapseError) -> SynapseError {
    match error {
        synapse_core::error::SynapseError::Database(message) => {
            SynapseError::IoError { msg: message }
        }
        other => SynapseError::InvalidInput {
            msg: other.to_string(),
        },
    }
}

fn not_found(entity: &str, id: &str) -> SynapseError {
    SynapseError::InvalidInput {
        msg: format!("{entity} {id} was not found"),
    }
}
