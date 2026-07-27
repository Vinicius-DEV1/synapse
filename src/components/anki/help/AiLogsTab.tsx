import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { getWebDb } from '../../../services/db-web';

export function AiLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const db = await getWebDb();
      const allLogs = await db.getAll('ai_logs');
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(allLogs);
    } catch (e) {
      console.error('Error loading AI logs', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-white">Auditoria de Requisições IA</h3>
        <button onClick={loadLogs} className="text-sm text-indigo-400 hover:text-indigo-300">
          Atualizar
        </button>
      </div>
      
      <p className="text-dark-subtext text-sm leading-relaxed mb-6">
        Todos os prompts e respostas trocados com o Google Gemini (ou outro modelo configurado) ficam registrados aqui de forma transparente para sua segurança.
      </p>

      {loadingLogs ? (
        <div className="text-center py-8 text-dark-subtext">Carregando logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-dark-subtext bg-white/5 rounded-xl border border-white/5">Nenhum registro de IA encontrado.</div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => {
            const isSuccess = log.status === 'success' || (log.status === undefined && !log.error);
            return (
            <div key={log.id} className="bg-dark-bg border border-white/10 rounded-xl overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-3">
                  {isSuccess ? (
                    <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="text-red-500 w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white text-sm">
                        {log.module === 'anki_validation' ? 'Validação de Cartão' : 
                         log.module === 'anki_card_suggestions' ? 'Geração de Flashcards' : 
                         log.module === 'anki_deck_analysis' ? 'Análise de Baralho' : log.module}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {log.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-dark-subtext mt-1 flex-wrap">
                      <div className="flex items-center gap-1 mr-3">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      {log.token_usage && (
                        <div className="flex gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Input: {log.token_usage.promptTokenCount}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Output: {log.token_usage.candidatesTokenCount}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-dark-subtext border border-white/10">Total: {log.token_usage.totalTokenCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-dark-subtext">
                  {expandedLog === log.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              
              {expandedLog === log.id && (
                <div className="p-4 border-t border-white/10 bg-black/20 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-300 mb-2 uppercase tracking-wider">Prompt Enviado</h4>
                    <div className="bg-dark-bg p-3 rounded-lg border border-white/5 text-sm text-dark-text whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
                      {log.prompt}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                      {isSuccess ? 'Resposta Recebida' : 'Erro Retornado'}
                    </h4>
                    <div className="bg-dark-bg p-3 rounded-lg border border-white/5 text-sm text-dark-text whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
                      {log.response || log.error || 'Sem resposta.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
