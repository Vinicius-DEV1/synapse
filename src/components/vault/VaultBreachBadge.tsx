import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import type { BreachCheckResult } from '../../types';

export function VaultBreachBadge({ password }: { password?: string | null }) {
  const [result, setResult] = useState<BreachCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!password) {
      setResult(null);
      return;
    }
    
    let isMounted = true;
    
    const check = async () => {
      setLoading(true);
      try {
        const res = await window.api.vault?.checkBreach(password);
        if (isMounted && res) {
          setResult(res);
        }
      } catch (e) {
        console.error("Erro ao checar vazamento", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    // Pequeno debounce para não spammar a API enquanto digita
    const timer = setTimeout(check, 1000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [password]);

  if (!password) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-dark-subtext bg-white/5 px-3 py-1.5 rounded-lg w-fit animate-pulse">
        <Loader2 size={14} className="animate-spin" />
        Checando vazamentos...
      </div>
    );
  }

  if (!result) return null;

  if (result.breached) {
    return (
      <div className="flex flex-col gap-1 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <AlertTriangle size={16} />
          Senha Comprometida!
        </div>
        <p className="text-xs text-red-400/80">
          Esta senha já apareceu em <strong>{result.count.toLocaleString()}</strong> vazamentos de dados na internet. É altamente recomendável trocá-la.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
      <ShieldCheck size={14} />
      Nenhum vazamento detectado
    </div>
  );
}
