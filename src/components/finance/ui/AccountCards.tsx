import { useMemo } from 'react';
import { Settings, Wallet, Layers } from 'lucide-react';
import type { Account, Transaction } from '../../../types';

interface AccountCardsProps {
  accounts: Account[];
  transactions: Transaction[];
  selectedAccountId: string | 'all';
  onSelectAccount: (accountId: string | 'all') => void;
  onOpenAccountManager: () => void;
}

export function calculateAccountBalance(acc: Account, transactions: Transaction[]): number {
  let bal = Number(acc.initial_balance || 0);

  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    const txAccountId = tx.account_id || 'default-wallet';

    if (tx.type === 'income' && txAccountId === acc.id) {
      bal += amount;
    } else if (tx.type === 'expense' && txAccountId === acc.id) {
      bal -= amount;
    } else if (tx.type === 'loan_made' && txAccountId === acc.id) {
      bal -= amount;
    } else if (tx.type === 'loan_taken' && txAccountId === acc.id) {
      bal += amount;
    } else if (tx.type === 'transfer') {
      if (txAccountId === acc.id) {
        bal -= amount;
      }
      if (tx.destination_account_id === acc.id) {
        bal += amount;
      }
    }
  }

  return bal;
}

export function AccountCards({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onOpenAccountManager,
}: AccountCardsProps) {
  const accountBalances = useMemo(() => {
    return accounts.map((acc) => ({
      account: acc,
      balance: calculateAccountBalance(acc, transactions),
    }));
  }, [accounts, transactions]);

  const totalConsolidated = useMemo(() => {
    return accountBalances.reduce((sum, item) => sum + item.balance, 0);
  }, [accountBalances]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1.5">
          <Wallet size={13} />
          <span>Contas & Carteiras</span>
        </span>
        <button
          onClick={onOpenAccountManager}
          className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          <Settings size={12} />
          <span>Gerenciar Bancos</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* All Accounts card */}
        <button
          type="button"
          onClick={() => onSelectAccount('all')}
          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
            selectedAccountId === 'all'
              ? 'bg-brand-500/15 border-brand-500/40 shadow-sm shadow-brand-500/10'
              : 'bg-dark-bg/60 border-white/5 hover:border-white/10 hover:bg-dark-bg/80'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-1.5">
            <span className="text-[11px] font-medium text-dark-subtext flex items-center gap-1">
              <Layers size={12} className="text-brand-400" />
              <span>Consolidado</span>
            </span>
            {selectedAccountId === 'all' && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            )}
          </div>
          <div className="text-xs font-semibold text-dark-text truncate w-full">Todas as Contas</div>
          <div className={`text-sm font-bold mt-0.5 ${totalConsolidated >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>
            R$ {totalConsolidated.toFixed(2)}
          </div>
        </button>

        {/* Individual Account cards */}
        {accountBalances.map(({ account, balance }) => {
          const isSelected = selectedAccountId === account.id;
          const accColor = account.color || '#10b981';

          return (
            <button
              key={account.id}
              type="button"
              onClick={() => onSelectAccount(account.id)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-white/10 border-white/30 shadow-sm'
                  : 'bg-dark-bg/60 border-white/5 hover:border-white/10 hover:bg-dark-bg/80'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: accColor }}
                />
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="text-xs font-semibold text-dark-text truncate w-full">{account.name}</div>
              <div className={`text-sm font-bold mt-0.5 ${balance >= 0 ? 'text-dark-text' : 'text-rose-400'}`}>
                R$ {balance.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
