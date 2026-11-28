import React, { lazy, Suspense } from 'react';
import type { Transaction, WishlistItem, Account } from '../../../types';

const TransactionModal = lazy(() => import('../TransactionModal'));
const WishlistModal = lazy(() => import('../WishlistModal'));
const PaymentModal = lazy(() => import('../PaymentModal'));
const AccountManagerModal = lazy(() =>
  import('./AccountManagerModal').then((m) => ({ default: m.AccountManagerModal }))
);
const DeleteTransactionModal = lazy(() =>
  import('./DeleteTransactionModal').then((m) => ({ default: m.DeleteTransactionModal }))
);
const WishlistDetailsModal = lazy(() =>
  import('./WishlistDetailsModal').then((m) => ({ default: m.WishlistDetailsModal }))
);
const AcquireWishlistModal = lazy(() =>
  import('./AcquireWishlistModal').then((m) => ({ default: m.AcquireWishlistModal }))
);
const ConfirmPendingModal = lazy(() =>
  import('./ConfirmPendingModal').then((m) => ({ default: m.ConfirmPendingModal }))
);

interface FinanceModalsHostProps {
  showTxModal: boolean;
  txToEdit: Transaction | null;
  accounts: Account[];
  selectedAccountId: string | 'all';
  onCloseTxModal: () => void;
  onSaveTransaction: (tx: Partial<Transaction>) => Promise<void>;

  showWishlistModal: boolean;
  wishlistToEdit: WishlistItem | null;
  onCloseWishlistModal: () => void;
  onSaveWishlist: (item: Partial<WishlistItem>) => Promise<void>;

  selectedTxForPayment: Transaction | null;
  onClosePaymentModal: () => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  onPayLoanWithAccount: (loan: Transaction, amount: number, targetAccountId: string, paymentDate?: string) => Promise<void>;

  showAccountModal: boolean;
  onCloseAccountModal: () => void;
  onCreateAccount: (account: Partial<Account>) => Promise<void>;
  onUpdateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;

  txToDelete: Transaction | null;
  transactions: Transaction[];
  onCloseDeleteModal: () => void;
  onConfirmDeleteTransaction: (id: string) => Promise<void> | void;

  selectedWishlistDetails: WishlistItem | null;
  onCloseWishlistDetails: () => void;
  onEditWishlistItem: (item: WishlistItem) => void;
  onDeleteWishlistItem: (id: string, e?: React.MouseEvent) => Promise<void>;
  onAcquireFromDetails?: (item: WishlistItem) => void;

  selectedWishlistToAcquire: WishlistItem | null;
  onCloseAcquireWishlist: () => void;
  onConfirmAcquireWishlist: (data: {
    amount: number;
    accountId: string;
    date: string;
    category: string;
    description: string;
    deleteFromWishlist: boolean;
  }) => Promise<void>;

  selectedTxToConfirmPending: Transaction | null;
  onCloseConfirmPendingModal: () => void;
  onConfirmPendingTransaction: (
    txId: string,
    updatedData: {
      amount: number;
      date: string;
      accountId: string;
      description: string;
      category: string;
    }
  ) => Promise<void>;
}

export const FinanceModalsHost = React.memo(function FinanceModalsHost({
  showTxModal,
  txToEdit,
  accounts,
  selectedAccountId,
  onCloseTxModal,
  onSaveTransaction,

  showWishlistModal,
  wishlistToEdit,
  onCloseWishlistModal,
  onSaveWishlist,

  selectedTxForPayment,
  onClosePaymentModal,
  onUpdateTransaction,
  onPayLoanWithAccount,

  showAccountModal,
  onCloseAccountModal,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,

  txToDelete,
  transactions,
  onCloseDeleteModal,
  onConfirmDeleteTransaction,

  selectedWishlistDetails,
  onCloseWishlistDetails,
  onEditWishlistItem,
  onDeleteWishlistItem,
  onAcquireFromDetails,
  selectedWishlistToAcquire,
  onCloseAcquireWishlist,
  onConfirmAcquireWishlist,
  selectedTxToConfirmPending,
  onCloseConfirmPendingModal,
  onConfirmPendingTransaction,
}: FinanceModalsHostProps) {
  const existingPersons = React.useMemo(() => {
    const map = new Map<string, { count: number; canonical: string }>();
    const normalizeKey = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    for (const t of transactions) {
      const raw =
        t.person?.trim() ||
        ((t.type === 'loan_made' || t.type === 'loan_taken') && t.description?.trim()) ||
        '';
      if (raw) {
        const key = normalizeKey(raw);
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { count: 1, canonical: raw });
        }
      }
    }
    return Array.from(map.values())
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.canonical.localeCompare(b.canonical, undefined, { sensitivity: 'base' })
      )
      .map((item) => item.canonical);
  }, [transactions]);

  return (
    <Suspense fallback={null}>
      {showTxModal && (
        <TransactionModal
          initialData={txToEdit}
          accounts={accounts}
          defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
          onClose={onCloseTxModal}
          onSave={onSaveTransaction}
          existingPersons={existingPersons}
        />
      )}

      {showWishlistModal && (
        <WishlistModal
          initialData={wishlistToEdit}
          onClose={onCloseWishlistModal}
          onSave={onSaveWishlist}
        />
      )}

      {selectedTxForPayment && (
        <PaymentModal
          transaction={selectedTxForPayment}
          accounts={accounts}
          onClose={onClosePaymentModal}
          onSave={onUpdateTransaction}
          onPayLoanWithAccount={onPayLoanWithAccount}
        />
      )}

      {showAccountModal && (
        <AccountManagerModal
          accounts={accounts}
          onClose={onCloseAccountModal}
          onCreateAccount={onCreateAccount}
          onUpdateAccount={onUpdateAccount}
          onDeleteAccount={onDeleteAccount}
        />
      )}

      {txToDelete && (
        <DeleteTransactionModal
          transaction={txToDelete}
          linkedPaymentsCount={
            txToDelete.type === 'loan_made' || txToDelete.type === 'loan_taken'
              ? transactions.filter((t) => t.linked_loan_id === txToDelete.id).length
              : 0
          }
          linkedPaymentsTotal={
            txToDelete.type === 'loan_made' || txToDelete.type === 'loan_taken'
              ? transactions
                  .filter((t) => t.linked_loan_id === txToDelete.id)
                  .reduce((sum, p) => sum + Number(p.amount || 0), 0)
              : 0
          }
          onClose={onCloseDeleteModal}
          onConfirm={onConfirmDeleteTransaction}
        />
      )}

      {selectedWishlistDetails && (
        <WishlistDetailsModal
          item={selectedWishlistDetails}
          onClose={onCloseWishlistDetails}
          onEdit={onEditWishlistItem}
          onDelete={onDeleteWishlistItem}
          onAcquire={onAcquireFromDetails}
        />
      )}

      {selectedWishlistToAcquire && (
        <AcquireWishlistModal
          item={selectedWishlistToAcquire}
          accounts={accounts}
          onClose={onCloseAcquireWishlist}
          onConfirm={onConfirmAcquireWishlist}
        />
      )}

      {selectedTxToConfirmPending && (
        <ConfirmPendingModal
          isOpen={Boolean(selectedTxToConfirmPending)}
          transaction={selectedTxToConfirmPending}
          accounts={accounts}
          onClose={onCloseConfirmPendingModal}
          onConfirm={onConfirmPendingTransaction}
        />
      )}
    </Suspense>
  );
});
