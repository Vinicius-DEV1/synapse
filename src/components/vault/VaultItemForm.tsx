import { Save, RefreshCw, Star, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { VaultItem, VaultGroup } from '../../types';
import { VaultBreachBadge } from './VaultBreachBadge';
import { VaultCustomFieldsEditor } from './ui/VaultCustomFieldsEditor';
import { VaultAuthTypeToggle } from './ui/VaultAuthTypeToggle';
import { useVaultItemFormLogic } from './hooks/useVaultItemFormLogic';

interface VaultItemFormProps {
  item: VaultItem | null;
  groups: VaultGroup[];
  groupId: string | null;
  onSave: () => void;
  onCancel: () => void;
}

const strengthLabels = ['Muito Fraca', 'Fraca', 'Média', 'Forte', 'Muito Forte'];
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'];

export function VaultItemForm({ item, groups, groupId, onSave, onCancel }: VaultItemFormProps) {
  const {
    label,
    setLabel,
    loginType,
    setLoginType,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    url,
    setUrl,
    notes,
    setNotes,
    isFavorite,
    setIsFavorite,
    selectedGroupId,
    setSelectedGroupId,
    customFields,
    setCustomFields,
    passwordStrength,
    checkStrength,
    generatePassword,
    handleSave,
    isSaving,
  } = useVaultItemFormLogic({ item, groupId, onSave });

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto p-8 animate-fade-in relative pb-32">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-text flex items-center gap-3">
              {item ? 'Editar Item' : 'Novo Item do Cofre'}
            </h1>
            <p className="text-dark-subtext text-xs mt-1">Armazene credenciais de forma segura com criptografia de ponta a ponta.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              disabled={isSaving}
              className={`p-2 rounded-xl border transition-colors ${isFavorite ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-black/20 border-white/5 text-dark-subtext hover:text-dark-text'} disabled:opacity-50`}
              title={isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
            >
              <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button 
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-dark-card border border-white/5 hover:bg-white/5 text-dark-text rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSaving || !label.trim()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Salvar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h2 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Identificação</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-dark-subtext mb-1.5">Nome / Serviço *</label>
              <input 
                type="text" 
                value={label} 
                onChange={e => setLabel(e.target.value)}
                placeholder="Ex: Netflix, GitHub, Banco Inter"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Pasta</label>
              <select 
                value={selectedGroupId} 
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">Nenhuma pasta</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tipo de Autenticação */}
        <VaultAuthTypeToggle
          loginType={loginType}
          onChange={(type) => setLoginType(type)}
        />

        {/* Credenciais de Acesso */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h2 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Credenciais</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">
                {loginType === 'google' ? 'E-mail da Conta Google' : 'E-mail'}
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs text-dark-subtext mb-1.5">Usuário (Opcional)</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="joaosilva"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {loginType !== 'google' && (
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
              <div className="relative flex items-center">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value);
                    checkStrength(e.target.value);
                  }}
                  placeholder="Digite ou gere uma senha"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-dark-text font-mono focus:outline-none focus:border-brand-500 transition-colors"
                />
                {password ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-dark-subtext hover:text-white transition-colors"
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                ) : null}
              </div>
              
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
          )}

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
          <h2 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Anotações Seguras</h2>
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
