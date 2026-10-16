import { useState, memo } from 'react';
import type { Page } from '../../types';
import { triggerToast } from '../ui/ToastContext';
import { deriveMasterKey, decryptText } from '../../services/crypto';
import { useI18n } from '../../i18n';

interface PageUnlockFormProps {
  page: Page;
  encryptedContent: string | null;
  onUnlockSuccess: (decryptedContent: string) => void;
}

export const PageUnlockForm = memo(function PageUnlockForm({ page, encryptedContent, onUnlockSuccess }: PageUnlockFormProps) {
  const { t } = useI18n();
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      triggerToast(t('notes.enterPassword'), 'error');
      return;
    }

    if (!encryptedContent) {
      triggerToast(t('notes.unlockedSuccess'), 'success');
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
      triggerToast(t('notes.unlockedSuccess'), 'success');
      onUnlockSuccess(decrypted);
    } catch (err) {
      console.warn(`[Caderno:Unlock] Falha ao descriptografar página ${page.id}:`, err);
      triggerToast(t('notes.incorrectPassword'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleUnlock} className="mt-8 p-6 bg-dark-card rounded-xl border border-dark-border text-center max-w-md mx-auto">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl text-dark-text font-bold mb-2">{t('notes.locked')}</h3>
      <p className="text-dark-subtext text-sm mb-4">{t('notes.lockedDesc')}</p>
      <input 
        type="password" 
        value={unlockPassword} 
        onChange={e => setUnlockPassword(e.target.value)} 
        placeholder={t('notes.passwordPlaceholder')} 
        className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text mb-4 focus:border-brand-500 outline-none" 
        autoFocus 
        disabled={isSubmitting}
      />
      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? t('notes.unlocking') : t('notes.unlock')}
      </button>
    </form>
  );
});
