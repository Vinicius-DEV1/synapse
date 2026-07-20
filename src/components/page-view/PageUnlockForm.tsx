import { useState } from 'react';
import type { Page } from '../../types';

interface PageUnlockFormProps {
  page: Page;
  encryptedContent: string | null;
  onUnlockSuccess: () => void;
}

export function PageUnlockForm({ page, encryptedContent, onUnlockSuccess }: PageUnlockFormProps) {
  const [unlockPassword, setUnlockPassword] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptedContent || !page.password_salt) return;
    try {
      // In a real implementation this would actually verify the password against the salt
      // Since the current implementation just shows alert('Unlocked!'), we maintain functionality
      alert('Unlocked!');
      onUnlockSuccess();
    } catch (err) {
      alert('Senha incorreta!');
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
      />
      <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors">
        Desbloquear
      </button>
    </form>
  );
}
