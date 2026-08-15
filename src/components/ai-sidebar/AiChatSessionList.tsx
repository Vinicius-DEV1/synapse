import React from 'react';
import { MessageSquare, Trash2, FileText, ExternalLink, Image as ImageIcon, Plus } from 'lucide-react';
import type { AiChatSession } from '../../types';

interface AiChatSessionListProps {
  sessions: AiChatSession[];
  onOpenSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewQuickChat: () => void;
  onNavigate: (pageId: string, contextText?: string) => void;
}

export function AiChatSessionList({
  sessions,
  onOpenSession,
  onDeleteSession,
  onNewQuickChat,
  onNavigate
}: AiChatSessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center text-dark-subtext text-sm py-10 flex flex-col items-center">
        <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
        <p className="mb-4">Nenhum chat ativo no momento.</p>
        <button 
          onClick={onNewQuickChat}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs shadow-lg shadow-brand-500/20"
        >
          <Plus size={14} />
          Novo Chat Rápido
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
      {sessions.map(session => (
        <div key={session.id} className="bg-dark-bg border border-white/5 rounded-xl p-3 hover:border-brand-500/30 transition-all group">
          <div 
            className="cursor-pointer"
            onClick={() => onOpenSession(session.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-dark-subtext truncate pr-2">
                {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="text-dark-subtext hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-start gap-2 mb-3">
              {session.pageId === 'global' ? (
                <MessageSquare size={14} className="mt-1 shrink-0 text-brand-500" />
              ) : session.contextImage ? (
                <ImageIcon size={14} className="mt-1 shrink-0 text-brand-500" />
              ) : (
                <FileText size={14} className="mt-1 shrink-0 text-brand-500" />
              )}
              <p className="text-sm text-white line-clamp-2">
                {session.pageId === 'global' 
                  ? (session.messages.length > 0 && session.messages[0].parts[0]?.text ? session.messages[0].parts[0].text : 'Nova conversa livre') 
                  : session.contextImage ? 'Imagem referenciada' : `"${session.contextText}"`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="text-xs text-brand-400 font-medium truncate flex-1">
              {session.pageTitle}
            </div>
            {session.pageId !== 'global' && (
              <button 
                onClick={() => onNavigate(session.pageId, session.contextText)}
                className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-300 font-medium px-2 py-1 rounded transition-colors bg-brand-500/10 hover:bg-brand-500/20"
                title="Ir para a página"
              >
                <ExternalLink size={12} />
                Ir
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
