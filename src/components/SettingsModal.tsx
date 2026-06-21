import React, { useState } from 'react';
import { Settings, ShieldCheck, KeyRound, ShieldAlert, X, Save } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/settings';
import type { AppSettings } from '../utils/settings';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'security'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());

  // Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setIsChangingPassword(false);
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

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(appSettings);
    onClose();
  };

  const triggerError = (msg: string) => {
    setPwdError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className={`bg-dark-card border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative ${shake ? 'animate-shake' : ''}`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
          <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Configurações</h2>
            <p className="text-xs text-dark-subtext">Segurança e Personalização</p>
          </div>
        </div>

        {/* Tabs */}
        {!isChangingPassword && (
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'general' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Geral
            </button>
            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'editor' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'security' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Segurança
            </button>
          </div>
        )}

        {isChangingPassword ? (
          pwdSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-400 animate-scale-in">
              <ShieldCheck size={48} className="mb-4" />
              <h3 className="text-lg font-bold">Senha Alterada!</h3>
              <p className="text-sm text-center text-dark-subtext mt-2">
                Seu banco de dados foi recriptografado.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-fade-in">
              <button 
                type="button"
                onClick={() => setIsChangingPassword(false)}
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
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={pwdLoading}
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Digite a nova senha..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={pwdLoading}
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Repita a senha..."
                />
              </div>

              {pwdError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-2.5 rounded-lg mt-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pwdLoading ? (
                  <span className="animate-pulse">Criptografando...</span>
                ) : (
                  <>
                    <KeyRound size={16} />
                    Confirmar Alteração
                  </>
                )}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-5 animate-fade-in">
            
            {/* GERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">Salvar estado das abas</span>
                    <span className="block text-xs text-dark-subtext mt-0.5 pr-4">Restaura as abas abertas da última sessão.</span>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      checked={appSettings.restoreTabsOnStartup}
                      onChange={(e) => setAppSettings({ ...appSettings, restoreTabsOnStartup: e.target.checked })}
                      className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
                    />
                    <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.restoreTabsOnStartup ? 'bg-brand-500' : 'bg-white/20'}`}></label>
                  </div>
                </label>
              </div>
            )}

            {/* EDITOR */}
            {activeTab === 'editor' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tamanho da Fonte</label>
                  <select 
                    value={appSettings.fontSize}
                    onChange={(e) => setAppSettings({ ...appSettings, fontSize: e.target.value as any })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value="text-sm">Pequeno (14px)</option>
                    <option value="text-base">Padrão (16px)</option>
                    <option value="text-lg">Grande (18px)</option>
                  </select>
                </div>
                
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">Corretor Ortográfico</span>
                    <span className="block text-xs text-dark-subtext mt-0.5 pr-4">Sublinha palavras incorretas no texto.</span>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      checked={appSettings.spellcheck}
                      onChange={(e) => setAppSettings({ ...appSettings, spellcheck: e.target.checked })}
                      className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
                    />
                    <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.spellcheck ? 'bg-brand-500' : 'bg-white/20'}`}></label>
                  </div>
                </label>
              </div>
            )}

            {/* SEGURANÇA */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">Bloquear ao Suspender</span>
                    <span className="block text-xs text-dark-subtext mt-0.5 pr-4">Tranca o app se o PC for suspenso ou bloqueado.</span>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                      type="checkbox" 
                      checked={appSettings.autoLockOnSuspend}
                      onChange={(e) => setAppSettings({ ...appSettings, autoLockOnSuspend: e.target.checked })}
                      className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
                    />
                    <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.autoLockOnSuspend ? 'bg-brand-500' : 'bg-white/20'}`}></label>
                  </div>
                </label>

                <div className="border-t border-white/5 pt-4">
                  <label className="block text-sm font-medium text-white mb-2">Bloqueio por Inatividade</label>
                  <select 
                    value={appSettings.inactivityTimeoutMinutes}
                    onChange={(e) => setAppSettings({ ...appSettings, inactivityTimeoutMinutes: Number(e.target.value) })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value={0}>Desativado</option>
                    <option value={15}>Após 15 minutos</option>
                    <option value={30}>Após 30 minutos</option>
                    <option value={60}>Após 1 hora</option>
                    <option value={120}>Após 2 horas</option>
                  </select>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound size={16} />
                    Alterar Senha Mestra
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Salvar Configurações
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
