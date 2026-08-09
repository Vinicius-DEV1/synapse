import React, { useState } from 'react';
import { Save, X, Plus, Trash2, Key, RefreshCw, ShieldAlert, Star, ShieldCheck } from 'lucide-react';
import type { VaultItem, VaultGroup, VaultCustomField } from '../../types';
import { VaultBreachBadge } from './VaultBreachBadge';

interface VaultItemFormProps {
  item: VaultItem | null;
  groups: VaultGroup[];
  groupId: string | null;
  onSave: () => void;
  onCancel: () => void;
}

export function VaultItemForm({ item, groups, groupId, onSave, onCancel }: VaultItemFormProps) {
  const [label, setLabel] = useState(item?.label || '');
  const [username, setUsername] = useState(item?.username || '');
  const [email, setEmail] = useState(item?.email || '');
  const [password, setPassword] = useState(item?.password || '');
  const [url, setUrl] = useState(item?.url || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [isFavorite, setIsFavorite] = useState(item?.is_favorite === 1);
  const [selectedGroupId, setSelectedGroupId] = useState(item?.group_id || groupId || '');
  
  const [customFields, setCustomFields] = useState<VaultCustomField[]>(() => {
    if (!item?.custom_fields) return [];
    try { return JSON.parse(item.custom_fields); } catch { return []; }
  });

  const [passwordStrength, setPasswordStrength] = useState(item?.password_strength || 0);

  const handleSave = async () => {
    if (!label.trim()) return alert('O item precisa de um nome (Rótulo).');
    
    const itemToSave = {
      ...item,
      id: item?.id || crypto.randomUUID(),
      group_id: selectedGroupId || '',
      label,
      username,
      email,
      password,
      url,
      notes,
      custom_fields: customFields.length > 0 ? JSON.stringify(customFields) : null,
      is_favorite: isFavorite ? 1 : 0,
      password_strength: passwordStrength,
      created_at: item?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: item?.deleted_at || null,
      password_changed_at: item?.password_changed_at || new Date().toISOString(),
    };

    await window.api.vault?.upsertItem(itemToSave);
    onSave();
  };

  const generatePassword = async () => {
    try {
      const newPass = await window.api.vault?.generatePassword({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
      });
      if (newPass) {
        setPassword(newPass);
        checkStrength(newPass);
      }
    } catch (e) {
      console.error(e);
      // Fallback local se estiver na web sem backend real
      setPassword(Math.random().toString(36).slice(-10) + 'A!1');
    }
  };

  const checkStrength = async (pass: string) => {
    if (!pass) return setPasswordStrength(0);
    try {
      const str = await window.api.vault?.checkStrength(pass);
      setPasswordStrength(str || 0);
    } catch {
      setPasswordStrength(pass.length > 10 ? 3 : 1);
    }
  };

  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
  const strengthLabels = ['Muito Fraca', 'Fraca', 'Razoável', 'Forte', 'Muito Forte'];

  return (
    <div className="max-w-3xl mx-auto w-full p-8 animate-fade-in pb-32">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-dark-text">{item ? 'Editar Item' : 'Novo Item'}</h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-dark-subtext hover:text-white transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2">
            <Save size={16} /> Salvar
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Bloco Principal */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-dark-subtext uppercase tracking-wider mb-2">Rótulo *</label>
              <input 
                type="text" 
                value={label} 
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Minha Conta do Google"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-semibold text-dark-subtext uppercase tracking-wider mb-2">Grupo</label>
              <select 
                value={selectedGroupId} 
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-dark-text focus:outline-none focus:border-brand-500 transition-colors appearance-none"
              >
                <option className="bg-dark-bg text-white" value="">Nenhum Grupo</option>
                {groups.map(g => (
                  <option className="bg-dark-bg text-white" key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${isFavorite ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-white/5 text-dark-subtext hover:text-white'}`}
            >
              <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} /> Favorito
            </button>
          </div>
        </div>

        {/* Credenciais */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-5">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Credenciais</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Nome de Usuário</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5 flex items-center justify-between">
              <span>Senha</span>
              <button onClick={generatePassword} className="text-brand-400 hover:underline flex items-center gap-1 text-xs">
                <RefreshCw size={12} /> Gerar Segura
              </button>
            </label>
            <input 
              type="text" 
              value={password} 
              onChange={e => { setPassword(e.target.value); checkStrength(e.target.value); }}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text font-mono focus:outline-none focus:border-brand-500 transition-colors"
            />
            {password && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-black/30 gap-1">
                  {[0,1,2,3,4].map(level => (
                    <div 
                      key={level} 
                      className={`flex-1 ${passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-transparent'}`} 
                    />
                  ))}
                </div>
                <div className="text-xs text-right opacity-70" style={{ color: passwordStrength > 2 ? '#4ade80' : '#f87171' }}>
                  {strengthLabels[passwordStrength]}
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <VaultBreachBadge password={password} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-dark-subtext mb-1.5">URL / Site</label>
            <input 
              type="text" 
              value={url} 
              onChange={e => setUrl(e.target.value)}
              placeholder="https://exemplo.com"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* Campos Personalizados */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Campos Adicionais</h3>
            <button 
              onClick={() => setCustomFields([...customFields, { key: '', value: '', type: 'text' }])}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <Plus size={14} /> Adicionar Campo
            </button>
          </div>
          
          {customFields.length === 0 && (
             <div className="text-center py-4 text-xs text-dark-subtext bg-black/10 rounded-xl border border-white/5">
               Nenhum campo adicional configurado. Você pode adicionar chaves PIX, perguntas de segurança, TOTP, etc.
             </div>
          )}

          {customFields.map((field, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="flex-1 space-y-3">
                <input 
                  type="text" 
                  placeholder="Nome do Campo (ex: PIN)" 
                  value={field.key}
                  onChange={e => {
                    const newFields = [...customFields];
                    newFields[idx].key = e.target.value;
                    setCustomFields(newFields);
                  }}
                  className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-sm text-dark-text focus:outline-none focus:border-brand-500"
                />
                <input 
                  type={field.type === 'hidden' ? 'password' : 'text'} 
                  placeholder="Valor" 
                  value={field.value}
                  onChange={e => {
                    const newFields = [...customFields];
                    newFields[idx].value = e.target.value;
                    setCustomFields(newFields);
                  }}
                  className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-sm text-dark-text font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <select 
                  value={field.type}
                  onChange={e => {
                    const newFields = [...customFields];
                    newFields[idx].type = e.target.value as any;
                    setCustomFields(newFields);
                  }}
                  className="bg-dark-bg text-xs border border-white/10 rounded p-1 text-dark-subtext"
                >
                  <option className="bg-dark-bg text-white" value="text">Texto</option>
                  <option className="bg-dark-bg text-white" value="hidden">Oculto</option>
                  <option className="bg-dark-bg text-white" value="url">URL</option>
                </select>
                <button 
                  onClick={() => {
                    setCustomFields(customFields.filter((_, i) => i !== idx));
                  }}
                  className="p-1.5 text-dark-subtext hover:text-red-400 bg-white/5 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Anotações Seguras */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Anotações Seguras</h3>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text focus:outline-none focus:border-brand-500 min-h-[120px] font-mono resize-y"
            placeholder="Anotações criptografadas..."
          />
        </div>

      </div>
    </div>
  );
}
