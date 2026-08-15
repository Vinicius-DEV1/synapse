import { useState, useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, Gift, Plus, Loader2 } from 'lucide-react';
import type { Transaction, WishlistItem } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';
import PaymentModal from './PaymentModal';
import { useFinance } from './hooks/useFinance';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../utils/constants';
import { DashboardMetrics } from './ui/DashboardMetrics';
import { TransactionList } from './ui/TransactionList';
import { WishlistTab } from './ui/WishlistTab';
import { WishlistDetailsModal } from './ui/WishlistDetailsModal';

export default function FinanceView() {
  const {
    transactions,
    wishlist,
    isLoading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'wishlist'>('dashboard');

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

  // Dashboard calculations
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const inc = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const exp = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-bg">
        <Loader2 size={32} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-bg text-red-400">
        <p>Ocorreu um erro ao carregar os dados financeiros.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-dark-text">Finanças Pessoais</h1>

            <div className="flex gap-2">
              <button
                onClick={() => setShowTxModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                <Plus size={16} />
                <span>Nova Transação</span>
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-8 border-b border-white/5 pb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Visão Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'transactions'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <ArrowRightLeft size={18} />
              <span>Transações & Empréstimos</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'wishlist'
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <Gift size={18} />
              <span>Desejos & Futuro</span>
            </button>
          </div>

          <div className="bg-dark-card/50 border border-white/5 rounded-xl p-6 min-h-[400px]">
            {activeTab === 'dashboard' && (
              <DashboardMetrics totalIncome={totalIncome} totalExpense={totalExpense} balance={balance} />
            )}

            {activeTab === 'transactions' && (
              <TransactionList
                transactions={transactions}
                onDelete={deleteTransaction}
                onPayLoan={setSelectedTxForPayment}
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
        <TransactionModal onClose={() => setShowTxModal(false)} onSave={createTransaction} />
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
          onClose={() => setSelectedTxForPayment(null)}
          onSave={updateTransaction}
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
