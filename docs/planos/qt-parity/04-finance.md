# 04 — Finance

> **Status**: ✅ Complete | **Complexity**: 🟡 Medium | **Priority**: P2
>
> Core transaction CRUD, accounts with real-time balance aggregation, transfers, category management, filter bar, loans management tab with payments and net balance calculation, wishlist acquisition workflow, delete confirmation modal, and in-depth help guide.

---

## React Reference
- **Components**: `apps/web-react/src/components/finance/` (30 files)
- **Hooks**: `useFinance.ts`, `useFinanceAccounts.ts`, `useFinanceLoans.ts`, `useFinanceMetrics.ts`, `useFinanceTransactions.ts`, `useFinanceWishlist.ts`, `useTransactionForm.ts`
- **Utils**: `utils/formatCurrency.ts`

## Qt Existing & Implemented
- **QML**: `apps/desktop-qt/qml/finance/`
  - Core Views: `FinanceView.qml`, `FinanceHeaderSection.qml`, `FinanceKpiCards.qml`, `AccountCards.qml`, `TransactionsTable.qml`, `WishlistGrid.qml`, `FinanceHelpDialog.qml`
  - Loans Subsystem: `FinanceLoansTab.qml`, `FinanceLoanCard.qml`, `FinancePaymentModal.qml`
  - Wishlist Workflow: `FinanceWishlistDetailsModal.qml`, `FinanceAcquireWishlistModal.qml`, `CreateWishlistModal.qml`
  - Account & Transaction Modals: `AccountManagerModal.qml`, `CreateTransactionModal.qml`, `FinanceDeleteTransactionModal.qml`, `FinancePeriodSelector.qml`
- **Controller**: `apps/desktop-qt/src/controllers/finance/finance_controller.cpp`

---

## Feature Parity Table

| Feature | React File | Qt Status |
|---------|-----------|-----------|
| Main finance view with subtabs | `FinanceView.tsx` | ✅ Done |
| Header section & search | `FinanceHeaderSection.tsx` | ✅ Done |
| Transaction list table | `ui/TransactionList.tsx` | ✅ Done (`TransactionsTable.qml`) |
| Transaction create/edit modal | `TransactionModal.tsx` | ✅ Done (`CreateTransactionModal.qml`) |
| Summary KPI cards (income/expense/balance) | `ui/DashboardMetrics.tsx` | ✅ Done (`FinanceKpiCards.qml`) |
| Account cards with real-time balances | `ui/AccountCards.tsx` | ✅ Done (`AccountCards.qml`) |
| Account manager modal (CRUD) | `ui/AccountManagerModal.tsx` | ✅ Done (`AccountManagerModal.qml`) |
| Help dialog | `FinanceHelpModal.tsx` | ✅ Done (`FinanceHelpDialog.qml`) |
| **Delete transaction confirmation modal** | `ui/DeleteTransactionModal.tsx` | ✅ Done (`FinanceDeleteTransactionModal.qml`) |
| **Period selector** | `ui/PeriodSelector.tsx` | ✅ Done (`FinancePeriodSelector.qml`) |
| **Loans tab** | `ui/LoansTab.tsx` | ✅ Done (`FinanceLoansTab.qml`) |
| **Loan card component** | `ui/LoanCard.tsx` | ✅ Done (`FinanceLoanCard.qml`) |
| **Payment modal (loan amortizations)** | `PaymentModal.tsx` | ✅ Done (`FinancePaymentModal.qml`) |
| **Wishlist tab & grid** | `ui/WishlistTab.tsx` | ✅ Done (`WishlistGrid.qml`) |
| **Wishlist details modal** | `ui/WishlistDetailsModal.tsx` | ✅ Done (`FinanceWishlistDetailsModal.qml`) |
| **Acquire wishlist item modal** | `ui/AcquireWishlistModal.tsx` | ✅ Done (`FinanceAcquireWishlistModal.qml`) |

---

## Implementation Details

1. **Delete Confirmation**:
   - `FinanceDeleteTransactionModal.qml`: Complies with AGENTS.md rule prohibiting unconfirmed deletions and raw browser dialogs. Displays formatted transaction amount, category, date, and description.

2. **Loans Management & Amortization**:
   - `FinanceLoansTab.qml`: Subtab for money lent (A Receber) vs money borrowed (A Pagar). Calculates net position and filters by loan direction.
   - `FinanceLoanCard.qml`: Shows progress bar of paid vs remaining balance.
   - `FinancePaymentModal.qml`: Records partial or total payments on loans, updating balances and appending expense records.

3. **Wishlist Acquisition Flow**:
   - `FinanceWishlistDetailsModal.qml`: Full details inspector for wishlist goals.
   - `FinanceAcquireWishlistModal.qml`: Deducts item price from user-selected account, generates transaction in SQLite, and cleans up wishlist item.
