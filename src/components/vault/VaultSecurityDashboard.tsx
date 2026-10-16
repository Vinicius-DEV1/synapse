import {
  ShieldCheck,
  Key,
  RefreshCw,
  AlertTriangle,
  Play,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { VaultItem } from '../../types';
import { GoogleGIcon } from './ui/GoogleGIcon';
import { useVaultSecurityAnalysis } from './hooks/useVaultSecurityAnalysis';
import { VaultSecurityCategoryCard } from './ui/VaultSecurityCategoryCard';
import { useTranslation } from '../../i18n';

interface VaultSecurityDashboardProps {
  items: VaultItem[];
  onEditItem: (item: VaultItem) => void;
}

export function VaultSecurityDashboard({ items, onEditItem }: VaultSecurityDashboardProps) {
  const { t } = useTranslation();
  const {
    analyzing,
    progress,
    hasAnalyzed,
    weakItems,
    reusedItems,
    breachedItems,
    googleItems,
    score,
    getScoreColor,
    startAnalysis,
  } = useVaultSecurityAnalysis({ items });

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto p-8 animate-fade-in relative pb-32">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <ShieldCheck size={32} className="text-brand-400" />
              {t('vault.securityDashboard', 'Painel de Segurança')}
            </h1>
            <p className="text-dark-subtext mt-1">{t('vault.securityDashboardDesc', 'Analise a integridade de todas as suas senhas do cofre.')}</p>
          </div>

          <button
            onClick={startAnalysis}
            disabled={analyzing || items.length === 0}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            {analyzing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            {analyzing
              ? t('vault.security.analyzing', 'Analisando...')
              : hasAnalyzed
              ? t('vault.security.analyzeAgain', 'Analisar Novamente')
              : t('vault.security.startAnalysis', 'Iniciar Análise')}
          </button>
        </div>

        {items.length === 0 && (
          <div className="bg-black/20 border border-white/5 rounded-2xl p-8 text-center text-dark-subtext">
            {t('vault.security.emptyVault', 'Você ainda não possui senhas no cofre para analisar.')}
          </div>
        )}

        {analyzing && (
          <div className="bg-dark-card/40 border border-brand-500/20 rounded-2xl p-8 text-center shadow-xl backdrop-blur-sm mb-8 animate-pulse">
            <ShieldCheck size={48} className="mx-auto text-brand-400 mb-4 animate-bounce" />
            <h2 className="text-xl font-semibold text-dark-text mb-2">
              {t('vault.security.checkingItems', 'Verificando {{count}} itens...', { count: items.length })}
            </h2>
            <div className="w-full max-w-md mx-auto bg-black/30 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-brand-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-dark-subtext">
              {t('vault.security.progressDetail', '{{progress}}% concluído (checando força, repetição e vazamentos...)', { progress })}
            </p>
          </div>
        )}

        {hasAnalyzed && !analyzing && (
          <div className="space-y-8 animate-fade-in-up">
            {/* SCORE GERAL */}
            <div className="bg-dark-card/60 border border-white/5 rounded-3xl p-8 shadow-2xl flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="z-10">
                <h2 className="text-lg font-semibold text-dark-subtext mb-1 uppercase tracking-widest">
                  {t('vault.security.vaultHealth', 'Saúde do Cofre')}
                </h2>
                <div className="flex items-end gap-2">
                  <span className={`text-6xl font-bold ${getScoreColor()}`}>{score}</span>
                  <span className="text-2xl text-dark-subtext mb-1">/100</span>
                </div>
                {score === 100 ? (
                  <p className="text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={16} /> {t('vault.security.excellent', 'Excelente! Seu cofre está impenetrável.')}
                  </p>
                ) : score >= 70 ? (
                  <p className="text-yellow-400 mt-2 flex items-center gap-1">
                    <AlertCircle size={16} /> {t('vault.security.good', 'Muito bom, mas pode melhorar alguns detalhes.')}
                  </p>
                ) : (
                  <p className="text-red-400 mt-2 flex items-center gap-1">
                    <AlertTriangle size={16} /> {t('vault.security.warning', 'Atenção! Você tem vulnerabilidades críticas.')}
                  </p>
                )}
              </div>

              <div className="flex gap-4 z-10 flex-wrap">
                {googleItems.length > 0 && (
                  <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-brand-400 mb-1">{googleItems.length}</span>
                    <span className="text-xs text-dark-subtext uppercase tracking-wider">Google SSO</span>
                  </div>
                )}
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-red-400 mb-1">{breachedItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">{t('vault.security.breached', 'Vazadas')}</span>
                </div>
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-orange-400 mb-1">{reusedItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">{t('vault.security.reused', 'Reutilizadas')}</span>
                </div>
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-yellow-400 mb-1">{weakItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">{t('vault.security.weak', 'Fracas')}</span>
                </div>
              </div>
            </div>

            {/* LISTAS DETALHADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <VaultSecurityCategoryCard
                icon={<AlertTriangle size={20} />}
                iconBgColor="bg-red-500/10 text-red-400"
                title={t('vault.security.breached', 'Vazadas')}
                count={breachedItems.length}
                description={t('vault.security.breachedDesc', 'Senhas expostas na internet. Mude imediatamente.')}
                emptyMessage={t('vault.security.noBreached', 'Nenhuma senha vazada!')}
                items={breachedItems}
                extraBadge={(item) => (
                  <div className="text-xs text-red-400 mt-1 font-semibold">
                    {item.breachedCount?.toLocaleString()} vazamentos
                  </div>
                )}
                onEditItem={onEditItem}
              />

              <VaultSecurityCategoryCard
                icon={<RefreshCw size={20} />}
                iconBgColor="bg-orange-500/10 text-orange-400"
                title={t('vault.security.reused', 'Reutilizadas')}
                count={reusedItems.length}
                description={t('vault.security.reusedDesc', 'Usar a mesma senha em vários sites é perigoso.')}
                emptyMessage={t('vault.security.noReused', 'Nenhuma senha reutilizada!')}
                items={reusedItems}
                onEditItem={onEditItem}
              />

              <VaultSecurityCategoryCard
                icon={<Key size={20} />}
                iconBgColor="bg-yellow-500/10 text-yellow-400"
                title={t('vault.security.weak', 'Fracas')}
                count={weakItems.length}
                description={t('vault.security.weakDesc', 'Fáceis de quebrar. Tente senhas mais longas.')}
                emptyMessage={t('vault.security.noWeak', 'Nenhuma senha fraca!')}
                items={weakItems}
                extraBadge={(item) => (
                  <div className="text-xs text-yellow-400 mt-1">
                    Score: {item.strengthScore}/4
                  </div>
                )}
                onEditItem={onEditItem}
              />

              {googleItems.length > 0 && (
                <VaultSecurityCategoryCard
                  icon={<GoogleGIcon size={20} />}
                  iconBgColor="bg-white/5 text-white"
                  title="Google SSO"
                  count={googleItems.length}
                  description="Acesso federado seguro (sem senha local vulnerável)."
                  emptyMessage="Nenhuma conta vinculada."
                  items={googleItems}
                  onEditItem={onEditItem}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
