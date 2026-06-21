import { useState, useEffect } from 'react';
import { LayoutDashboard, ArrowRightLeft, Gift, Plus, Trash2 } from 'lucide-react';
import type { Transaction, WishlistItem } from '../../types';
import TransactionModal from './TransactionModal';
import WishlistModal from './WishlistModal';

export default function FinanceView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'wishlist'>('dashboard');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);

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

  const handleDeleteTransaction = async (id: string) => {
    if (window.api && window.api.finance) {
      await window.api.finance.deleteTransaction(id);
      await loadData();
    }
  };

  const handleCreateWishlist = async (item: Partial<WishlistItem>) => {
    if (window.api && window.api.finance) {
      await window.api.finance.createWishlist(item);
      await loadData();
    }
  };

  const handleDeleteWishlist = async (id: string) => {
    if (window.api && window.api.finance) {
      await window.api.finance.deleteWishlist(id);
      await loadData();
    }
  };

  // Dashboard calculations
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

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
              <div className="flex flex-col gap-4">
                {transactions.length === 0 ? (
                  <div className="text-center text-dark-subtext py-12">
                    Nenhuma transação registrada.
                  </div>
                ) : (
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
                        {transactions.map(tx => (
                          <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 text-dark-subtext">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                            <td className="py-3 font-medium text-dark-text">{tx.description}</td>
                            <td className={`py-3 ${typeLabels[tx.type]?.color}`}>{typeLabels[tx.type]?.label}</td>
                            <td className={`py-3 text-right font-medium ${tx.type === 'expense' || tx.type === 'loan_made' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {tx.type === 'expense' || tx.type === 'loan_made' ? '-' : '+'} R$ {tx.amount.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <button 
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="p-1.5 text-dark-subtext hover:text-red-400 rounded transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'wishlist' && (
              <div className="flex flex-col gap-4">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowWishlistModal(true)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wishlist.map(item => (
                      <div key={item.id} className="bg-dark-bg border border-white/5 rounded-xl p-5 flex justify-between items-start group">
                        <div className="flex flex-col gap-1">
                          <h3 className="font-medium text-dark-text">{item.title}</h3>
                          <span className="text-xl font-semibold text-brand-400">R$ {item.estimated_cost.toFixed(2)}</span>
                          {item.expected_date && (
                            <span className="text-xs text-dark-subtext mt-1">
                              Meta: {new Date(item.expected_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteWishlist(item.id)}
                          className="p-1.5 text-dark-subtext opacity-0 group-hover:opacity-100 hover:text-red-400 rounded transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
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
          onClose={() => setShowWishlistModal(false)} 
          onSave={handleCreateWishlist} 
        />
      )}
    </div>
  );
}
