import React, { useState, useEffect } from 'react';
import { X, BookType, Globe, Database, Sparkles, RefreshCw } from 'lucide-react';
import { getSettings } from '../../utils/settings';
import { promptGemini } from '../../services/gemini';

interface DictionaryModalProps {
  text: string;
  onClose: () => void;
}

export default function DictionaryModal({ text, onClose }: DictionaryModalProps) {
  const settings = getSettings();
  const [mode, setMode] = useState<'offline' | 'online'>('offline');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDefinition(mode);
  }, [text, mode]);

  const fetchDefinition = async (currentMode: 'offline' | 'online') => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      if (currentMode === 'offline') {
        if (!settings.hasOfflineDictionary) {
          setTimeout(() => {
            setError('Banco de dados offline não encontrado. Para usar o modo offline, baixe o pacote de idioma nas Configurações.');
            setLoading(false);
          }, 800);
          return;
        }

        // Mocking um banco de dados SQLite Local (Offline)
        // Para a demonstração, retornaremos uma definição genérica ou identificada simulando o DB
        setTimeout(() => {
          const cleanWord = text.trim();
          let markdown = `### ${cleanWord}\\n\\n`;
          markdown += `*sf/sm* (Modo Offline)\\n\\n`;
          markdown += `**Definição Local**\\n`;
          markdown += `1. Definição simulada para a palavra "${cleanWord}" extraída do banco de dados local.\\n`;
          markdown += `> Exemplo: O sistema encontrou "${cleanWord}" no dicionário offline sem usar internet.\\n\\n`;
          
          setResult(markdown);
          setLoading(false);
        }, 600);
      } else {
        if (!settings.geminiApiKey) {
          throw new Error('Chave da API do Gemini não configurada. Configure na aba IA das Configurações.');
        }

        const prompt = `Atue como um dicionário e tradutor avançado.
A palavra ou trecho selecionado é: "${text}".
Por favor, forneça:
1. O idioma de origem.
2. A tradução para o Português (se for em outro idioma).
3. A definição clara e concisa.
4. Um exemplo de uso em uma frase.
Formate a resposta em Markdown com títulos breves. Não use saudações.`;

        const response = await promptGemini(
          prompt,
          undefined,
          []
        );
        
        setResult(response);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar definição.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onMouseDown={onClose}>
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl w-[400px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-bg/50">
          <div className="flex items-center gap-2 text-brand-400">
            <BookType size={18} />
            <span className="font-semibold text-sm text-white">Dicionário</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Toggle Mode */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setMode('offline')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  mode === 'offline' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'
                }`}
              >
                <Database size={10} />
                Offline
              </button>
              <button
                onClick={() => setMode('online')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  mode === 'online' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'
                }`}
              >
                <Globe size={10} />
                Online
              </button>
            </div>

            <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Selected Word */}
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-sm font-medium text-dark-text italic truncate">"{text}"</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-dark-subtext">
              <RefreshCw size={24} className="animate-spin mb-3 text-brand-400" />
              <p className="text-xs">
                {mode === 'online' ? 'Consultando IA...' : 'Buscando no banco local...'}
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <p className="text-xs text-red-400 leading-relaxed mb-3">{error}</p>
              {mode === 'offline' && (
                <button 
                  onClick={() => setMode('online')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-white transition-colors"
                >
                  Tentar Modo Online (IA)
                </button>
              )}
            </div>
          ) : result ? (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-brand-400 prose-headings:text-sm prose-headings:font-semibold prose-headings:mb-2 prose-p:text-dark-text/90 prose-p:leading-relaxed">
              <div dangerouslySetInnerHTML={{ 
                __html: result
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/\n/g, '<br/>')
                  .replace(/# (.*?)(?:<br\/>|$)/g, '<h3>$1</h3>')
                  .replace(/## (.*?)(?:<br\/>|$)/g, '<h4>$1</h4>')
              }} />
            </div>
          ) : null}
        </div>
        
        {mode === 'online' && (
          <div className="px-4 py-2 bg-dark-bg/80 flex items-center gap-1.5 border-t border-white/5">
            <Sparkles size={12} className="text-brand-400" />
            <span className="text-[10px] text-dark-subtext">Gerado por IA (Gemini)</span>
          </div>
        )}
      </div>
    </div>
  );
}
