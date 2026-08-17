import { Volume2 } from 'lucide-react';
import type { CardDraft } from '../types';

interface AudioPreviewProps {
  draft: CardDraft;
  mediaUrl: string | undefined;
  generatingAudio: boolean;
}

export function AudioPreview({ draft, mediaUrl, generatingAudio }: AudioPreviewProps) {
  if (!draft.video_clip && !draft.tts_text && !mediaUrl) {
    return null;
  }

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-center justify-between gap-3 text-sm text-indigo-300">
       <div className="flex items-center gap-3">
         <Volume2 className="w-5 h-5 flex-shrink-0" />
         <div>
           {generatingAudio ? (
             <p className="animate-pulse">Gerando áudio do flashcard...</p>
           ) : mediaUrl ? (
             <p>Áudio pronto! O arquivo será salvo junto ao cartão.</p>
           ) : (
             <p>Um clipe de áudio será {(draft as any).video_clip ? 'extraído do vídeo' : 'gerado via Edge TTS'}.</p>
           )}
         </div>
       </div>
       
       {mediaUrl && !generatingAudio && (
         <button 
           onClick={() => {
             const audio = new Audio(mediaUrl);
             audio.play().catch(e => console.error(e));
           }}
           className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-lg transition-colors font-medium border border-indigo-500/30"
         >
           <Volume2 className="w-4 h-4" />
           Ouvir
         </button>
       )}
    </div>
  );
}
