import React from 'react';
import { Sparkles, Trash2, Edit3, Check } from 'lucide-react';

export function ActionCreateCards({ act, msgIdx, actIdx, actionStatus, actionKey, setActiveReviewAction, setSuggestions }: any) {
  if (!act.cards || act.cards.length === 0) {
    return (
      <div className="mt-2 ml-4 bg-green-500/10 border border-green-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center gap-3 text-green-300">
        <Check className="w-5 h-5" />
        <p className="text-sm font-medium">Cartões adicionados com sucesso!</p>
      </div>
    );
  }
  return (
    <div className="mt-2 ml-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <p className="text-sm font-medium text-indigo-300">A IA sugere criar {act.cards?.length} cartões</p>
      </div>
      <button onClick={() => { setActiveReviewAction({ msgIdx, actIdx }); setSuggestions([...act.cards]); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
        Revisar e Adicionar
      </button>
    </div>
  );
}

export function ActionDeleteCard({ act, actionStatus, actionKey, handleExecuteAction }: any) {
  const isDone = actionStatus[actionKey];
  return (
    <div className="mt-2 ml-4 bg-red-500/10 border border-red-500/20 p-4 rounded-xl w-full max-w-[80%] flex items-center justify-between">
      <div className="flex items-center gap-3 text-red-400">
        <Trash2 className="w-5 h-5" />
        <p className="text-sm font-medium">Sugestão de Exclusão (1 cartão)</p>
      </div>
      <button disabled={isDone} onClick={() => handleExecuteAction(act, actionKey)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
        {isDone ? 'Excluído' : 'Aprovar Exclusão'}
      </button>
    </div>
  );
}

export function ActionDeleteBulk({ act, actionStatus, actionKey, handleExecuteAction }: any) {
  const isDone = actionStatus[actionKey];
  return (
    <div className="mt-2 ml-4 bg-red-500/10 border border-red-500/20 rounded-xl w-full max-w-[80%] overflow-hidden flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-red-500/10">
        <div className="flex items-center gap-3 text-red-400">
          <Trash2 className="w-5 h-5" />
          <p className="text-sm font-medium">Sugestão de Exclusão ({act.cards_to_delete?.length} cartões)</p>
        </div>
        <button disabled={isDone} onClick={() => handleExecuteAction(act, actionKey)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow">
          {isDone ? 'Excluídos' : 'Aprovar Exclusão'}
        </button>
      </div>
      <details className="group">
        <summary className="p-3 text-xs text-red-300/70 cursor-pointer hover:bg-red-500/5 select-none font-medium text-center">Ver motivos das exclusões</summary>
        <div className="p-4 pt-0 space-y-2">
          {act.cards_to_delete?.map((item: any, i: number) => (
             <div key={i} className="text-xs bg-black/20 p-2 rounded text-red-100">
               <span className="font-semibold opacity-70">Motivo:</span> {item.reason}
             </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function ActionEditCards({ editActions, actionStatus, handleExecuteAction, deckCards }: any) {
  if (!editActions || editActions.length === 0) return null;
  const allDone = editActions.every((e: any) => actionStatus[e.actionKey]);
  
  return (
    <div className="mt-2 ml-4 bg-blue-500/10 border border-blue-500/20 rounded-xl w-full max-w-[80%] overflow-hidden flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-blue-500/10">
        <div className="flex items-center gap-3 text-blue-300">
          <Edit3 className="w-5 h-5" />
          <p className="text-sm font-medium">Sugestão de Edição ({editActions.length} {editActions.length === 1 ? 'cartão' : 'cartões'})</p>
        </div>
        <button 
          disabled={allDone} 
          onClick={() => { editActions.forEach((e: any) => { if(!actionStatus[e.actionKey]) handleExecuteAction(e.act, e.actionKey) }) }} 
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/50 disabled:text-blue-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm transition-colors shadow flex items-center gap-2"
        >
          {allDone ? <><Check className="w-4 h-4" /> Aplicadas</> : 'Aprovar Todos'}
        </button>
      </div>
      <details className="group">
        <summary className="p-3 text-xs text-blue-300/70 cursor-pointer hover:bg-blue-500/5 select-none font-medium text-center">Ver detalhes das edições</summary>
        <div className="p-4 pt-0 space-y-3 max-h-[500px] overflow-y-auto">
            {editActions.map((e: any, i: number) => {
              const originalCard = deckCards.find((c: any) => c.id === e.act.card_id);
              return (
                <div key={i} className="bg-black/20 p-4 rounded-xl text-xs space-y-3 relative border border-white/5">
                  {actionStatus[e.actionKey] && (
                    <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold">FEITO</div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-white/40 uppercase tracking-wide text-[10px] border-b border-white/10 pb-1 font-semibold">Atual</div>
                      <div>
                        <span className="text-white/30 text-[10px] block mb-0.5">Frente</span>
                        <p className="text-white/70 line-through decoration-red-500/50">{originalCard?.front || '...'}</p>
                      </div>
                      {originalCard?.back && (
                        <div>
                          <span className="text-white/30 text-[10px] block mb-0.5">Verso</span>
                          <p className="text-white/70 line-through decoration-red-500/50">{originalCard.back}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-blue-300/70 uppercase tracking-wide text-[10px] border-b border-blue-500/20 pb-1 font-semibold">Nova Sugestão</div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <span className="text-blue-300/50 text-[10px] block mb-0.5">Frente</span>
                          <p className="text-white bg-blue-500/10 px-2 py-1 rounded inline-block whitespace-pre-wrap">{e.act.new_front || originalCard?.front}</p>
                        </div>
                        {(e.act.new_back || originalCard?.back) && (
                          <div>
                            <span className="text-blue-300/50 text-[10px] block mb-0.5">Verso</span>
                            <p className="text-white bg-blue-500/10 px-2 py-1 rounded inline-block whitespace-pre-wrap">{e.act.new_back || originalCard?.back}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </details>
    </div>
  );
}
