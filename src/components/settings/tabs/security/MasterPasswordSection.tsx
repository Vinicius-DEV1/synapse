import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface MasterPasswordSectionProps {
  onCancel: () => void;
}

export function MasterPasswordSection({ onCancel }: MasterPasswordSectionProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerError = (msg: string) => {
    setPwdError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePasswordSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newPassword.trim()) {
      triggerError('A nova senha não pode ser vazia.');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerError('As senhas não coincidem.');
      return;
    }

    setPwdLoading(true);
    setPwdError('');

    try {
      const res = await window.api.auth.changePassword(newPassword);
      if (res.success) {
        setPwdSuccess(true);
        setTimeout(() => {
          onCancel();
          setPwdSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        triggerError(res.error || 'Erro ao alterar a senha.');
      }
    } catch (err: any) {
      triggerError(err.message || 'Erro ao processar.');
    } finally {
      setPwdLoading(false);
    }
  };

  if (pwdSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-emerald-400 animate-scale-in">
        <ShieldCheck size={48} className="mb-4" />
        <h3 className="text-lg font-bold">Senha Alterada!</h3>
        <p className="text-sm text-center text-dark-subtext mt-2">
          Seu banco de dados foi recriptografado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <button 
        type="button"
        onClick={onCancel}
        className="text-xs text-brand-400 hover:text-brand-300 mb-2 flex items-center gap-1"
      >
        &larr; Voltar
      </button>
      <div>
        <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">
          Nova Senha Mestra
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Digite a nova senha..."
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">
          Confirmar Senha
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Digite a senha novamente..."
        />
      </div>
      
      {pwdError && (
        <div className={`flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm ${shake ? 'animate-shake' : ''}`}>
          <ShieldAlert size={16} />
          {pwdError}
        </div>
      )}

      <button
        type="button"
        onClick={handlePasswordSubmit}
        disabled={pwdLoading}
        className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        {pwdLoading ? 'Alterando...' : 'Confirmar Alteração'}
      </button>
    </div>
  );
}
