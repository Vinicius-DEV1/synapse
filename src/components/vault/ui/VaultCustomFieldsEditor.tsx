import { Plus, Trash2 } from 'lucide-react';
import type { VaultCustomField } from '../../../types';

interface VaultCustomFieldsEditorProps {
  customFields: VaultCustomField[];
  onChange: (fields: VaultCustomField[]) => void;
}

export function VaultCustomFieldsEditor({ customFields, onChange }: VaultCustomFieldsEditorProps) {
  const handleAddField = () => {
    onChange([...customFields, { key: '', value: '', type: 'text' }]);
  };

  const handleUpdateField = (index: number, updates: Partial<VaultCustomField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleRemoveField = (index: number) => {
    onChange(customFields.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider">Campos Adicionais</h3>
        <button 
          onClick={handleAddField}
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
              onChange={e => handleUpdateField(idx, { key: e.target.value })}
              className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-sm text-dark-text focus:outline-none focus:border-brand-500"
            />
            <input 
              type={field.type === 'hidden' ? 'password' : 'text'} 
              placeholder="Valor" 
              value={field.value}
              onChange={e => handleUpdateField(idx, { value: e.target.value })}
              className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-sm text-dark-text font-mono focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <select 
              value={field.type}
              onChange={e => handleUpdateField(idx, { type: e.target.value as VaultCustomField['type'] })}
              className="bg-dark-bg text-xs border border-white/10 rounded p-1 text-dark-subtext"
            >
              <option className="bg-dark-bg text-white" value="text">Texto</option>
              <option className="bg-dark-bg text-white" value="hidden">Oculto</option>
              <option className="bg-dark-bg text-white" value="url">URL</option>
            </select>
            <button 
              onClick={() => handleRemoveField(idx)}
              className="p-1.5 text-dark-subtext hover:text-red-400 bg-white/5 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
