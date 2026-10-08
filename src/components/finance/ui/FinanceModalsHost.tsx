import React from 'react';
import type { Transaction, WishlistItem, Account } from '../../../types';
import TransactionModal from '../TransactionModal';
import WishlistModal from '../WishlistModal';
import PaymentModal from '../PaymentModal';
import { AccountManagerModal } from './AccountManagerModal';
import { DeleteTransactionModal } from './DeleteTransactionModal';
import { WishlistDetailsModal } from './WishlistDetailsModal';

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
  onPayLoanWithAccount: (loan: Transaction, amount: number, targetAccountId: string) => Promise<void>;

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
}: FinanceModalsHostProps) {
  return (
    <>
      {showTxModal && (
        <TransactionModal
          initialData={txToEdit}
          accounts={accounts}
          defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
          onClose={onCloseTxModal}
          onSave={onSaveTransaction}
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

      <WishlistDetailsModal
        item={selectedWishlistDetails}
        onClose={onCloseWishlistDetails}
        onEdit={onEditWishlistItem}
        onDelete={onDeleteWishlistItem}
      />
    </>
  );
});
