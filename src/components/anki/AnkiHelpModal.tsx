import React, { useState } from 'react';
import { X, BrainCircuit, Keyboard, Settings, Activity, Target, Database, Tag, Layers, Edit3 } from 'lucide-react';
import { Portal } from '../ui/Portal';

import { IntroTab } from './help/IntroTab';
import { TypesTab } from './help/TypesTab';
import { ShortcutsTab } from './help/ShortcutsTab';
import { FsrsTab } from './help/FsrsTab';
import { ExternalAiTab } from './help/ExternalAiTab';
import { AiCorrectionTab, TagsTab } from './help/MiscTabs';
import { PromptsTab } from './help/PromptsTab';
import { AiLogsTab } from './help/AiLogsTab';

interface AnkiHelpModalProps {
  onClose: () => void;
}

export default function AnkiHelpModal({ onClose }: AnkiHelpModalProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'shortcuts' | 'fsrs' | 'ai' | 'tags' | 'ai_logs' | 'prompts' | 'types' | 'external_ai'>('intro');

  return (
    <Portal>
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
      <div className="bg-dark-card w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/10 h-[80vh] max-h-[700px]">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-dark-bg border-r border-white/5 p-6 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <BrainCircuit className="text-indigo-400 w-6 h-6 shrink-0" />
            <h2 className="text-xl font-bold text-white">Guia do Anki</h2>
          </div>
          
          <TabButton active={activeTab === 'intro'} onClick={() => setActiveTab('intro')} icon={<Target size={18} />} label="O Básico" />
          <TabButton active={activeTab === 'types'} onClick={() => setActiveTab('types')} icon={<Layers size={18} />} label="Tipos de Cartões" />
          <TabButton active={activeTab === 'shortcuts'} onClick={() => setActiveTab('shortcuts')} icon={<Keyboard size={18} />} label="Atalhos" />
          <TabButton active={activeTab === 'fsrs'} onClick={() => setActiveTab('fsrs')} icon={<Activity size={18} />} label="Algoritmo FSRS" />
          <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Settings size={18} />} label="Correção com IA" />
          <TabButton active={activeTab === 'external_ai'} onClick={() => setActiveTab('external_ai')} icon={<Database size={18} />} label="Usar IAs Externas" />
          <TabButton active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} icon={<Tag size={18} />} label="Sistema de Tags" />
          <TabButton active={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')} icon={<Edit3 size={18} />} label="Prompts do Sistema" />
          <TabButton active={activeTab === 'ai_logs'} onClick={() => setActiveTab('ai_logs')} icon={<Database size={18} />} label="Auditoria IA" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative p-8">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
          >
            <X size={20} />
          </button>

          <div className="max-w-2xl mx-auto pt-4">
            {activeTab === 'intro' && <IntroTab />}
            {activeTab === 'types' && <TypesTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'fsrs' && <FsrsTab />}
            {activeTab === 'external_ai' && <ExternalAiTab />}
            {activeTab === 'ai' && <AiCorrectionTab />}
            {activeTab === 'tags' && <TagsTab />}
            {activeTab === 'prompts' && <PromptsTab />}
            {activeTab === 'ai_logs' && <AiLogsTab />}
          </div>
        </div>
      </div>
    </div>
    </Portal>
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
