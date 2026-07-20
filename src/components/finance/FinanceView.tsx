import { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, ArrowRightLeft, Gift, Plus, Trash2, X, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { Transaction, WishlistItem } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';
import PaymentModal from './PaymentModal';

const ImageRenderer = ({ cacheItem }: { cacheItem: any }) => {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const blob = new Blob([cacheItem.data], { type: cacheItem.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [cacheItem]);
  if (!url) return null;
  return <img src={url} className="max-w-full rounded-lg my-2 max-h-64 object-contain shadow-lg border border-white/10" alt="Pasted" />;
};

const DescriptionRenderer = ({ text }: { text: string }) => {
  const [elements, setElements] = useState<React.ReactNode[]>([]);
  useEffect(() => {
    const parse = async () => {
      const parts = text.split(/(\!\[image\]\([a-zA-Z0-9_]+\))/g);
      const newEls = await Promise.all(parts.map(async (part, i) => {
        const match = part.match(/\!\[image\]\(([a-zA-Z0-9_]+)\)/);
        if (match && window.api.imageCache) {
          try {
            const cacheItem = await window.api.imageCache.get(match[1]);
            if (cacheItem) {
              return <ImageRenderer key={i} cacheItem={cacheItem} />;
            }
          } catch(e) {}
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      }));
      setElements(newEls);
    };
    parse();
  }, [text]);
  return <div className="text-sm text-dark-subtext mt-4 leading-relaxed">{elements}</div>;
};

export default function FinanceView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'wishlist'>('dashboard');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistToEdit, setWishlistToEdit] = useState<WishlistItem | null>(null);
  const [selectedWishlistDetails, setSelectedWishlistDetails] = useState<WishlistItem | null>(null);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState<Transaction | null>(null);

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('caderno_finance_collapsed_categories');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      // isCollapsed by default is true (undefined -> true)
      const isCollapsed = prev[category] !== false;
      const newState = { ...prev, [category]: !isCollapsed };
      localStorage.setItem('caderno_finance_collapsed_categories', JSON.stringify(newState));
      return newState;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (window.api && window.api.finance) {
      try {
        const txs = await window.api.finance.getTransactions();
        const wishes = await window.api.finance.getWishlist();
        setTransactions(txs);
        setWishlist(wishes);
      } catch (err) {
        console.error('Failed to load finance data', err);
      }
    }
  };

  const handleCreateTransaction = async (tx: Partial<Transaction>) => {
    if (window.api && window.api.finance) {
      await window.api.finance.createTransaction(tx);
      await loadData();
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (window.api && window.api.finance) {
      await window.api.finance.updateTransaction(id, updates);
      await loadData();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.api && window.api.finance) {
      await window.api.finance.deleteTransaction(id);
      await loadData();
    }
  };

  const handleSaveWishlist = async (item: Partial<WishlistItem>) => {
    if (window.api && window.api.finance) {
      if (wishlistToEdit) {
        await window.api.finance.updateWishlist(wishlistToEdit.id, item);
      } else {
        await window.api.finance.createWishlist(item);
      }
      setWishlistToEdit(null);
      setShowWishlistModal(false);
      await loadData();
    }
  };

  const handleDeleteWishlist = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja apagar este desejo?')) return;
    if (window.api && window.api.finance) {
      await window.api.finance.deleteWishlist(id);
      if (selectedWishlistDetails?.id === id) setSelectedWishlistDetails(null);
      await loadData();
    }
  };

  // Dashboard calculations
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp };
  }, [transactions]);

  const typeLabels: Record<string, { label: string, color: string }> = {
    income: { label: 'Entrada', color: 'text-emerald-400' },
    expense: { label: 'Saída', color: 'text-red-400' },
    loan_made: { label: 'Emprestei', color: 'text-amber-400' },
    loan_taken: { label: 'Peguei Emprestado', color: 'text-indigo-400' }
  };

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
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                  <span className="text-dark-subtext text-sm">Entradas</span>
                  <span className="text-3xl font-semibold text-emerald-400">R$ {totalIncome.toFixed(2)}</span>
                </div>
                <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                  <span className="text-dark-subtext text-sm">Saídas</span>
                  <span className="text-3xl font-semibold text-red-400">R$ {totalExpense.toFixed(2)}</span>
                </div>
                <div className="bg-dark-bg border border-white/5 rounded-xl p-6 flex flex-col gap-2">
                  <span className="text-dark-subtext text-sm">Saldo</span>
                  <span className={`text-3xl font-semibold ${balance >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                    R$ {balance.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            {activeTab === 'transactions' && (
              <div className="flex flex-col gap-8">
                {transactions.length === 0 ? (
                  <div className="text-center text-dark-subtext py-12">
                    Nenhuma transação registrada.
                  </div>
                ) : (
                  Object.entries(
                    transactions.reduce((acc, tx) => {
                      const date = new Date(tx.date);
                      const monthYear = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
                      if (!acc[capitalizedMonthYear]) acc[capitalizedMonthYear] = [];
                      acc[capitalizedMonthYear].push(tx);
                      return acc;
                    }, {} as Record<string, Transaction[]>)
                  ).map(([month, monthTxs]) => (
                    <div key={month} className="flex flex-col gap-3">
                      <h3 className="text-lg font-semibold text-dark-text border-b border-white/5 pb-2">{month}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-dark-subtext text-sm">
                              <th className="pb-3 font-medium">Data</th>
                              <th className="pb-3 font-medium">Descrição</th>
                              <th className="pb-3 font-medium">Tipo</th>
                              <th className="pb-3 font-medium text-right">Valor</th>
                              <th className="pb-3 font-medium"></th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            {monthTxs.map(tx => {
                              const isLoan = tx.type === 'loan_made' || tx.type === 'loan_taken';
                              const paidAmount = tx.paid_amount || 0;
                              const progress = isLoan ? Math.min(100, (paidAmount / tx.amount) * 100) : 0;
                              
                              return (
                                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-3 text-dark-subtext">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                  <td className="py-3">
                                    <div className="font-medium text-dark-text">{tx.description}</div>
                                    {isLoan && (
                                      <div className="mt-1.5 w-48">
                                        <div className="flex justify-between text-xs text-dark-subtext mb-1">
                                          <span>Pago: R$ {paidAmount.toFixed(2)}</span>
                                          <span>{tx.is_paid ? 'Concluído' : `${progress.toFixed(0)}%`}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-dark-bg rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all ${tx.is_paid ? 'bg-brand-500' : 'bg-brand-500/50'}`}
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className={`py-3 ${typeLabels[tx.type]?.color}`}>{typeLabels[tx.type]?.label}</td>
                                  <td className={`py-3 text-right font-medium ${tx.type === 'expense' || tx.type === 'loan_made' ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {tx.type === 'expense' || tx.type === 'loan_made' ? '-' : '+'} R$ {tx.amount.toFixed(2)}
                                  </td>
                                  <td className="py-3 text-right flex justify-end gap-1">
                                    {isLoan && !tx.is_paid && (
                                      <button 
                                        onClick={() => setSelectedTxForPayment(tx)}
                                        className="px-2 py-1 text-xs bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 rounded transition-colors"
                                      >
                                        Pagar
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteTransaction(tx.id)}
                                      className="p-1.5 text-dark-subtext hover:text-red-400 rounded transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
          onSave={handleCreateTransaction} 
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
          onSave={handleUpdateTransaction}
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
