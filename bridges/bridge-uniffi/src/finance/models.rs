#[derive(uniffi::Record, Clone)]
pub struct FinanceAccount {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub initial_balance: Option<f64>,
    pub current_balance: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct FinanceTransaction {
    pub id: String,
    pub description: String,
    pub amount: f64,
    pub expected_amount: Option<f64>,
    pub type_: String,
    pub category: String,
    pub date: String,
    pub status: Option<String>,
    pub is_paid: Option<i32>,
    pub paid_amount: Option<f64>,
    pub is_recurring: Option<i32>,
    pub recurrence_period: Option<String>,
    pub due_date: Option<String>,
    pub account_id: Option<String>,
    pub destination_account_id: Option<String>,
    pub linked_loan_id: Option<String>,
    pub person: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct FinanceWishlistItem {
    pub id: String,
    pub title: String,
    pub price: f64,
    pub priority: String,
    pub category: Option<String>,
    pub expected_date: Option<String>,
    pub description: Option<String>,
    pub link: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct FinanceSummary {
    pub income: f64,
    pub expense: f64,
    pub balance: f64,
    pub total_balance: f64,
}
