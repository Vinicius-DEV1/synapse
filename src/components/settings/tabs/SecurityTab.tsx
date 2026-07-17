import React, { useState } from 'react';
import { ShieldCheck, KeyRound, ShieldAlert, DatabaseBackup } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';

interface SecurityTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  isChangingPassword: boolean;
  setIsChangingPassword: (val: boolean) => void;
}

export default function SecurityTab({ 
  appSettings, 
  setAppSettings, 
  isChangingPassword, 
  setIsChangingPassword 
}: SecurityTabProps) {
  
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

  const [visitors, setVisitors] = useState<Array<{ id: string; modules: string[] }>>([]);
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [visitorPassword, setVisitorPassword] = useState('');
  const [visitorModules, setVisitorModules] = useState<Record<string, boolean>>({
    library: false,
    finance: false,
    notes: false
  });
  const [visitorLoading, setVisitorLoading] = useState(false);

  const loadVisitors = async () => {
    try {
      const v = await window.api.auth.getVisitors();
      setVisitors(v);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    loadVisitors();
  }, []);

  const handleCreateVisitor = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!visitorPassword.trim()) {
      triggerError('A senha não pode ser vazia');
      return;
    }
    const modules = Object.entries(visitorModules).filter(([_, v]) => v).map(([k]) => k);
    if (modules.length === 0) {
      triggerError('Selecione ao menos um módulo');
      return;
    }

    setVisitorLoading(true);
    try {
      const res = await window.api.auth.createVisitor(visitorPassword, modules);
      if (res.success) {
        setVisitorPassword('');
        setVisitorModules({ library: false, finance: false, notes: false });
        setShowAddVisitor(false);
        loadVisitors();
      } else {
        triggerError(res.error || 'Erro ao criar visitante');
      }
    } catch (err: any) {
      triggerError(err.message);
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleDeleteVisitor = async (id: string) => {
    if (!confirm('Deseja realmente deletar esta senha extra? O visitante perderá acesso a qualquer cofre configurado.')) return;
    try {
      const res = await window.api.auth.deleteVisitor(id);
      if (res.success) {
        loadVisitors();
      } else {
        alert(res.error || 'Erro ao deletar visitante');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isChangingPassword) {
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

  const handleWipeLocalData = async () => {
    if (!confirm('ATENÇÃO: Deseja realmente apagar TODOS os dados locais (banco de dados e arquivos de mídia)?\n\nIsso NÃO apagará seus dados da nuvem. O aplicativo será reiniciado e fará o download de tudo novamente.')) return;
    try {
      await window.api.auth.wipeLocalData();
    } catch (err: any) {
      alert('Erro ao limpar dados locais: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            Bloquear ao Suspender
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            Tranca o app se o PC for suspenso ou bloqueado.
          </span>
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
          value={appSettings.autoLockMinutes}
          onChange={(e) => setAppSettings({ ...appSettings, autoLockMinutes: parseInt(e.target.value) })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option value="0">Nunca</option>
          <option value="5">5 minutos</option>
          <option value="15">15 minutos</option>
          <option value="30">30 minutos</option>
          <option value="60">1 hora</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          Tranca automaticamente após período sem mexer no mouse/teclado.
        </p>
      </div>

      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <KeyRound size={16} /> Senhas Modulares (Visitantes)
            </h3>
            <p className="text-[11px] text-dark-subtext mt-1">
              Crie senhas extras que destrancam apenas módulos específicos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddVisitor(!showAddVisitor)}
            className="px-3 py-1.5 text-xs font-medium bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 rounded-lg transition-colors"
          >
            + Adicionar
          </button>
        </div>

        {showAddVisitor && (
          <div className="mb-4 p-4 bg-black/20 border border-white/5 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-1">Senha do Visitante</label>
              <input
                type="password"
                value={visitorPassword}
                onChange={e => setVisitorPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateVisitor()}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                placeholder="Senha que destrancará os módulos escolhidos..."
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-dark-subtext mb-2">Quais módulos essa senha libera?</label>
              <div className="space-y-2">
                {[
                  { id: 'notes', label: 'Cadernos' },
                  { id: 'library', label: 'Biblioteca' },
                  { id: 'finance', label: 'Finanças' }
                ].map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-brand-500 w-4 h-4"
                      checked={visitorModules[mod.id]}
                      onChange={e => setVisitorModules({...visitorModules, [mod.id]: e.target.checked})}
                    />
                    <span className="text-sm text-gray-300">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {pwdError && (
              <div className="text-xs text-red-400">{pwdError}</div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateVisitor}
                disabled={visitorLoading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                Salvar Visitante
              </button>
              <button
                type="button"
                onClick={() => setShowAddVisitor(false)}
                className="px-4 border border-white/10 hover:bg-white/5 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {visitors.map(visitor => (
            <div key={visitor.id} className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/5">
              <div>
                <div className="text-xs font-medium text-white">Visitante</div>
                <div className="text-[10px] text-dark-subtext uppercase mt-0.5">
                  Módulos: {visitor.modules.join(', ')}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => handleDeleteVisitor(visitor.id)}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded"
              >
                Revogar
              </button>
            </div>
          ))}
          
          {visitors.length === 0 && !showAddVisitor && (
            <div className="text-center p-4 border border-dashed border-white/10 rounded-xl text-dark-subtext text-sm">
              Nenhuma senha de visitante configurada.
            </div>
          )}
        </div>
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

      <div className="border-t border-red-500/20 pt-4 mt-8">
        <button 
          type="button"
          onClick={handleWipeLocalData}
          className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        >
          <ShieldAlert size={16} />
          APAGAR DADOS LOCAIS (FORÇAR SYNC)
        </button>
        <p className="text-[11px] text-red-400/70 mt-1.5 text-center">
          Deleta o banco local e mídias. O app reiniciará e baixará tudo da nuvem novamente.
        </p>
      </div>
    </div>
  );
}
