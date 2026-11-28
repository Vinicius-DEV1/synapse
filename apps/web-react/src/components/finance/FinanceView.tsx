import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Plus,
  Loader2,
  Building2,
  HelpCircle,
  Trash2,
  X,
  LayoutDashboard,
  ArrowLeftRight,
  HandCoins,
  Gift,
} from 'lucide-react';
import type { Transaction, WishlistItem, Tab } from '../../types';
import { useFinance } from './hooks/useFinance';
import { useFinanceMetrics } from './hooks/useFinanceMetrics';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../utils/constants';
import { DashboardMetrics } from './ui/DashboardMetrics';
import { TransactionList } from './ui/TransactionList';
import { LoansTab } from './ui/LoansTab';
import { WishlistTab } from './ui/WishlistTab';
import { FinanceModalsHost } from './ui/FinanceModalsHost';
import { PeriodSelector, type PeriodFilter } from './ui/PeriodSelector';

const FinanceHelpModal = lazy(() =>
  import('./FinanceHelpModal').then((m) => ({ default: m.FinanceHelpModal }))
);
import { formatCurrency } from './utils/formatCurrency';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import { useTranslation } from '../../i18n';

type FinanceSection = 'dashboard' | 'transactions' | 'loans' | 'wishlist';

const VALID_SECTIONS = new Set<FinanceSection>(['dashboard', 'transactions', 'loans', 'wishlist']);

function resolveSection(pageId: string | null): FinanceSection {
  if (pageId && VALID_SECTIONS.has(pageId as FinanceSection)) {
    return pageId as FinanceSection;
  }
  return 'dashboard';
}

