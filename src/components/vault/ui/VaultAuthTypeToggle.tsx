import type { VaultLoginType } from '../../../types/vault';
import { GoogleGIcon } from './GoogleGIcon';
import { ShieldCheck } from 'lucide-react';

interface VaultAuthTypeToggleProps {
  loginType: VaultLoginType;
  onChange: (type: VaultLoginType) => void;
}

/**
 * Toggle component to switch between traditional password account and Google-linked account.
 */
export function VaultAuthTypeToggle({ loginType, onChange }: VaultAuthTypeToggleProps) {
  const isGoogle = loginType === 'google';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/20 border border-white/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <GoogleGIcon size={16} />
          </div>
          <div>
            <div className="text-xs font-semibold text-dark-text">Conta vinculada ao Google</div>
            <div className="text-[11px] text-dark-subtext">
              Login via &quot;Sign in with Google&quot; (sem necessidade de senha)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(isGoogle ? 'password' : 'google')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500/40 ${
            isGoogle ? 'bg-brand-600' : 'bg-white/10'
          }`}
          role="switch"
          aria-checked={isGoogle}
          title={isGoogle ? 'Alternar para conta com senha' : 'Marcar como conta vinculada ao Google'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isGoogle ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {isGoogle && (
        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-center gap-2.5 animate-fade-in">
          <ShieldCheck size={16} className="text-brand-400 flex-shrink-0" />
          <span>
            Esta conta utiliza autenticação federada do Google. Não é necessário preencher nem gerar uma senha local.
          </span>
        </div>
      )}
    </div>
  );
}
