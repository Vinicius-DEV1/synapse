import { AlertTriangle } from 'lucide-react';

interface ChatSetupFormProps {
  prompt: string;
  setPrompt: (p: string) => void;
  selectedModel: string;
  models: any[];
  setSelectedModel: (m: string) => void;
  includeContext: boolean;
  setIncludeContext: (c: boolean) => void;
  error: string | null;
}

export function ChatSetupForm({
  prompt, setPrompt, selectedModel, models, setSelectedModel, includeContext, setIncludeContext, error
}: ChatSetupFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-dark-subtext mb-1">O que deseja analisar?</label>
        <textarea 
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ex: Analise meus cartões e sugira edições para os mais confusos, ou exclua os redundantes."
          className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text resize-none focus:outline-none focus:border-indigo-500 h-28"
        />
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-dark-subtext mb-1">Modelo da IA</label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-indigo-500"
          >
            {models.map(m => (
              <option className="bg-dark-bg text-white" key={m.name} value={m.name}>{m.displayName || m.name}</option>
            ))}
            {models.length === 0 && <option className="bg-dark-bg text-white" value="">Carregando...</option>}
          </select>
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-dark-bg p-4 rounded-xl border border-white/5">
          <input 
            type="checkbox" 
            id="includeContext" 
            checked={includeContext}
            onChange={e => setIncludeContext(e.target.checked)}
            className="w-4 h-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
          />
          <label htmlFor="includeContext" className="text-sm text-dark-text cursor-pointer select-none">
            Enviar contexto do baralho (Essencial para análise)
          </label>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
