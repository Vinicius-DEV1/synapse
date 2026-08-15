import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';

export function VisitorsManagementSection() {
  const [visitors, setVisitors] = useState<Array<{ id: string; modules: string[] }>>([]);
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [visitorPassword, setVisitorPassword] = useState('');
  const [visitorModules, setVisitorModules] = useState<Record<string, boolean>>({
    library: false,
    finance: false,
    notes: false
  });
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');

  const loadVisitors = async () => {
    try {
      if (window.api?.auth?.getVisitors) {
        const v = await window.api.auth.getVisitors();
        setVisitors(v);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  const handleCreateVisitor = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!visitorPassword.trim()) {
      setPwdError('A senha não pode ser vazia');
      return;
    }
    const modules = Object.entries(visitorModules).filter(([_, v]) => v).map(([k]) => k);
    if (modules.length === 0) {
      setPwdError('Selecione ao menos um módulo');
      return;
    }

    setVisitorLoading(true);
    setPwdError('');
    try {
      const res = await window.api.auth.createVisitor(visitorPassword, modules);
      if (res.success) {
        setVisitorPassword('');
        setVisitorModules({ library: false, finance: false, notes: false });
        setShowAddVisitor(false);
        loadVisitors();
      } else {
        setPwdError(res.error || 'Erro ao criar visitante');
      }
    } catch (err: any) {
      setPwdError(err.message);
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

  return (
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
  );
}
