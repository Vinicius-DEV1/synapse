const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/Users/vinic/Downloads/meus apps/caderno/src/components/anki/AIChatAnalysisView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ChatSession interface
if (!content.includes('interface ChatSession')) {
  content = content.replace(
    'export interface ChatMessage {',
    'export interface ChatSession {\n  id: string;\n  date: string;\n  history: ChatMessage[];\n}\n\nexport interface ChatMessage {'
  );
  // Actually ChatMessage is imported from useAIActions, so it's not defined here!
  // Let's just insert it after the imports
  content = content.replace(
    'interface AIChatAnalysisViewProps',
    'export interface ChatSession {\n  id: string;\n  date: string;\n  history: ChatMessage[];\n}\n\ninterface AIChatAnalysisViewProps'
  );
}

// 2. Add sessions state and activeSessionId
content = content.replace(
  'const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);',
  'const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);\n  const [sessions, setSessions] = useState<ChatSession[]>([]);\n  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);'
);

// 3. Update useEffect for loading
const oldLoad =   useEffect(() => {
    const saved = localStorage.getItem(\i_chat_\\);
    if (saved) {
      try {
        setChatHistory(JSON.parse(saved));
      } catch (e) {}
    }
  }, [deckId]);;

const newLoad =   useEffect(() => {
    const savedSessions = localStorage.getItem(\i_chat_sessions_\\);
    let loadedSessions: ChatSession[] = [];
    if (savedSessions) {
      try { loadedSessions = JSON.parse(savedSessions); } catch(e) {}
    } else {
      // Migrate old
      const oldChat = localStorage.getItem(\i_chat_\\);
      if (oldChat) {
        try {
           const history = JSON.parse(oldChat);
           if (history.length > 0) {
              loadedSessions = [{ id: Date.now().toString(), date: new Date().toISOString(), history }];
              localStorage.setItem(\i_chat_sessions_\\, JSON.stringify(loadedSessions));
           }
        } catch(e) {}
      }
    }
    setSessions(loadedSessions);
    if (loadedSessions.length > 0) {
       setActiveSessionId(loadedSessions[loadedSessions.length - 1].id);
       setChatHistory(loadedSessions[loadedSessions.length - 1].history);
    } else {
       setActiveSessionId(null);
       setChatHistory([]);
    }
  }, [deckId]);;

content = content.replace(oldLoad, newLoad);

// 4. Update useEffect for saving
const oldSave =   useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(\i_chat_\\, JSON.stringify(chatHistory));
    } else {
      localStorage.removeItem(\i_chat_\\);
    }
  }, [chatHistory, deckId]);;

const newSave =   useEffect(() => {
    if (!activeSessionId && chatHistory.length > 0) {
       const newId = Date.now().toString();
       const newSession = { id: newId, date: new Date().toISOString(), history: chatHistory };
       setSessions(prev => {
         const next = [...prev, newSession];
         localStorage.setItem(\i_chat_sessions_\\, JSON.stringify(next));
         return next;
       });
       setActiveSessionId(newId);
    } else if (activeSessionId) {
       setSessions(prev => {
         const next = prev.map(s => s.id === activeSessionId ? { ...s, history: chatHistory } : s);
         localStorage.setItem(\i_chat_sessions_\\, JSON.stringify(next));
         return next;
       });
    }
  }, [chatHistory, activeSessionId, deckId]);;

content = content.replace(oldSave, newSave);

// 5. Add Nova Conversa button and dropdown to UI
const oldHeaderStart =         <div className="flex justify-between items-center bg-dark-bg/50 p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />;

const newHeaderStart =         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-dark-bg/50 p-4 sm:p-6 border-b border-white/5 gap-4">
          <div className="flex justify-between items-center w-full">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Analisar Baralho
              </h2>
              <p className="text-sm text-dark-subtext mt-1">Converse com a IA sobre seu baralho e deixe que ela crie ou edite cards para você.</p>
            </div>
            
            <div className="flex items-center gap-2">
              {sessions.length > 0 && (
                <select 
                  className="bg-dark-card border border-white/10 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500/50"
                  value={activeSessionId || ''}
                  onChange={(e) => {
                     const id = e.target.value;
                     const session = sessions.find(s => s.id === id);
                     if (session) {
                        setActiveSessionId(id);
                        setChatHistory(session.history);
                     }
                  }}
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </option>
                  ))}
                </select>
              )}
              
              <button 
                onClick={() => {
                  setActiveSessionId(null);
                  setChatHistory([]);
                  setChatPrompt('');
                }}
                className="px-3 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors text-sm font-medium whitespace-nowrap"
              >
                + Nova Conversa
              </button>
            </div>
          </div>
        </div>
        <div className="hidden">; // We hide the old static text since we replaced it

const oldHeaderFull =         <div className="flex justify-between items-center bg-dark-bg/50 p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Analisar Baralho
            </h2>
            <p className="text-sm text-dark-subtext mt-1">Converse com a IA sobre seu baralho e deixe que ela crie ou edite cards para você.</p>
          </div>
        </div>;

content = content.replace(oldHeaderFull, newHeaderStart.replace('<div className="hidden">', ''));

fs.writeFileSync(filePath, content, 'utf8');
console.log('Chat updated!');
