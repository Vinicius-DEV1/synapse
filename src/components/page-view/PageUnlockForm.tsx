import { useState } from 'react';
import type { Page } from '../../types';
import { triggerToast } from '../ui/ToastContext';
import { deriveMasterKey, decryptText } from '../../services/crypto';

interface PageUnlockFormProps {
  page: Page;
  encryptedContent: string | null;
  onUnlockSuccess: (decryptedContent: string) => void;
}

export function PageUnlockForm({ page, encryptedContent, onUnlockSuccess }: PageUnlockFormProps) {
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      triggerToast('Digite a senha da página.', 'error');
      return;
    }

    if (!encryptedContent) {
      triggerToast('Página desbloqueada!', 'success');
      onUnlockSuccess('');
      return;
    }

    setIsSubmitting(true);
    try {
      const key = await deriveMasterKey(
        unlockPassword,
        page.password_salt || undefined
      );
      const decrypted = await decryptText(encryptedContent, key);
      triggerToast('Página desbloqueada!', 'success');
      onUnlockSuccess(decrypted);
    } catch (err) {
      console.warn(`[Caderno:Unlock] Falha ao descriptografar página ${page.id}:`, err);
      triggerToast('Senha incorreta!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleUnlock} className="mt-8 p-6 bg-dark-card rounded-xl border border-dark-border text-center max-w-md mx-auto">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl text-dark-text font-bold mb-2">Página Trancada</h3>
      <p className="text-dark-subtext text-sm mb-4">Esta página está protegida com criptografia ponta a ponta.</p>
      <input 
        type="password" 
        value={unlockPassword} 
        onChange={e => setUnlockPassword(e.target.value)} 
        placeholder="Senha da página" 
        className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text mb-4 focus:border-brand-500 outline-none" 
        autoFocus 
        disabled={isSubmitting}
      />
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Desbloqueando...' : 'Desbloquear'}
      </button>
    </form>
  );
}
