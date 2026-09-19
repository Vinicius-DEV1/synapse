import { useState } from 'react';
import { Plus, Loader2, Building2 } from 'lucide-react';
import type { Transaction, WishlistItem, Tab } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';
import PaymentModal from './PaymentModal';
import { useFinance } from './hooks/useFinance';
import { useFinanceMetrics } from './hooks/useFinanceMetrics';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../utils/constants';
import { DashboardMetrics } from './ui/DashboardMetrics';
import { TransactionList } from './ui/TransactionList';
import { LoansTab } from './ui/LoansTab';
import { WishlistTab } from './ui/WishlistTab';
import { WishlistDetailsModal } from './ui/WishlistDetailsModal';
import { AccountManagerModal } from './ui/AccountManagerModal';
import { DeleteTransactionModal } from './ui/DeleteTransactionModal';

type FinanceSection = 'dashboard' | 'transactions' | 'loans' | 'wishlist';

const VALID_SECTIONS = new Set<FinanceSection>(['dashboard', 'transactions', 'loans', 'wishlist']);

function resolveSection(pageId: string | null): FinanceSection {
  if (pageId && VALID_SECTIONS.has(pageId as FinanceSection)) {
    return pageId as FinanceSection;
  }
  return 'dashboard';
}

export default function FinanceView({ tab }: { tab?: Tab }) {
  const activeSection = resolveSection(tab?.pageId ?? null);

  const {
    transactions,
    wishlist,
    accounts,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
    deleteAccount,
    payLoanWithAccount,
    markLoanAsPaid,
    reopenLoan,
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
  } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [selectedWishlistDetails, setSelectedWishlistDetails] = useState<WishlistItem | null>(null);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const handleDeleteRequested = (idOrTx: string | Transaction) => {
    if (typeof idOrTx === 'string') {
      const found = transactions.find((t) => t.id === idOrTx);
      if (found) {
        setTxToDelete(found);
      } else {
        deleteTransaction(idOrTx);
      }
    } else {
      setTxToDelete(idOrTx);
    }
  };

  const [collapsedCategories, setCollapsedCategories] = useLocalStorage<Record<string, boolean>>(
    STORAGE_KEYS.FINANCE_COLLAPSED_CATEGORIES,
    {}
  );

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const isCollapsed = prev[category] !== false;
      return { ...prev, [category]: !isCollapsed };
    });
  };

  const handleSaveTransaction = async (tx: Partial<Transaction>) => {
    if (txToEdit) {
      await updateTransaction(txToEdit.id, tx);
    } else {
      await createTransaction(tx);
    }
    setTxToEdit(null);
    setShowTxModal(false);
  };

  const handleSaveWishlist = async (item: Partial<WishlistItem>) => {
    if (wishlistToEdit) {
      await updateWishlistItem(wishlistToEdit.id, item);
    } else {
      await createWishlistItem(item);
    }
    setWishlistToEdit(null);
    setShowWishlistModal(false);
  };

  const handleDeleteWishlist = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja apagar este desejo?')) return;
    await deleteWishlistItem(id);
    if (selectedWishlistDetails?.id === id) setSelectedWishlistDetails(null);
  };

  // Dashboard calculations with account awareness
  const { totalIncome, totalExpense, balance, loansList } = useFinanceMetrics({
    transactions,
    accounts,
    selectedAccountId,
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-bg">
        <Loader2 size={28} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-bg text-rose-400">
        <p className="text-sm">Ocorreu um erro ao carregar os dados financeiros.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">Finanças Pessoais</h1>
              <p className="text-xs text-dark-subtext mt-0.5">Controle de contas bancárias, receitas, despesas, transferências e metas</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-bg/80 hover:bg-white/5 text-dark-text border border-white/10 transition-all active:scale-95"
                title="Gerenciar Contas Bancárias"
              >
                <Building2 size={14} className="text-brand-400" />
                <span>Bancos ({accounts.length})</span>
              </button>
              <button
                onClick={() => {
                  setTxToEdit(null);
                  setShowTxModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-md shadow-brand-600/20"
              >
                <Plus size={15} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>

          {/* Content — driven by sidebar navigation */}
          <div className="border-t border-white/5 pt-4">
            {activeSection === 'dashboard' && (
              <DashboardMetrics
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                balance={balance}
                loans={loansList}
                accounts={accounts}
                transactions={transactions}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
                onOpenAccountManager={() => setShowAccountModal(true)}
                onNavigateToLoans={() => {
                  /* Loans navigation is handled by the sidebar */
                }}
              />
            )}

            {activeSection === 'transactions' && (
              <TransactionList
                transactions={transactions}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onEdit={(tx) => {
                  setTxToEdit(tx);
                  setShowTxModal(true);
                }}
                onDelete={handleDeleteRequested}
                onPayLoan={setSelectedTxForPayment}
              />
            )}

            {activeSection === 'loans' && (
              <LoansTab
                loans={loansList}
                onAddLoan={() => {
                  setTxToEdit(null);
                  setShowTxModal(true);
                }}
                onPayLoan={setSelectedTxForPayment}
                onMarkAsPaid={markLoanAsPaid}
                onReopenLoan={reopenLoan}
                onEditLoan={(loan) => {
                  setTxToEdit(loan);
                  setShowTxModal(true);
                }}
                onDeleteLoan={handleDeleteRequested}
              />
            )}

            {activeSection === 'wishlist' && (
              <WishlistTab
                wishlist={wishlist}
                collapsedCategories={collapsedCategories}
                toggleCategory={toggleCategory}
                onAddWishlist={() => {
                  setWishlistToEdit(null);
                  setShowWishlistModal(true);
                }}
                onSelectWishlist={setSelectedWishlistDetails}
                onDeleteWishlist={handleDeleteWishlist}
              />
            )}
          </div>
        </div>
      </div>

      {showTxModal && (
        <TransactionModal
          initialData={txToEdit}
          accounts={accounts}
          defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
          onClose={() => {
            setShowTxModal(false);
            setTxToEdit(null);
          }}
          onSave={handleSaveTransaction}
        />
      )}

      {showWishlistModal && (
        <WishlistModal
          initialData={wishlistToEdit}
          onClose={() => {
            setShowWishlistModal(false);
            setWishlistToEdit(null);
          }}
          onSave={handleSaveWishlist}
        />
      )}

      {selectedTxForPayment && (
        <PaymentModal
          transaction={selectedTxForPayment}
          accounts={accounts}
          onClose={() => setSelectedTxForPayment(null)}
          onSave={updateTransaction}
          onPayLoanWithAccount={payLoanWithAccount}
        />
      )}

      {showAccountModal && (
        <AccountManagerModal
          accounts={accounts}
          onClose={() => setShowAccountModal(false)}
          onCreateAccount={createAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
        />
      )}

      {txToDelete && (
        <DeleteTransactionModal
          transaction={txToDelete}
          linkedPaymentsCount={
            (txToDelete.type === 'loan_made' || txToDelete.type === 'loan_taken')
              ? transactions.filter((t) => t.linked_loan_id === txToDelete.id).length
              : 0
          }
          linkedPaymentsTotal={
            (txToDelete.type === 'loan_made' || txToDelete.type === 'loan_taken')
              ? transactions
                  .filter((t) => t.linked_loan_id === txToDelete.id)
                  .reduce((sum, p) => sum + Number(p.amount || 0), 0)
              : 0
          }
          onClose={() => setTxToDelete(null)}
          onConfirm={deleteTransaction}
        />
      )}

      <WishlistDetailsModal
        item={selectedWishlistDetails}
        onClose={() => setSelectedWishlistDetails(null)}
        onEdit={(item) => {
          setWishlistToEdit(item);
          setShowWishlistModal(true);
          setSelectedWishlistDetails(null);
        }}
        onDelete={handleDeleteWishlist}
      />
    </div>
  );
}

