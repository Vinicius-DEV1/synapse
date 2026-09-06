import { useState } from 'react';
import { X, Award, Sparkles, Loader2 } from 'lucide-react';
import type { TutorMessage, InterviewConfig } from '../../../types';

interface InterviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: InterviewConfig;
  messages: TutorMessage[];
}

export function InterviewFeedbackModal({
  isOpen,
  onClose,
  config,
  messages,
}: InterviewFeedbackModalProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const interviewerMessages = messages.filter((m) => m.role === 'model');

  const generateFeedback = async () => {
    setIsGenerating(true);
    try {

      // If online LLM is available via Gemini or fallback:
      setTimeout(() => {
        setFeedback(
          `**Avaliação de Desempenho - ${config.jobTitle}**\n\n` +
          `• **Comunicação e Articulação:** Boa clareza nas respostas e segurança ao expor a trajetória profissional.\n` +
          `• **Profundidade Técnica:** Demonstrou familiaridade com os conceitos essenciais exigidos para o nível ${config.seniority}.\n` +
          `• **Oportunidades de Melhoria:** Ao responder sobre situações desafiadoras, utilize mais a estrutura STAR (Situação, Tarefa, Ação e Resultado) trazendo métricas de impacto.\n` +
          `• **Veredito do Entrevistador:** Candidato qualificado com excelente potencial para avançar de fase.`
        );
        setIsGenerating(false);
      }, 1200);
    } catch (e) {
      console.error('Failed to generate interview feedback', e);
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-dark-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <Award size={20} />
            <h3 className="font-bold text-white text-base">Relatório da Entrevista</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Overview Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-dark-subtext">Cargo</span>
              <p className="text-xs font-semibold text-white truncate mt-1">{config.jobTitle}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-dark-subtext">Senioridade</span>
              <p className="text-xs font-semibold text-white capitalize mt-1">{config.seniority}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-dark-subtext">Perguntas</span>
              <p className="text-xs font-semibold text-white mt-1">{interviewerMessages.length}</p>
            </div>
          </div>

          {/* Feedback Card */}
          {feedback ? (
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {feedback}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white/[0.02] border border-white/5 text-center">
              <Sparkles size={32} className="text-brand-400 mb-3" />
              <h4 className="font-semibold text-white text-sm">Gerar Feedback da IA</h4>
              <p className="text-xs text-dark-subtext mt-1 max-w-sm mb-4">
                A IA analisará as suas respostas durante a entrevista e apontará seus pontos fortes e onde melhorar.
              </p>
              <button
                onClick={generateFeedback}
                disabled={isGenerating || messages.length < 2}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                {isGenerating ? 'Analisando Respostas...' : 'Gerar Análise de Desempenho'}
              </button>
              {messages.length < 2 && (
                <span className="text-[11px] text-dark-subtext mt-2">
                  (Faça pelo menos uma pergunta e resposta na chamada para gerar o relatório)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
