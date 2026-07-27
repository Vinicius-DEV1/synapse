import React from 'react';
import { AudioMessagePlayer } from './AudioMessagePlayer';
import type { TutorMessage } from '../../../types';

interface ChatTranscriptProps {
  messages: TutorMessage[];
}

export function ChatTranscript({ messages }: ChatTranscriptProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
      {messages.map((msg, i) => {
        const isSystem = msg.text_content.startsWith('[SISTEMA]');
        
        if (isSystem) {
          return (
            <div key={msg.id || i} className="flex justify-center my-2">
              <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-dark-subtext font-medium tracking-wide">
                {msg.text_content.replace('[SISTEMA] ', '')}
              </div>
            </div>
          );
        }
        
        const audioMatch = msg.text_content.match(/\[audio:(data:audio\/wav;base64,.+?)\]/);
        const textWithoutAudio = msg.text_content.replace(/\[audio:data:audio\/wav;base64,.+?\]/g, '').trim();
        const isModel = msg.role === 'model';
        
        return (
          <div key={msg.id || i} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
            <span className="text-[10px] text-dark-subtext uppercase tracking-widest font-bold mb-1 ml-1">
              {isModel ? 'IA' : 'Você'}
            </span>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm ${
              isModel 
                ? 'bg-dark-card border border-white/5 text-dark-text rounded-tl-sm' 
                : 'bg-brand-600 text-white rounded-tr-sm'
            }`}>
              {textWithoutAudio}
              {audioMatch && (
                <div className="mt-1">
                  <AudioMessagePlayer src={audioMatch[1]} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
