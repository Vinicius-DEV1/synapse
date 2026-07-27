import { useState, useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, Gift, Plus, Trash2, X, Edit2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { Transaction, WishlistItem } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';
import PaymentModal from './PaymentModal';
import { useFinance } from './hooks/useFinance';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../../utils/constants';
import { DescriptionRenderer } from '../ui/RichTextRenderer';
import { DashboardMetrics } from './ui/DashboardMetrics';
import { TransactionList } from './ui/TransactionList';

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
    deleteWishlistItem
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
    setCollapsedCategories(prev => {
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
    const inc = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
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
                activeTab === 'dashboard' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Visão Geral</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'transactions' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <ArrowRightLeft size={18} />
              <span>Transações & Empréstimos</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'wishlist' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
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
              <div className="flex flex-col gap-6">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => { setWishlistToEdit(null); setShowWishlistModal(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-dark-text transition-all"
                  >
                    <Plus size={14} />
                    <span>Adicionar Desejo</span>
                  </button>
                </div>
                
                {wishlist.length === 0 ? (
                  <div className="text-center text-dark-subtext py-12">
                    Lista de desejos vazia.
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {Object.entries(
                      wishlist.reduce((acc, item) => {
                        const cat = item.category || 'Geral';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(item);
                        return acc;
                      }, {} as Record<string, WishlistItem[]>)
                    )
                    // Sort categories alphabetically
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([category, items]) => {
                      // By default, category is collapsed (true) if undefined in state
                      const isCollapsed = collapsedCategories[category] !== false;
                      const totalCategory = items.reduce((acc, item) => acc + (item.price || 0), 0);

                      return (
                        <div key={category} className="flex flex-col gap-3">
                          <button 
                            onClick={() => toggleCategory(category)}
                            className="flex items-center justify-between text-left group w-full p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2 text-lg font-semibold text-dark-text">
                              {isCollapsed ? <ChevronRight size={18} className="text-dark-subtext" /> : <ChevronDown size={18} className="text-dark-subtext" />}
                              {category}
                              <span className="text-xs font-normal text-dark-subtext bg-white/5 px-2 py-0.5 rounded-full ml-2">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-dark-subtext group-hover:text-dark-text transition-colors">
                              R$ {totalCategory.toFixed(2)}
                            </span>
                          </button>
                          
                          {!isCollapsed && (
                            <div className="flex flex-col gap-3 pl-2 border-l border-white/5">
                              {items.map(item => (
                                <div 
                                  key={item.id} 
                                  onClick={() => setSelectedWishlistDetails(item)}
                                  className="bg-dark-bg hover:bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center group cursor-pointer transition-colors"
                                >
                                  <div className="flex flex-col gap-1">
                                    <h3 className="font-medium text-dark-text">{item.title}</h3>
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg font-semibold text-brand-400">R$ {item.price?.toFixed(2) ?? '0.00'}</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        item.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                        item.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      }`}>
                                        {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {item.expected_date && (
                                      <span className="text-xs text-dark-subtext">
                                        Meta: {new Date(item.expected_date).toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                    <button 
                                      onClick={(e) => handleDeleteWishlist(item.id, e)}
                                      className="p-2 text-dark-subtext opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/5 rounded transition-all"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showTxModal && (
        <TransactionModal 
          onClose={() => setShowTxModal(false)} 
          onSave={createTransaction} 
        />
      )}

      {showWishlistModal && (
        <WishlistModal 
          initialData={wishlistToEdit}
          onClose={() => { setShowWishlistModal(false); setWishlistToEdit(null); }} 
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

      {selectedWishlistDetails && (
        <Portal>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedWishlistDetails(null)}>
          <div className="bg-dark-card border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="text-lg font-semibold text-dark-text">Detalhes do Desejo</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setWishlistToEdit(selectedWishlistDetails);
                    setShowWishlistModal(true);
                    setSelectedWishlistDetails(null);
                  }} 
                  className="p-1.5 text-brand-400 hover:text-brand-300 rounded-lg hover:bg-white/5 transition-colors"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteWishlist(selectedWishlistDetails.id)} 
                  className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-white/5 transition-colors"
                  title="Apagar"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={() => setSelectedWishlistDetails(null)} className="p-1.5 text-dark-subtext hover:text-dark-text rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[70vh]">
              <h1 className="text-2xl font-bold text-dark-text mb-2">{selectedWishlistDetails.title}</h1>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Categoria</span>
                  <span className="text-sm font-medium text-dark-text">{selectedWishlistDetails.category || 'Geral'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Custo Estimado</span>
                  <span className="text-xl font-semibold text-brand-400">R$ {selectedWishlistDetails.price?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Prioridade</span>
                  <span className={`text-sm font-medium ${
                              selectedWishlistDetails.priority === 'high' ? 'text-red-400' :
                              selectedWishlistDetails.priority === 'medium' ? 'text-amber-400' :
                              'text-emerald-400'
                            }`}>
                    {selectedWishlistDetails.priority === 'high' ? 'Alta' : selectedWishlistDetails.priority === 'medium' ? 'Média' : 'Baixa'}
                  </span>
                </div>
                {selectedWishlistDetails.expected_date && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-dark-subtext uppercase tracking-wider mb-1">Data Esperada</span>
                    <span className="text-sm font-medium text-dark-text">{new Date(selectedWishlistDetails.expected_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t border-white/5 pt-4">
                <h3 className="text-sm font-medium text-dark-text">Descrição</h3>
                {selectedWishlistDetails.description ? (
                  <DescriptionRenderer text={selectedWishlistDetails.description} />
                ) : (
                  <p className="text-sm text-dark-subtext mt-2 italic">Nenhuma descrição adicionada.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
