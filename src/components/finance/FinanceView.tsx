import { useState, useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, Scale, Gift, Plus, Loader2, Building2 } from 'lucide-react';
import type { Transaction, WishlistItem } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';
import PaymentModal from './PaymentModal';
import { useFinance } from './hooks/useFinance';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../utils/constants';
import { DashboardMetrics } from './ui/DashboardMetrics';
import { TransactionList } from './ui/TransactionList';
import { LoansTab } from './ui/LoansTab';
import { WishlistTab } from './ui/WishlistTab';
import { WishlistDetailsModal } from './ui/WishlistDetailsModal';
import { AccountManagerModal } from './ui/AccountManagerModal';
import { calculateAccountBalance } from './ui/AccountCards';

export default function FinanceView() {
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'loans' | 'wishlist'>('dashboard');
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [selectedWishlistDetails, setSelectedWishlistDetails] = useState<WishlistItem | null>(null);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState<Transaction | null>(null);

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
  const { totalIncome, totalExpense, balance, loansList, regularTransactions } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    const filtered = selectedAccountId === 'all'
      ? transactions
      : transactions.filter(t => (t.account_id || 'default-wallet') === selectedAccountId || t.destination_account_id === selectedAccountId);

    for (const t of filtered) {
      const amount = Number(t.amount || 0);
      const accId = t.account_id || 'default-wallet';

      if (t.type === 'income') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          inc += amount;
        }
      } else if (t.type === 'expense') {
        if (selectedAccountId === 'all' || accId === selectedAccountId) {
          exp += amount;
        }
      } else if (t.type === 'transfer' && selectedAccountId !== 'all') {
        if (t.destination_account_id === selectedAccountId) {
          inc += amount;
        }
        if (accId === selectedAccountId) {
          exp += amount;
        }
      }
    }

    let calculatedBalance = 0;
    if (selectedAccountId === 'all') {
      calculatedBalance = accounts.reduce((sum, acc) => sum + calculateAccountBalance(acc, transactions), 0);
    } else {
      const targetAcc = accounts.find(a => a.id === selectedAccountId);
      calculatedBalance = targetAcc ? calculateAccountBalance(targetAcc, transactions) : (inc - exp);
    }

    const loans = transactions.filter((t) => t.type === 'loan_made' || t.type === 'loan_taken');
    const regulars = transactions.filter((t) => t.type === 'income' || t.type === 'expense' || t.type === 'transfer');

    return {
      totalIncome: inc,
      totalExpense: exp,
      balance: calculatedBalance,
      loansList: loans,
      regularTransactions: regulars
    };
  }, [transactions, accounts, selectedAccountId]);

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
        <div className="max-w-5xl mx-auto flex flex-col gap-3.5">
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
                onClick={() => setShowTxModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-md shadow-brand-600/20"
              >
                <Plus size={15} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-2.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text border border-transparent'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Visão Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'transactions'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text border border-transparent'
              }`}
            >
              <ArrowRightLeft size={14} />
              <span>Transações ({regularTransactions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'loans'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text border border-transparent'
              }`}
            >
              <Scale size={14} />
              <span>Empréstimos & Dívidas ({loansList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'wishlist'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text border border-transparent'
              }`}
            >
              <Gift size={14} />
              <span>Desejos & Futuro ({wishlist.length})</span>
            </button>
          </div>

          {/* Tab Content Container */}
          <div className="bg-dark-card/40 border border-white/5 rounded-xl p-4 sm:p-5 min-h-[360px]">
            {activeTab === 'dashboard' && (
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
                onNavigateToLoans={() => setActiveTab('loans')}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionList
                transactions={transactions}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onDelete={deleteTransaction}
                onPayLoan={setSelectedTxForPayment}
              />
            )}

            {activeTab === 'loans' && (
              <LoansTab
                loans={loansList}
                onAddLoan={() => setShowTxModal(true)}
                onPayLoan={setSelectedTxForPayment}
                onMarkAsPaid={markLoanAsPaid}
                onReopenLoan={reopenLoan}
                onDeleteLoan={deleteTransaction}
              />
            )}

            {activeTab === 'wishlist' && (
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
          accounts={accounts}
          defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
          onClose={() => setShowTxModal(false)}
          onSave={createTransaction}
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

