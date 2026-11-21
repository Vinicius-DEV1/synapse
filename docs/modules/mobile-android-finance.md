# Native Android Finance Module

**Status:** Native Finance UI and local API are implemented through Kotlin/Compose, UniFFI, `synapse-core`, and SQLite. Firebase account sign-in and cloud synchronization are not implemented for the native Android app. Last reviewed: 2026-11-20.

## Scope

The implementation is limited to the Finance feature in `apps/mobile-android/`. Other Android modules were not migrated to persistence or changed as part of this work. The old Finance sample model, summary card, and transaction dialog were removed; Finance no longer presents sample transactions as user data.

The screen follows the React Finance module's core workflows: account selection and balances, period summaries, income and expense entries, transfers, pending confirmation, loans and partial payments, payment settlement and reopening, wishlist CRUD, and wishlist acquisition. The native guide describes how the local data works and states the cloud-sync limitation.

## Architecture and storage

```text
FinanceScreen / Compose dialogs
        ↓
FinanceViewModel (StateFlow, lifecycle and mutation coordination)
        ↓
FinanceRepository (Dispatchers.IO)
        ↓
SynapseFinanceStore (generated UniFFI API)
        ↓
synapse-core Finance domain and SQLite repository
```

The app opens `synapse-finance.sqlite` in Android's application database directory. Rust owns the schema, migrations, validation, soft deletion, summaries, balances, payment links, and atomic Finance operations. The database is local to this Android installation and is not the React IndexedDB or the desktop SQLite database.

The Android layer exposes typed operations for:

- Listing, creating, updating, and archiving accounts.
- Listing, creating, editing, and archiving transactions, including income, expenses, transfers, and loans.
- Confirming pending cashflow entries and querying summaries by account and `YYYY-MM` period.
- Recording partial or full loan payments, reopening loans, and keeping linked payment rows consistent when edited or deleted.
- Creating, editing, and archiving wishlist entries, and atomically recording acquisitions with optional wishlist removal.

Payment and acquisition flows use SQLite transactions so the associated parent record and cashflow entry commit together. Reopening a loan archives its linked payment rows and resets the aggregate paid balance. Account deletion and regular record deletion use the core soft-delete behavior.

## Validation and performance

- Store calls run on `Dispatchers.IO`; the UI state is exposed through `StateFlow`.
- Stale reads are discarded, and a completed mutation reloads the currently selected account/period before publishing the refreshed snapshot.
- Currency input rejects malformed, non-finite, and out-of-range values. Date inputs use the Compose Material 3 date picker and core date validation for loan payments and wishlist acquisition.
- Transactions are rendered in `LazyColumn` lists. Filtering and search operate on the local result set.
- An empty account list is initialized by the shared core migration with the default `Carteira Principal`; it is a real persisted account with a zero balance, not sample transaction data.

## Security and synchronization limits

- Native Android Finance does **not** authenticate with Firebase, load the Conta Nuvem keychain, or synchronize Finance records to Firestore. No Firebase reads or writes are made by this module.
- The Android Finance SQLite database currently stores Finance columns in plaintext. App-private storage does not constitute field-level encryption.
- The account/password migration and encrypted local key ownership for Android remain open. Do not describe native Finance data as cloud-backed, cross-device, or encrypted at rest.
- Other Android module APIs and persistence are outside this implementation and remain tracked in the [Android audit](../audits/potential-bug-audit-android-2026-11-19.md).

## Verification

Run from the repository root:

```sh
cargo test -p synapse-core domain::finance::tests --lib
cargo test -p synapse-core db::migrations::tests --lib
cargo test -p synapse-bridge-uniffi test_uniffi_finance_store_persists_crud_and_loan_payments --lib
apps/mobile-android/gradlew -p apps/mobile-android :app:compileDebugKotlin
apps/mobile-android/gradlew -p apps/mobile-android :app:connectedDebugAndroidTest
apps/mobile-android/gradlew -p apps/mobile-android :app:assembleDebug
```

`cargo test -p synapse-core domain::finance::tests --lib` passed 12 tests; `cargo test -p synapse-core db::migrations::tests --lib` passed 5; and `cargo test -p synapse-bridge-uniffi --lib` passed 3. On `Medium_Phone_API_37.0`, `:app:connectedDebugAndroidTest :app:assembleDebug` passed both instrumentation tests and produced `apps/mobile-android/app/build/outputs/apk/debug/app-debug.apk` (SHA-256 `10c3ea007b5bdb52dbcb9259f081598627b9417b9777a7cf27ef9662e6454d3a`). The Finance instrumentation test opens a temporary SQLite database through the generated Kotlin bindings and checks account/transaction/wishlist CRUD, pending confirmation, transfers, loan payments/reopening, wishlist acquisition, summary calculation, soft deletion, and persistence after reopening the database. Emulator smoke testing opened the dashboard, created a real expense through the Compose form, and archived it through the transaction list; the summary returned to zero. These checks do not test Firebase or encryption.

## Completion checklist

- [x] Replace the Android Finance demo screen with native Compose Finance views.
- [x] Route Finance persistence and business operations through the UniFFI bridge and `synapse-core`.
- [x] Add schema migrations for transaction update timestamps and loan person fields.
- [x] Cover account, transaction, loan, wishlist, summary, and linked-operation APIs with Rust and Android instrumentation tests.
- [x] Build generated native bindings for the Android ABIs configured by the Gradle project.
- [x] Remove the superseded Finance sample model and demo components.
- [ ] Implement Firebase Authentication, Conta Nuvem key loading, and cloud sync for native Android.
- [ ] Add and verify at-rest encryption for Android Finance data.
- [ ] Complete persistence and sync integration for other Android modules when they are in scope.
