import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Star } from 'lucide-react';
import type { VaultItem, VaultGroup, VaultCustomField } from '../../types';
import { VaultBreachBadge } from './VaultBreachBadge';
import { VaultCustomFieldsEditor } from './ui/VaultCustomFieldsEditor';

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
  const [selectedGroupId, setSelectedGroupId] = useState(item ? (item.group_id || '') : (groupId || ''));
  
  const [customFields, setCustomFields] = useState<VaultCustomField[]>(() => {
    if (!item?.custom_fields) return [];
    try { return JSON.parse(item.custom_fields); } catch { return []; }
  });

  const [passwordStrength, setPasswordStrength] = useState(item?.password_strength || 0);

  // Calculate strength on mount when editing an item with existing password
  useEffect(() => {
    if (item?.password) {
      checkStrength(item.password);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!label.trim()) return alert('O item precisa de um nome (Rótulo).');
    
    const itemToSave = {
      ...item,
      id: item?.id || crypto.randomUUID(),
      group_id: selectedGroupId || null,
      label,
      username: username || null,
      email: email || null,
      password: password || null,
      url: url || null,
      notes: notes || null,
      custom_fields: customFields.length > 0 ? JSON.stringify(customFields) : null,
      is_favorite: isFavorite ? 1 : 0,
      password_strength: passwordStrength,
      created_at: item?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: item?.deleted_at || null,
      password_changed_at: item?.password_changed_at || null,
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
        symbols: true,
      });
      if (newPass) {
        setPassword(newPass);
        checkStrength(newPass);
      }
    } catch (e) {
      console.error(e);
      // Fallback local criptograficamente seguro
      const fallbackChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const fallbackPass = Array.from(array).map(b => fallbackChars[b % fallbackChars.length]).join('');
      setPassword(fallbackPass);
      checkStrength(fallbackPass);
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
          
          <div className="flex items-center gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isFavorite 
                  ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' 
                  : 'border-white/10 text-dark-subtext hover:text-white'
              }`}
            >
              <Star size={14} className={isFavorite ? 'fill-yellow-400' : ''} />
              Favorito
            </button>
          </div>
        </div>

        {/* Credenciais */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Credenciais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Usuário / Login</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="Ex: vinicius123"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: usuario@gmail.com"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-dark-subtext">Senha</label>
              <button 
                type="button" 
                onClick={generatePassword}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium transition-colors"
              >
                <RefreshCw size={12} /> Gerar Senha Forte
              </button>
            </div>
            <input 
              type="text" 
              value={password} 
              onChange={e => {
                setPassword(e.target.value);
                checkStrength(e.target.value);
              }}
              placeholder="Digite ou gere uma senha"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text font-mono focus:outline-none focus:border-brand-500 transition-colors"
            />
            
            {password && (
              <div className="mt-3 space-y-1.5">
                <div className="flex gap-1 h-1.5 w-full bg-black/40 rounded-full overflow-hidden p-0.5">
                  {[0, 1, 2, 3, 4].map(idx => (
                    <div 
                      key={idx} 
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        idx <= passwordStrength ? strengthColors[passwordStrength] : 'opacity-0'
                      }`}
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
        <VaultCustomFieldsEditor
          customFields={customFields}
          onChange={setCustomFields}
        />

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
