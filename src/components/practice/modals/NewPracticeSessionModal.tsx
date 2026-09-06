import { X, Briefcase, Sparkles, Mic } from 'lucide-react';

interface NewPracticeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFreeMode: () => void;
  onSelectInterviewMode: () => void;
}

export function NewPracticeSessionModal({
  isOpen,
  onClose,
  onSelectFreeMode,
  onSelectInterviewMode,
}: NewPracticeSessionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-dark-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-brand-400" />
              Nova Sessão de Prática
            </h3>
            <p className="text-xs text-dark-subtext mt-1">
              Escolha como deseja praticar hoje com a IA em tempo real.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 flex flex-col gap-4">
          {/* Option 1: Free Conversation (Current Classic Mode) */}
          <button
            onClick={onSelectFreeMode}
            className="group relative flex items-start gap-4 p-5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-brand-500/40 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 transition-colors shrink-0">
              <Mic size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                  Conversa Livre & Idiomas
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-dark-subtext">
                  Clássico
                </span>
              </div>
              <p className="text-xs text-dark-subtext mt-1.5 leading-relaxed">
                Diálogo fluido e natural com a IA por voz. Ideal para bater papo, praticar idiomas e expandir vocabulário com o orbe de áudio clássico.
              </p>
            </div>
          </button>

          {/* Option 2: Interview Simulator (New Mode) */}
          <button
            onClick={onSelectInterviewMode}
            className="group relative flex items-start gap-4 p-5 rounded-xl border border-brand-500/30 bg-brand-500/[0.06] hover:bg-brand-500/[0.12] hover:border-brand-500/60 text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-brand-500/5"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 group-hover:bg-brand-500/30 transition-colors shrink-0">
              <Briefcase size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                  Simulador de Entrevista de Emprego
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Novo
                </span>
              </div>
              <p className="text-xs text-dark-subtext mt-1.5 leading-relaxed">
                Entrevistador virtual 2D interativo com sincronização labial por voz. Responda a perguntas técnicas e comportamentais sob medida para o cargo e receba feedback.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
