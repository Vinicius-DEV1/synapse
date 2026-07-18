import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, Clock, Trash2, Mic, Menu, X } from 'lucide-react';
import type { TutorSession } from '../../types';
import PracticeChat from './PracticeChat';

export default function PracticeView() {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSession, setActiveSession] = useState<TutorSession | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const loadSessions = async () => {
    if (!window.api?.practice) return;
    try {
      const data = await window.api.practice.getSessions();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load tutor sessions:', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      if (isMobileDevice) {
        setShowSidebar(false); // Hide sidebar by default on mobile
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCreateSession = async () => {
    if (!window.api?.practice) return;
    try {
      const newSession = await window.api.practice.createSession({
        title: `Sessão de Prática`,
        started_at: new Date().toISOString(),
      });
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.api?.practice) return;
    
    let isConfirm = false;
    if (window.api.app?.showConfirm) {
      const res = await window.api.app.showConfirm('Deseja excluir esta sessão de prática? (Todos os áudios associados também serão apagados)');
      isConfirm = res === 1;
    } else {
      isConfirm = confirm('Deseja excluir esta sessão de prática? (Todos os áudios associados também serão apagados do disco)');
    }
    
    if (!isConfirm) return;

    try {
      const sessionToUpdate = sessions.find(s => s.id === id);
      if (sessionToUpdate) {
        await window.api.practice.updateSession({
          ...sessionToUpdate,
          deleted_at: new Date().toISOString()
        });
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSession?.id === id) {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="flex h-full bg-dark-bg text-dark-text relative">
      {/* Mobile Menu Button */}
      {isMobile && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-20 p-2 bg-dark-card/80 backdrop-blur-sm border border-white/10 rounded-lg text-dark-subtext hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10"
        />
      )}

      {/* Sidebar de Sessões */}
      <div className={`${
        isMobile 
          ? `fixed inset-y-0 left-0 z-20 w-72 bg-dark-card border-r border-white/5 transform transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`
          : 'w-64 border-r border-white/5 flex flex-col bg-dark-card/30'
      } flex flex-col`}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-sm font-semibold tracking-wide text-brand-400 flex items-center gap-2">
            <Mic size={16} /> Histórico
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateSession}
              className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors active:scale-95"
              title="Nova Sessão"
            >
              <Plus size={16} />
            </button>
            {isMobile && (
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 rounded-lg bg-white/5 text-dark-subtext hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {sessions.length === 0 && (
            <div className="text-xs text-dark-subtext text-center mt-6 px-4">
              Nenhuma sessão de prática ainda. Comece uma nova conversa!
            </div>
          )}
          
          {sessions.map(session => {
            const date = new Date(session.started_at);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSession(session);
                  if (isMobile) setShowSidebar(false);
                }}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  activeSession?.id === session.id
                    ? 'bg-white/10 border-brand-500/30'
                    : 'bg-transparent border-transparent hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className={activeSession?.id === session.id ? 'text-brand-400' : 'text-dark-subtext'} />
                    <span className="text-sm font-medium truncate pr-4">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-dark-subtext hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-dark-subtext ml-5">
                  <Clock size={10} />
                  {dateStr} às {timeStr}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Area */}
      <div className={`flex-1 flex flex-col relative overflow-hidden bg-dark-bg/50 ${isMobile ? '' : 'ml-0'}`}>
        {activeSession ? (
          <PracticeChat key={activeSession.id} session={activeSession} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40 select-none">
            <Mic size={64} className="text-brand-500 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight mb-2">Prática de Inglês</h1>
            <p className="text-sm">Selecione uma sessão ou crie uma nova para conversar fluentemente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
