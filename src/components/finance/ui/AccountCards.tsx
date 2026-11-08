import { useMemo } from 'react';
import { Settings, Wallet, Layers, CheckCircle2 } from 'lucide-react';
import type { Account, Transaction } from '../../../types';
import { useTranslation } from '../../../i18n';
import { formatCurrency } from '../utils/formatCurrency';

interface AccountCardsProps {
  accounts: Account[];
  transactions: Transaction[];
  selectedAccountId: string | 'all';
  onSelectAccount: (accountId: string | 'all') => void;
  onOpenAccountManager: () => void;
}

export function calculateAccountBalance(acc: Account, transactions: Transaction[]): number {
  let balCents = Math.round(Number(acc.initial_balance || 0) * 100);

  for (const tx of transactions) {
    const amountCents = Math.round(Number(tx.amount || 0) * 100);
    const txAccountId = tx.account_id || 'default-wallet';

    if (tx.type === 'income' && txAccountId === acc.id) {
      balCents += amountCents;
    } else if (tx.type === 'expense' && txAccountId === acc.id) {
      balCents -= amountCents;
    } else if (tx.type === 'loan_made' && txAccountId === acc.id) {
      balCents -= amountCents;
    } else if (tx.type === 'loan_taken' && txAccountId === acc.id) {
      balCents += amountCents;
    } else if (tx.type === 'transfer') {
      if (txAccountId === acc.id) {
        balCents -= amountCents;
      }
      if (tx.destination_account_id === acc.id) {
        balCents += amountCents;
      }
    }
  }

  return balCents / 100;
}

export function AccountCards({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onOpenAccountManager,
}: AccountCardsProps) {
  const { t } = useTranslation();

  const accountBalances = useMemo(() => {
    return accounts.map((acc) => ({
      account: acc,
      balance: calculateAccountBalance(acc, transactions),
    }));
  }, [accounts, transactions]);

  const totalConsolidated = useMemo(() => {
    const totalCents = accountBalances.reduce(
      (sum, item) => sum + Math.round(item.balance * 100),
      0
    );
    return totalCents / 100;
  }, [accountBalances]);

  const totalCardsCount = accountBalances.length + 1;
  const gridColsClass = totalCardsCount <= 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : totalCardsCount === 3
    ? 'grid-cols-1 sm:grid-cols-3'
    : totalCardsCount === 4
    ? 'grid-cols-2 sm:grid-cols-4'
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1.5">
          <Wallet size={13} className="text-brand-400" />
          <span>{t('finance.accountsAndWallets', 'Contas & Carteiras')}</span>
        </span>
        <button
          onClick={onOpenAccountManager}
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors p-1 rounded-lg hover:bg-brand-500/10 cursor-pointer"
        >
          <Settings size={12} />
          <span>{t('finance.manageBanks', 'Gerenciar Bancos')}</span>
        </button>
      </div>

      <div className={`grid ${gridColsClass} gap-3`}>
        {/* All Accounts card */}
        <button
          type="button"
          onClick={() => onSelectAccount('all')}
          className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            selectedAccountId === 'all'
              ? 'bg-brand-500/15 border-brand-500/40 shadow-sm shadow-brand-500/10 ring-1 ring-brand-500/30'
              : 'bg-dark-card border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-[11px] font-medium text-dark-subtext flex items-center gap-1.5">
              <Layers size={13} className="text-brand-400" />
              <span>{t('finance.consolidated', 'Consolidado')}</span>
            </span>
            {selectedAccountId === 'all' ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-brand-300 bg-brand-500/20 px-1.5 py-0.5 rounded-full font-medium">
                <CheckCircle2 size={10} />
                Ativo
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-dark-text truncate w-full">{t('finance.allAccountsTitle', 'Todas as Contas')}</div>
            <div className={`text-base sm:text-lg font-bold mt-0.5 tracking-tight ${totalConsolidated >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>
              {formatCurrency(totalConsolidated)}
            </div>
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
              className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-brand-500/10 border-brand-500/40 shadow-sm shadow-brand-500/10 ring-1 ring-brand-500/30'
                  : 'bg-dark-card border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white/10"
                    style={{ backgroundColor: accColor }}
                  />
                  <span className="text-[11px] font-medium text-dark-subtext">Conta</span>
                </div>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-brand-300 bg-brand-500/20 px-1.5 py-0.5 rounded-full font-medium">
                    <CheckCircle2 size={10} />
                    Ativo
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-dark-text truncate w-full">{account.name}</div>
                <div className={`text-base sm:text-lg font-bold mt-0.5 tracking-tight ${balance >= 0 ? 'text-dark-text' : 'text-rose-400'}`}>
                  {formatCurrency(balance)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
