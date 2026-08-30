import { useState, useMemo } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import type { Transaction } from '../../../types';
import { LoanSummaryCards } from './LoanSummaryCards';
import { LoanCard } from './LoanCard';

interface LoansTabProps {
  loans: Transaction[];
  onAddLoan: () => void;
  onPayLoan: (loan: Transaction) => void;
  onMarkAsPaid: (id: string) => void;
  onReopenLoan: (id: string) => void;
  onDeleteLoan: (id: string) => void;
}

function isLoanOverdue(loan: Transaction): boolean {
  const isPaid = Boolean(loan.is_paid) || (Number(loan.amount) > 0 && Number(loan.paid_amount || 0) >= Number(loan.amount) - 0.001);
  if (isPaid || !loan.due_date) return false;
  const parts = loan.due_date.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

export function LoansTab({
  loans,
  onAddLoan,
  onPayLoan,
  onMarkAsPaid,
  onReopenLoan,
  onDeleteLoan
}: LoansTabProps) {
  const [directionFilter, setDirectionFilter] = useState<'all' | 'loan_made' | 'loan_taken'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'overdue' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const overdueCount = useMemo(() => {
    return loans.filter(isLoanOverdue).length;
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Direction filter
      if (directionFilter !== 'all' && loan.type !== directionFilter) {
        return false;
      }

      // Status filter
      const isPaid = Boolean(loan.is_paid) || (Number(loan.amount) > 0 && Number(loan.paid_amount || 0) >= Number(loan.amount) - 0.001);
      if (statusFilter === 'active' && isPaid) {
        return false;
      }
      if (statusFilter === 'overdue' && !isLoanOverdue(loan)) {
        return false;
      }
      if (statusFilter === 'completed' && !isPaid) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = loan.description.toLowerCase().includes(q);
        const matchesCat = (loan.category || '').toLowerCase().includes(q);
        if (!matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [loans, directionFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top metrics summary */}
      <LoanSummaryCards loans={loans} />

      {/* Filter and action toolbar */}
      <div className="bg-dark-bg/60 border border-white/5 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Direction filters */}
          <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                directionFilter === 'all'
                  ? 'bg-brand-500/20 text-brand-400 font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDirectionFilter('loan_made')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                directionFilter === 'loan_made'
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              A Receber
            </button>
            <button
              onClick={() => setDirectionFilter('loan_taken')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                directionFilter === 'loan_taken'
                  ? 'bg-indigo-500/20 text-indigo-400 font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              A Pagar (Dívidas)
            </button>
          </div>

          {/* Status filters */}
          <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white/10 text-dark-text font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              Todos Status
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-amber-500/20 text-amber-400 font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              Ativos
            </button>
            {overdueCount > 0 && (
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-500/20 text-rose-400 font-medium'
                    : 'text-rose-400/80 hover:text-rose-400'
                }`}
              >
                Vencidos ({overdueCount})
              </button>
            )}
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                  : 'text-dark-subtext hover:text-dark-text'
              }`}
            >
              Quitados
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-44">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-dark-bg border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-dark-text focus:border-brand-500/50 outline-none"
            />
          </div>

          {/* Add button */}
          <button
            onClick={onAddLoan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 whitespace-nowrap shadow-md shadow-brand-600/20"
          >
            <Plus size={14} />
            <span>Novo Empréstimo</span>
          </button>
        </div>
      </div>

      {/* Loans list */}
      {filteredLoans.length === 0 ? (
        <div className="text-center text-dark-subtext py-12 bg-dark-bg/30 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2">
          <Filter size={24} className="text-dark-subtext/40 mb-1" />
          <p className="text-sm">Nenhum empréstimo ou dívida encontrado para os filtros selecionados.</p>
          <button
            onClick={onAddLoan}
            className="mt-2 text-xs text-brand-400 hover:underline"
          >
            Registrar novo empréstimo agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredLoans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onPay={onPayLoan}
              onMarkAsPaid={onMarkAsPaid}
              onReopen={onReopenLoan}
              onDelete={onDeleteLoan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
