import { FileText, Sparkles, Plus } from 'lucide-react';
import { AiChatMarkdown } from './AiChatMarkdown';

interface AiChatMessageItemProps {
  msg: any;
  idx: number;
  onInsert: (text: string) => void;
}

export function AiChatMessageItem({ msg, idx, onInsert }: AiChatMessageItemProps) {
  const isUser = msg.role === 'user';
  const textContent = msg.parts.find((p: any) => p.text)?.text || '';
  const isQuestionJson = textContent.includes('"enunciado"') && textContent.includes('"opcoes"');
  
  let displayUserText = textContent;
  let attachedNames: string[] = [];

  if (isUser && textContent.startsWith('[Anexos: ')) {
    const match = textContent.match(/^\[Anexos: (.*?)\]/);
    if (match && match[1]) {
      attachedNames = match[1].split(', ').map((s: string) => s.trim());
    }
    const split = textContent.split('Instrução:\n');
    if (split.length > 1) {
      displayUserText = split[1];
    }
  } else if (isUser && idx === 0 && displayUserText.startsWith('Contexto:')) {
    const split = displayUserText.split('Instrução:\n');
    if (split.length > 1) displayUserText = split[1];
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm shadow-sm ${
        isUser 
          ? 'bg-brand-600 text-white rounded-tr-sm' 
          : 'bg-dark-card border border-white/10 text-brand-50 rounded-tl-sm'
      }`}>
        {isUser ? (
          <div className="flex flex-col gap-1.5">
            {attachedNames.length > 0 && (
              <div className="flex flex-wrap gap-1 pb-1.5 border-b border-white/20">
                {attachedNames.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-black/20 text-brand-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                    <FileText size={10} />
                    {name}
                  </span>
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap">{displayUserText}</p>
          </div>
        ) : isQuestionJson ? (
          (() => {
            try {
              const parsed = JSON.parse(textContent);
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-brand-300 font-medium pb-2 border-b border-white/10">
                    <Sparkles size={14} />
                    <span>✨ Questão Gerada</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{parsed.enunciado}</p>
                  <ul className="text-xs space-y-1.5 text-brand-50/80 mt-1">
                    {parsed.opcoes.map((opt: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-bold text-brand-400">{String.fromCharCode(65 + i)})</span>
                        <span>{opt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            } catch (e) {
              return (
                <div className="text-sm">
                  <AiChatMarkdown content={textContent} />
                </div>
              );
            }
          })()
        ) : (
          <div className="text-sm">
            <AiChatMarkdown content={textContent} />
          </div>
        )}
      </div>
      
      {!isUser && (
        <div className="flex items-center gap-2 mt-1">
          <button 
            onClick={() => onInsert(textContent)}
            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 hover:bg-brand-500/10 rounded transition-colors"
          >
            <Plus size={12} />
            <span>Copiar para Inserir</span>
          </button>
          {msg.tokens && (
            <div 
              className="text-[10px] opacity-40 font-mono flex items-center gap-1 px-2 cursor-help" 
              title={`Prompt: ${msg.tokens.promptTokenCount} | Resposta: ${msg.tokens.candidatesTokenCount} | Total: ${msg.tokens.totalTokenCount} tokens`}
            >
              {msg.tokens.totalTokenCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
