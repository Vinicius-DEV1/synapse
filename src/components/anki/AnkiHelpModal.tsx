import React, { useState } from 'react';
import { X, BrainCircuit, Keyboard, Settings, Activity, Target, Database, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Tag, Search } from 'lucide-react';
import { getWebDb } from '../../services/db-web';

interface AnkiHelpModalProps {
  onClose: () => void;
}

export default function AnkiHelpModal({ onClose }: AnkiHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'shortcuts' | 'fsrs' | 'ai' | 'tags' | 'ai_logs'>('intro');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeTab === 'ai_logs') {
      loadLogs();
    }
  }, [activeTab]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const db = await getWebDb();
      const allLogs = await db.getAll('ai_logs');
      // Sort by date descending
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLogs(allLogs);
    } catch (e) {
      console.error('Error loading AI logs', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
      <div className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 h-[80vh] max-h-[700px]">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-6 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-3 mb-8">
            <BrainCircuit className="text-indigo-400 w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Guia do Anki</h2>
          </div>
          
          <TabButton active={activeTab === 'intro'} onClick={() => setActiveTab('intro')} icon={<Target size={18} />} label="O Básico" />
          <TabButton active={activeTab === 'shortcuts'} onClick={() => setActiveTab('shortcuts')} icon={<Keyboard size={18} />} label="Atalhos" />
          <TabButton active={activeTab === 'fsrs'} onClick={() => setActiveTab('fsrs')} icon={<Activity size={18} />} label="Algoritmo FSRS" />
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Settings size={18} />} label="Correção com IA" />
          <TabButton active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} icon={<Tag size={18} />} label="Sistema de Tags" />
          <TabButton active={activeTab === 'ai_logs'} onClick={() => setActiveTab('ai_logs')} icon={<Database size={18} />} label="Auditoria IA" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative p-8">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>

          <div className="max-w-2xl mx-auto pt-4">
            {activeTab === 'intro' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-2">Como usar os Baralhos</h3>
                <p className="text-dark-subtext text-sm leading-relaxed">
                  O módulo Anki utiliza o conceito de <strong>Repetição Espaçada</strong> (Spaced Repetition) para ajudar você a memorizar qualquer coisa com o mínimo de esforço.
                </p>

                <div className="grid gap-4 mt-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      Novos Cartões
                    </h4>
                    <p className="text-sm text-dark-subtext">Cartões que você nunca estudou. Eles são limitados por dia para não sobrecarregar sua memória.</p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                      Aprendendo
                    </h4>
                    <p className="text-sm text-dark-subtext">Cartões que você acabou de conhecer ou que errou recentemente. O foco é fixá-los antes de enviá-los para revisões mais longas.</p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      A Revisar
                    </h4>
                    <p className="text-sm text-dark-subtext">Cartões já aprendidos que o algoritmo agendou para hoje, pouco antes de você esquecê-los.</p>
                  </div>
                </div>

                <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                  <h4 className="font-semibold text-indigo-300 mb-1">Dica de Ouro</h4>
                  <p className="text-sm text-indigo-200/70">
                    Você pode organizar baralhos dentro de outros baralhos (Subbaralhos). Clique no <strong>+</strong> ao lado de um baralho existente para criar um filho!
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-2">Atalhos de Teclado</h3>
                <p className="text-dark-subtext text-sm leading-relaxed mb-6">
                  Estude muito mais rápido usando apenas o teclado.
                </p>

                <div className="space-y-3">
                  <ShortcutRow keys={['Espaço', 'Enter']} description="Mostrar a resposta ou confirmar o que foi digitado" />
                  <ShortcutRow keys={['1']} description="Avaliar como: Errei (Volta para a fase de aprendizado)" color="text-red-400" />
                  <ShortcutRow keys={['2']} description="Avaliar como: Difícil (Aumenta um pouco o intervalo)" color="text-orange-400" />
                  <ShortcutRow keys={['3']} description="Avaliar como: Bom (Progresso normal)" color="text-green-400" />
                  <ShortcutRow keys={['4']} description="Avaliar como: Fácil (Aumenta bastante o intervalo)" color="text-blue-400" />
                  <ShortcutRow keys={['Esc']} description="Sair da sessão de estudos" />
                </div>
                
                <h4 className="text-lg font-bold text-white mt-8 mb-4 border-t border-white/10 pt-6">Modal de Pré-visualização (Olhinho)</h4>
                <div className="space-y-3">
                  <ShortcutRow keys={['Seta Direita (>)']} description="Avançar rapidamente para o próximo cartão da lista atual." />
                  <ShortcutRow keys={['Seta Esquerda (<)']} description="Voltar para o cartão anterior." />
                  <ShortcutRow keys={['Espaço / Enter']} description="Mostrar a resposta ou fechar a resposta do cartão atual." />
                </div>
              </div>
            )}

            {activeTab === 'fsrs' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-2">O Algoritmo FSRS</h3>
                <p className="text-dark-subtext text-sm leading-relaxed">
                  O Caderno utiliza o <strong>Free Spaced Repetition Scheduler (FSRS)</strong>, um algoritmo de IA moderno que é significativamente mais eficiente que o algoritmo tradicional do Anki (SM-2).
                </p>

                <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5">
                    <h4 className="font-semibold text-white">Como ele calcula os intervalos?</h4>
                    <p className="text-sm text-dark-subtext mt-1">Ele rastreia 3 métricas secretas para cada cartão:</p>
                  </div>
                  <ul className="divide-y divide-white/5 text-sm">
                    <li className="p-4 flex gap-4 items-start">
                      <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">D</span>
                      <div>
                        <strong className="text-white block">Dificuldade (Difficulty)</strong>
                        <span className="text-dark-subtext">De 1 a 10. Representa a complexidade inerente daquele cartão para você.</span>
                      </div>
                    </li>
                    <li className="p-4 flex gap-4 items-start">
                      <span className="font-mono text-green-400 bg-green-500/10 px-2 py-1 rounded">S</span>
                      <div>
                        <strong className="text-white block">Estabilidade (Stability)</strong>
                        <span className="text-dark-subtext">Tempo (em dias) que leva para sua chance de lembrar cair para 90%.</span>
                      </div>
                    </li>
                    <li className="p-4 flex gap-4 items-start">
                      <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">R</span>
                      <div>
                        <strong className="text-white block">Recuperabilidade (Retrievability)</strong>
                        <span className="text-dark-subtext">Sua probabilidade atual de lembrar do cartão neste exato segundo.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-2">Correção com Inteligência Artificial</h3>
                <p className="text-dark-subtext text-sm leading-relaxed">
                  Cartões de tipo "Digitação" (Typing) e "Completar" (Cloze) podem utilizar a IA para validar suas respostas de forma semântica.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-1">Validação Exata (Padrão)</h4>
                    <p className="text-sm text-dark-subtext">O sistema compara exatamente o que você digitou com o gabarito. Se faltar um acento ou tiver um espaço extra, pode ser considerado errado.</p>
                  </div>

                  <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                    <h4 className="font-semibold text-indigo-300 mb-1">Validação com IA</h4>
                    <p className="text-sm text-indigo-200/70 mb-3">
                      O sistema entende o contexto! Se o gabarito for "cachorro" e você digitar "cãozinho", a IA compreenderá o significado e marcará como correto, fornecendo um feedback sutil.
                    </p>
                    <p className="text-xs text-indigo-300/50 bg-indigo-500/10 p-2 rounded">
                      Para ativar, na criação do cartão de Digitação, mude a Validação para "Com IA".
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'tags' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-white mb-2">Sistema Transversal de Tags</h3>
                <p className="text-dark-subtext text-sm leading-relaxed">
                  As tags permitem que você categorize cartões muito além das limitações de pastas ou subbaralhos. Elas são transversais e extremamente úteis para filtros.
                </p>

                <div className="space-y-4 mt-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      Como Criar
                    </h4>
                    <p className="text-sm text-dark-subtext">No editor de cartões, há um campo específico para Tags. Digite uma palavra e pressione `Enter` ou `,` (vírgula) para transformá-la em uma pílula roxa.</p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-400" />
                      Filtros Inteligentes
                    </h4>
                    <p className="text-sm text-dark-subtext">Ao navegar pelo seu baralho, um menu suspenso de Tags será mostrado. Ele exibe apenas as tags que realmente existem naqueles cartões. Perfeito para estudar contextos como `#urgente` ou `#phrasal_verbs` separadamente.</p>
                  </div>

                  <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 mt-4">
                    <h4 className="font-semibold text-indigo-300 mb-1 flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4" />
                      Tags Automáticas via IA
                    </h4>
                    <p className="text-sm text-indigo-200/70">
                      Sempre que você utilizar o Assistente de IA para gerar novos flashcards a partir de um texto, a inteligência artificial não apenas criará os cartões, mas também aplicará tags cirúrgicas a cada um deles automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai_logs' && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
          : 'text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function ShortcutRow({ keys, description, color = "text-white" }: { keys: string[], description: string, color?: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="flex items-center gap-2">
        {keys.map((k, i) => (
          <React.Fragment key={k}>
            <kbd className="bg-black/30 border border-white/10 px-2 py-1 rounded text-xs font-mono text-dark-subtext">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-dark-subtext/50 text-xs">ou</span>}
          </React.Fragment>
        ))}
      </div>
      <span className={`text-sm ${color}`}>{description}</span>
    </div>
  );
}
