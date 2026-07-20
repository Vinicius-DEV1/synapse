import { useState, useEffect } from 'react';
import { AlertTriangle, X, DatabaseBackup } from 'lucide-react';
import { Portal } from './ui/Portal';

export default function SyncErrorModal() {
  const [errorDetails, setErrorDetails] = useState<{ message: string; isQuota: boolean } | null>(null);

  useEffect(() => {
    const handleSyncError = (e: CustomEvent<{ message: string; code?: string }>) => {
      const { message, code } = e.detail;
      // Trata explicitamente erros de quota excedida ou similares
      const isQuota = code === 'resource-exhausted' || 
                      message.toLowerCase().includes('quota') || 
                      message.toLowerCase().includes('exceeded');
      
      // Se for um erro genérico (ex: offline), ignoramos aqui.
      // Mostramos o modal apenas para erros críticos de cota.
      if (isQuota) {
        setErrorDetails({ message, isQuota: true });
      } else if (message.toLowerCase().includes('permission-denied')) {
        setErrorDetails({ message: 'Acesso negado ao Firebase. Verifique suas credenciais.', isQuota: false });
      }
    };

    window.addEventListener('caderno-sync-error' as any, handleSyncError);
    return () => window.removeEventListener('caderno-sync-error' as any, handleSyncError);
  }, []);

  if (!errorDetails) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1C1C1F] border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-red-500/10 p-6 flex flex-col items-center text-center border-b border-red-500/20">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white/90 mb-1">
            {errorDetails.isQuota ? 'Limite de Cota Excedido' : 'Erro Crítico de Sincronização'}
          </h2>
          <p className="text-sm text-red-200/80">
            A sincronização com a nuvem foi paralisada.
          </p>
        </div>
        
        <div className="p-6">
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-sm text-white/70 leading-relaxed mb-3">
              {errorDetails.isQuota 
                ? 'O limite diário de leituras/escritas gratuitas do Firebase foi atingido (50.000 requisições). O banco de dados recusou a conexão.' 
                : errorDetails.message}
            </p>
            <div className="flex gap-2 items-start text-xs text-brand-300 bg-brand-500/10 p-3 rounded-lg border border-brand-500/20">
              <DatabaseBackup size={16} className="shrink-0 mt-0.5" />
              <p>
                <strong>Seus dados estão salvos localmente</strong> no navegador. Não limpe o cache do navegador e não desinstale o aplicativo, ou você perderá as edições não sincronizadas.
              </p>
            </div>
          </div>

          <button
            onClick={() => setErrorDetails(null)}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 font-medium transition-colors"
          >
            Entendido, manter meus dados locais
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
