
interface SessionSummaryProps {
  sessionStats: { reviewed: number; correct: number };
  sessionStartTime: number;
  onClose: () => void;
}

export function SessionSummary({ sessionStats, sessionStartTime, onClose }: SessionSummaryProps) {
  const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  
  const accuracy = sessionStats.reviewed > 0 
    ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-dark-bg flex flex-col items-center justify-center text-dark-text z-[200] p-4">
      <div className="w-full max-w-md bg-dark-card border border-white/10 rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-500">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Parabéns! 🎉</h2>
        <p className="text-dark-subtext mb-8 text-center">Você concluiu suas revisões neste baralho por agora.</p>
        
        {sessionStats.reviewed > 0 && (
          <div className="w-full grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-3xl font-bold text-white mb-1">{sessionStats.reviewed}</span>
              <span className="text-[10px] text-dark-subtext uppercase tracking-widest font-bold">Cartões</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-3xl font-bold text-white mb-1">{timeStr}</span>
              <span className="text-[10px] text-dark-subtext uppercase tracking-widest font-bold">Tempo</span>
            </div>
            <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <div className="w-full flex justify-between text-sm font-bold mb-3">
                <span className="text-dark-subtext uppercase tracking-wider text-[11px]">Precisão</span>
                <span className={accuracy >= 80 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}>{accuracy}%</span>
              </div>
              <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${accuracy >= 80 ? 'bg-green-500' : accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95">
          Voltar para o Baralho
        </button>
      </div>
    </div>
  );
}
