use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct Account {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub initial_balance: Option<f64>,
    pub current_balance: Option<f64>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct Transaction {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub amount: f64,
    pub expected_amount: Option<f64>,
    #[serde(rename = "type", default)]
    pub type_: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
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

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct WishlistItem {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub price: f64,
    #[serde(default)]
    pub priority: String,
    pub category: Option<String>,
    pub expected_date: Option<String>,
    pub description: Option<String>,
    pub link: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
pub struct FinancialSummary {
    pub income: f64,
    pub expense: f64,
    pub balance: f64,
    pub total_balance: f64,
}
