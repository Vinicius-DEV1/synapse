import { Brain, FileText, Sliders, Award, Briefcase } from 'lucide-react';
import type { TutorSession, TutorMemory } from '../../../types';

interface PracticeChatHeaderProps {
  session: TutorSession;
  isInCall: boolean;
  isConnected: boolean;
  memories: TutorMemory[];
  onOpenSessionSettings: () => void;
  onOpenVoiceSettings: () => void;
  onOpenMemoryDrawer: () => void;
  isInterview?: boolean;
  onOpenFeedback?: () => void;
}

export function PracticeChatHeader({
  session,
  isInCall,
  isConnected,
  memories,
  onOpenSessionSettings,
  onOpenVoiceSettings,
  onOpenMemoryDrawer,
  isInterview,
  onOpenFeedback
}: PracticeChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-dark-card/50 backdrop-blur-md z-10">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{session.title}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={`w-2 h-2 rounded-full ${isInCall ? (isConnected ? 'bg-emerald-400' : 'bg-yellow-400') : 'bg-dark-subtext'}`}></span>
          <span className="text-xs text-dark-subtext font-medium uppercase tracking-wider">
            {isInCall ? (isConnected ? 'Em chamada' : 'Conectando...') : 'Offline'}
          </span>
          {isInterview ? (
            <>
              <span className="text-dark-subtext mx-1">•</span>
              <span className="text-xs text-brand-300 font-medium tracking-wider flex items-center gap-1">
                <Briefcase size={12} /> Entrevista Ativa
              </span>
            </>
          ) : session.custom_prompt ? (
            <>
              <span className="text-dark-subtext mx-1">•</span>
              <span className="text-xs text-brand-400 font-medium tracking-wider">Instruções Customizadas Ativas</span>
            </>
          ) : null}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {isInterview && onOpenFeedback && (
          <button
            onClick={onOpenFeedback}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 rounded-md text-xs font-semibold text-brand-300 transition-colors shadow-sm"
            title="Ver Relatório de Desempenho da Entrevista"
          >
            <Award size={14} />
            <span>Avaliação</span>
          </button>
        )}

        <button 
          onClick={onOpenSessionSettings}
          className={`p-1.5 rounded-md transition-colors ${session.custom_prompt ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30' : 'bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white'}`}
          title="Instruções desta Sessão"
        >
          <FileText size={16} />
        </button>
        
        <button 
          onClick={onOpenVoiceSettings}
          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-brand-400 hover:text-brand-300 transition-colors"
          title="Configurações de Voz"
        >
          <Sliders size={16} />
        </button>

        <button 
          onClick={onOpenMemoryDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md text-xs font-medium text-dark-text transition-colors border border-white/5"
        >
          <Brain size={14} className="text-brand-400" />
          <span>Memórias</span>
          {memories.length > 0 && (
            <span className="bg-brand-500/20 text-brand-400 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {memories.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
