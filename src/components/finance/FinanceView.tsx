import { useState, useEffect } from 'react';
import { Plus, Loader2, Building2, HelpCircle, Trash2, X } from 'lucide-react';
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
import { FinanceHelpModal } from './FinanceHelpModal';
import { Portal } from '../ui/Portal';
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
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [showTxModal, setShowTxModal] = useState(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [selectedWishlistDetails, setSelectedWishlistDetails] = useState<WishlistItem | null>(null);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [wishlistToDeleteId, setWishlistToDeleteId] = useState<string | null>(null);

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

  const handleDeleteWishlist = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const msg = t('finance.deleteWishlistDesc', 'Tem certeza que deseja apagar este desejo?');
    if (window.api?.app?.showConfirm) {
      const confirmed = (await window.api.app.showConfirm({
        title: t('finance.deleteWishlistTitle', 'Excluir Item dos Desejos'),
        message: msg,
        kind: 'warning',
      })) === 1;
      if (!confirmed) return;
      await deleteWishlistItem(id);
      if (selectedWishlistDetails?.id === id) setSelectedWishlistDetails(null);
    } else {
      setWishlistToDeleteId(id);
    }
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
        <p className="text-sm">{t('finance.errorLoading', 'Ocorreu um erro ao carregar os dados financeiros.')}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="flex-1 overflow-auto p-4 sm:p-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">{t('finance.title', 'Finanças Pessoais')}</h1>
              <p className="text-xs text-dark-subtext mt-0.5">{t('finance.subtitle', 'Controle de contas bancárias, receitas, despesas, transferências e metas')}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowHelpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-bg/80 hover:bg-white/5 text-dark-text border border-white/10 transition-all active:scale-95 cursor-pointer"
                title={t('finance.guideTitle', 'Guia do Sistema Financeiro')}
              >
                <HelpCircle size={14} className="text-emerald-400" />
                <span>{t('finance.guide', 'Guia')}</span>
              </button>
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-bg/80 hover:bg-white/5 text-dark-text border border-white/10 transition-all active:scale-95 cursor-pointer"
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
                onNavigateToLoans={() => {}}
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
      />

      <FinanceHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

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
                  className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-4">
                <p className="text-xs text-dark-subtext leading-relaxed">
                  {t('finance.deleteWishlistDesc', 'Tem certeza que deseja apagar este desejo?')}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setWishlistToDeleteId(null)}
                  className="px-3.5 py-1.5 text-xs text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium"
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
                  className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium flex items-center gap-1.5"
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
