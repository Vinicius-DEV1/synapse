import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, KeyRound, ShieldAlert, X, Save, Sparkles, RefreshCw, DatabaseBackup } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/settings';
import type { AppSettings } from '../utils/settings';
import { fetchGeminiModels } from '../services/gemini';
import type { GeminiModel } from '../services/gemini';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'security' | 'ai'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  useEffect(() => {
    if (activeTab === 'ai' && appSettings.geminiApiKey && models.length === 0) {
      loadModels(appSettings.geminiApiKey);
    }
  }, [activeTab]);

  const loadModels = async (key: string) => {
    if (!key) return;
    setLoadingModels(true);
    setModelsError('');
    try {
      const fetched = await fetchGeminiModels(key);
      setModels(fetched);
    } catch (err: any) {
      setModelsError(err.message || 'Erro ao carregar modelos');
    } finally {
      setLoadingModels(false);
    }
  };

  // Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  // Dict Download State
  const [dictDownloading, setDictDownloading] = useState(false);
  const [dictProgress, setDictProgress] = useState(0);

  const handleDownloadDict = () => {
    setDictDownloading(true);
    setDictProgress(0);
    const interval = setInterval(() => {
      setDictProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setAppSettings({ ...appSettings, hasOfflineDictionary: true });
          setDictDownloading(false);
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };

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

  const handleExportBackup = async () => {
    try {
      const res = await window.api.exportBackup();
      if (res.success) {
        alert('Backup salvo com sucesso em: ' + res.path);
      } else if (!res.canceled) {
        alert('Erro ao salvar backup: ' + res.error);
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message);
    }
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
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              IA
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

                <div className="border-t border-white/5 pt-4">
                  <button 
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <DatabaseBackup size={16} />
                    Exportar DB Local (Backup)
                  </button>
                  <p className="text-[11px] text-dark-subtext mt-1.5 text-center">
                    Cria uma cópia física do banco de dados (também criptografada).
                  </p>
                </div>
              </div>
            )}

            {/* IA */}
            {activeTab === 'ai' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Sparkles size={16} className="text-brand-400" />
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={appSettings.geminiApiKey || ''}
                    onChange={(e) => setAppSettings({ ...appSettings, geminiApiKey: e.target.value })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="Sua chave da API..."
                  />
                  <button 
                    type="button"
                    onClick={() => loadModels(appSettings.geminiApiKey)}
                    disabled={!appSettings.geminiApiKey || loadingModels}
                    className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
                    Carregar modelos disponíveis
                  </button>
                </div>
                
                <div className="border-t border-white/5 pt-4">
                  <label className="block text-sm font-medium text-white mb-2">Modelo Principal</label>
                  <select 
                    value={appSettings.geminiModel || 'gemini-1.5-pro'}
                    onChange={(e) => setAppSettings({ ...appSettings, geminiModel: e.target.value })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    {models.length > 0 ? (
                      models.map(m => (
                        <option key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      </>
                    )}
                  </select>
                  {modelsError && <p className="text-xs text-red-400 mt-2">{modelsError}</p>}
                </div>
                
                <div className="border-t border-white/5 pt-4">
                  <label className="block text-sm font-medium text-white mb-2">Destaque de Texto (Chat de IA)</label>
                  <select 
                    value={appSettings.aiChatHighlight || 'glow'}
                    onChange={(e) => setAppSettings({ ...appSettings, aiChatHighlight: e.target.value as 'glow' | 'underline' | 'none' })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value="glow">Brilho Pulsante (Recomendado)</option>
                    <option value="underline">Apenas Sublinhado (Sutil)</option>
                    <option value="none">Nenhum (Invisível)</option>
                  </select>
                  <p className="text-[11px] text-dark-subtext mt-1.5">
                    Define como os trechos de texto que possuem um chat vinculado serão exibidos no editor.
                  </p>
                </div>
                
                <div className="border-t border-white/5 pt-4">
                  <label className="block text-sm font-medium text-white mb-2">Modo do Dicionário (PDF)</label>
                  <select 
                    value={appSettings.dictionaryMode || 'offline'}
                    onChange={(e) => setAppSettings({ ...appSettings, dictionaryMode: e.target.value as 'offline' | 'online' })}
                    className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
                  >
                    <option value="offline">Offline (Banco de Dados Local)</option>
                    <option value="online">Online (IA Inteligente)</option>
                  </select>
                  <p className="text-[11px] text-dark-subtext mt-1.5 mb-3">
                    Define qual motor o Dicionário de PDFs irá usar por padrão ao ser aberto.
                  </p>

                  <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DatabaseBackup size={14} className={appSettings.hasOfflineDictionary ? "text-emerald-400" : "text-dark-subtext"} />
                        <span className="text-xs font-medium text-white">Pacote pt-BR (Offline)</span>
                      </div>
                      {appSettings.hasOfflineDictionary ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">Instalado (12MB)</span>
                      ) : (
                        <span className="text-[10px] bg-white/10 text-dark-subtext px-2 py-0.5 rounded-full">Não instalado</span>
                      )}
                    </div>
                    
                    {!appSettings.hasOfflineDictionary && !dictDownloading && (
                      <button 
                        type="button"
                        onClick={handleDownloadDict}
                        className="w-full mt-2 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        Baixar Dicionário
                      </button>
                    )}
                    
                    {dictDownloading && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${dictProgress}%` }} />
                        </div>
                        <p className="text-[10px] text-dark-subtext text-center mt-1.5">Baixando... {dictProgress}%</p>
                      </div>
                    )}
                  </div>
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
