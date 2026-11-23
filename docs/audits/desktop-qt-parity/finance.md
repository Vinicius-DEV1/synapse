# Finance Checklist

This checklist expands DESK-PAR-033. It keeps normal transaction support distinct from the loan/payment flows that remain local demo state.

## Confirmed native coverage

- Accounts, standard income/expense records, transfers, and wishlist records call Qt controller APIs.
- The Qt controller offers basic transaction/account CRUD and transfer methods.
- Core owns richer transaction fields and atomic loan/payment behavior.

## Confirmed loan gap

`FinanceView.qml` creates demo loan records when its local list is empty. Recording a payment mutates that QML list and creates a generic expense; it does not create a Core-linked loan payment or update a persisted parent loan.

## Transaction field matrix

- [ ] Compare Qt and React/Core field-by-field: type, amount, description, category, date, account, destination account, status, paid state, paid amount, due date, expected amount, person, recurrence, and linked loan ID.
- [ ] Preserve cents/rounding invariants in Core rather than doing balance math in QML.
- [ ] Define migration/default behavior for existing basic Qt transactions when richer fields become visible.
- [ ] Test empty/null/legacy values and malformed imported records.

## Loans and payment lifecycle

- [ ] Add typed bridge/controller operations for list/create/update/delete loan and record/reopen payment.
- [ ] Replace seeded objects with canonical persisted records and a true empty state.
- [ ] Let Core create payment cashflow and update parent paid amount/status in one transaction.
- [ ] Select and validate the payment account, payment date, and optional notes/person fields.
- [ ] Support payment history, edit/delete rollback, close/reopen, overdue display, and overpayment rejection.
- [ ] Test app restart and React/Qt cross-client round trip for a loan with multiple payments.

## Pending and recurring transactions

- [ ] Map React pending/future transaction UI and fields to Core’s status/is-paid/due-date semantics.
- [ ] Add recurring creation/edit/cancellation only through a defined canonical schedule contract.
- [ ] Verify balances do not count pending transactions prematurely.
- [ ] Test period filters, account filters, pending confirmation, recurrence boundaries, and timezone/date formatting.

## Acceptance record

- [ ] Core and bridge tests cover atomic payment, rollback, deletion, and rounding.
- [ ] Controller/UI tests cover actual persisted loans, empty states, validation, and error feedback.
- [ ] Same-data comparison verifies dashboard, account cards, payment history, and totals against React.
- [ ] Update DESK-PAR-033 and feature matrix with command/results/date.