export default function FinanceView({ tab }: { tab?: Tab }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<FinanceSection>(resolveSection(tab?.pageId ?? null));

  useEffect(() => {
    if (tab?.pageId && VALID_SECTIONS.has(tab.pageId as FinanceSection)) {
      setActiveSection(tab.pageId as FinanceSection);
    }
  }, [tab?.pageId]);

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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [selectedWishlistDetails, setSelectedWishlistDetails] = useState<WishlistItem | null>(null);
  const [selectedWishlistToAcquire, setSelectedWishlistToAcquire] = useState<WishlistItem | null>(null);
  const [selectedTxToConfirmPending, setSelectedTxToConfirmPending] = useState<Transaction | null>(null);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [wishlistToDeleteId, setWishlistToDeleteId] = useState<string | null>(null);

  const handleConfirmAcquireWishlist = useCallback(async (data: {
    amount: number;
    accountId: string;
    date: string;
    category: string;
    description: string;
    deleteFromWishlist: boolean;
  }) => {
    await createTransaction({
      type: 'expense',
      amount: data.amount,
      account_id: data.accountId,
      date: data.date,
      category: data.category,
      description: data.description,
      is_paid: 1,
      status: 'completed',
    });

    if (data.deleteFromWishlist && selectedWishlistToAcquire) {
      await deleteWishlistItem(selectedWishlistToAcquire.id);
    }
  }, [createTransaction, deleteWishlistItem, selectedWishlistToAcquire]);

  const handleConfirmPendingTransaction = useCallback(async (
    txId: string,
    updatedData: {
      amount: number;
      date: string;
      accountId: string;
      description: string;
      category: string;
    }
  ) => {
    await updateTransaction(txId, {
      amount: updatedData.amount,
      date: updatedData.date,
      account_id: updatedData.accountId,
      description: updatedData.description,
      category: updatedData.category,
      is_paid: 1,
      status: 'completed',
    });
    triggerToast('Transação confirmada e debitada/creditada no saldo!', 'success');
    setSelectedTxToConfirmPending(null);
  }, [updateTransaction]);

  useEffect(() => {
    if (!wishlistToDeleteId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setWishlistToDeleteId(null);
      }
    };
    const handleBackPress = (e: Event) => {
      e.preventDefault();
      setWishlistToDeleteId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [wishlistToDeleteId]);

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

  const handleDeleteWishlist = async (id: string, e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation();
    setWishlistToDeleteId(id);
  };

  // Dashboard calculations with account awareness and period filtering
  const { totalIncome, totalExpense, balance, loansList, regularTransactions } = useFinanceMetrics({
    transactions,
    accounts,
    selectedAccountId,
    selectedPeriod,
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
        <p className="text-sm">{t('finance.errorLoading', 'Ocorreu um erro ao carregar os dados financeiros.')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">
                {t('finance.title', 'Finanças Pessoais')}
              </h1>
              <p className="text-xs text-dark-subtext mt-0.5">
                {t('finance.subtitle', 'Controle de contas bancárias, receitas, despesas, transferências, empréstimos e desejos')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-card hover:bg-white/5 text-dark-text border border-white/10 transition-all active:scale-95 cursor-pointer shadow-sm"
                title={t('finance.guideTitle', 'Guia do Sistema Financeiro')}
              >
                <HelpCircle size={14} className="text-emerald-400" />
                <span>{t('finance.guide', 'Guia')}</span>
              </button>
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-card hover:bg-white/5 text-dark-text border border-white/10 transition-all active:scale-95 cursor-pointer shadow-sm"
                title={t('finance.manageBanksTitle', 'Gerenciar Contas Bancárias')}
              >
                <Building2 size={14} className="text-brand-400" />
                <span>{t('finance.accountsCount', 'Bancos ({{count}})', { count: accounts.length })}</span>
              </button>
              <button
                onClick={() => {
                  setTxToEdit(null);
                  setShowTxModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-md shadow-brand-600/20 cursor-pointer"
              >
                <Plus size={15} />
                <span>{t('finance.newTransaction', 'Nova Transação')}</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar with Tabs & Period Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Module Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-dark-card border border-white/[0.06] rounded-xl w-fit shadow-sm">
              <button
                onClick={() => setActiveSection('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeSection === 'dashboard'
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                <LayoutDashboard size={14} className={activeSection === 'dashboard' ? 'text-brand-400' : 'text-dark-subtext'} />
                <span>{t('finance.dashboard', 'Visão Geral')}</span>
              </button>

              <button
                onClick={() => setActiveSection('transactions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeSection === 'transactions'
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                <ArrowLeftRight size={14} className={activeSection === 'transactions' ? 'text-brand-400' : 'text-dark-subtext'} />
                <span>{t('finance.transactions', 'Transações')}</span>
                {regularTransactions.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-dark-text font-normal">
                    {regularTransactions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('loans')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeSection === 'loans'
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                <HandCoins size={14} className={activeSection === 'loans' ? 'text-brand-400' : 'text-dark-subtext'} />
                <span>{t('finance.loans', 'Empréstimos')}</span>
                {loansList.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-normal border border-amber-500/20">
                    {loansList.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('wishlist')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeSection === 'wishlist'
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                <Gift size={14} className={activeSection === 'wishlist' ? 'text-brand-400' : 'text-dark-subtext'} />
                <span>{t('finance.wishlist', 'Desejos & Metas')}</span>
                {wishlist.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-dark-text font-normal">
                    {wishlist.length}
                  </span>
                )}
              </button>
            </div>

            {/* Reference Period Navigator for Dashboard and Transactions */}
            {(activeSection === 'dashboard' || activeSection === 'transactions') && (
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onChangePeriod={setSelectedPeriod}
              />
            )}
          </div>

          {/* Tab Content Section */}
          <div className="pt-1">
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
                onNavigateToLoans={() => setActiveSection('loans')}
                onNavigateToTransactions={() => setActiveSection('transactions')}
                onNewTransaction={() => {
                  setTxToEdit(null);
                  setShowTxModal(true);
                }}
              />
            )}

            {activeSection === 'transactions' && (
              <TransactionList
                transactions={transactions}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                selectedPeriod={selectedPeriod}
                onClearPeriod={() => setSelectedPeriod('all')}
                onEdit={(tx) => {
                  setTxToEdit(tx);
                  setShowTxModal(true);
                }}
                onDelete={handleDeleteRequested}
                onPayLoan={setSelectedTxForPayment}
                onConfirmPending={(tx) => setSelectedTxToConfirmPending(tx)}
                onNewTransaction={() => {
                  setTxToEdit(null);
                  setShowTxModal(true);
                }}
              />
            )}

            {activeSection === 'loans' && (
              <LoansTab
                loans={loansList}
                allTransactions={transactions}
                accounts={accounts}
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
                onAcquireWishlist={(item) => setSelectedWishlistToAcquire(item)}
              />
            )}
          </div>
        </div>
      </div>

      <FinanceModalsHost
        showTxModal={showTxModal}
        txToEdit={txToEdit}
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onCloseTxModal={() => {
          setShowTxModal(false);
          setTxToEdit(null);
        }}
        onSaveTransaction={handleSaveTransaction}
        showWishlistModal={showWishlistModal}
        wishlistToEdit={wishlistToEdit}
        onCloseWishlistModal={() => {
          setShowWishlistModal(false);
          setWishlistToEdit(null);
        }}
        onSaveWishlist={handleSaveWishlist}
        selectedTxForPayment={selectedTxForPayment}
        onClosePaymentModal={() => setSelectedTxForPayment(null)}
        onUpdateTransaction={updateTransaction}
        onPayLoanWithAccount={payLoanWithAccount}
        showAccountModal={showAccountModal}
        onCloseAccountModal={() => setShowAccountModal(false)}
        onCreateAccount={createAccount}
        onUpdateAccount={updateAccount}
        onDeleteAccount={deleteAccount}
        txToDelete={txToDelete}
        transactions={transactions}
        onCloseDeleteModal={() => setTxToDelete(null)}
        onConfirmDeleteTransaction={deleteTransaction}
        selectedWishlistDetails={selectedWishlistDetails}
        onCloseWishlistDetails={() => setSelectedWishlistDetails(null)}
        onEditWishlistItem={(item) => {
          setWishlistToEdit(item);
          setShowWishlistModal(true);
          setSelectedWishlistDetails(null);
        }}
        onDeleteWishlistItem={handleDeleteWishlist}
        onAcquireFromDetails={(item) => {
          setSelectedWishlistDetails(null);
          setSelectedWishlistToAcquire(item);
        }}
        selectedWishlistToAcquire={selectedWishlistToAcquire}
        onCloseAcquireWishlist={() => setSelectedWishlistToAcquire(null)}
        onConfirmAcquireWishlist={handleConfirmAcquireWishlist}
        selectedTxToConfirmPending={selectedTxToConfirmPending}
        onCloseConfirmPendingModal={() => setSelectedTxToConfirmPending(null)}
        onConfirmPendingTransaction={handleConfirmPendingTransaction}
      />

      {showHelpModal && (
        <Suspense fallback={null}>
          <FinanceHelpModal
            isOpen={showHelpModal}
            onClose={() => setShowHelpModal(false)}
          />
        </Suspense>
      )}

      {wishlistToDeleteId && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
            <div
              className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-scale-in overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <Trash2 size={17} />
                  </div>
                  <h3 className="text-sm font-semibold text-white">
                    {t('finance.deleteWishlistTitle', 'Excluir Item dos Desejos')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setWishlistToDeleteId(null)}
                  className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-4 space-y-3">
                <p className="text-xs text-dark-subtext leading-relaxed">
                  {t('finance.deleteWishlistDesc', 'Tem certeza que deseja apagar este desejo? Essa ação não pode ser desfeita.')}
                </p>
                {(() => {
                  const item = wishlist.find((w) => w.id === wishlistToDeleteId);
                  if (!item) return null;
                  return (
                    <div className="bg-dark-bg/80 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-medium text-white truncate block">
                          {item.title}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-dark-subtext">{item.category}</span>
                        )}
                      </div>
                      {item.price ? (
                        <span className="text-xs font-semibold text-white shrink-0">
                          {formatCurrency(item.price)}
                        </span>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setWishlistToDeleteId(null)}
                  className="px-3.5 py-1.5 text-xs text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium cursor-pointer"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = wishlistToDeleteId;
                    setWishlistToDeleteId(null);
                    await deleteWishlistItem(id);
                    if (selectedWishlistDetails?.id === id) setSelectedWishlistDetails(null);
                  }}
                  className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/40 active:scale-95"
                >
                  <Trash2 size={13} />
                  {t('common.delete', 'Excluir')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
