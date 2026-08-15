import React from 'react';
import { Settings2 } from 'lucide-react';

export interface EmbeddedTrack {
  index: string;
  language?: string;
  codec: string;
  title?: string;
  label?: string;
}

interface TrackSelectionSectionProps {
  embeddedAudios: EmbeddedTrack[];
  embeddedSubs: EmbeddedTrack[];
  primaryAudioTrack: string;
  setPrimaryAudioTrack: (index: string) => void;
  extraAudioTracks: Set<string>;
  toggleExtraAudio: (index: string) => void;
  extraSubtitleTracks: Set<string>;
  toggleExtraSubtitle: (index: string) => void;
}

export function TrackSelectionSection({
  embeddedAudios,
  embeddedSubs,
  primaryAudioTrack,
  setPrimaryAudioTrack,
  extraAudioTracks,
  toggleExtraAudio,
  extraSubtitleTracks,
  toggleExtraSubtitle,
}: TrackSelectionSectionProps) {
  if (embeddedAudios.length === 0 && embeddedSubs.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 p-4 bg-black/20 border border-white/10 rounded-xl">
      <h3 className="text-sm font-medium text-white flex items-center gap-2">
        <Settings2 size={16} className="text-brand-400" />
        Configuração de Faixas
      </h3>
      
      {embeddedAudios.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider">
            Áudio Principal (Zero Lag)
          </div>
          <div className="flex flex-col gap-2">
            {embeddedAudios.map((audio, i) => (
              <label 
                key={`prim-${audio.index}`} 
                className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
              >
                <input 
                  type="radio" 
                  name="primaryAudio"
                  value={audio.index}
                  checked={primaryAudioTrack === audio.index}
                  onChange={(e) => setPrimaryAudioTrack(e.target.value)}
                  className="accent-brand-500"
                />
                <span>
                  {i + 1}. {audio.title || (audio.language && audio.language !== 'und' ? audio.language.toUpperCase() : `Áudio ${i + 1}`)} {audio.codec ? `(${audio.codec})` : ''}
                </span>
              </label>
            ))}
          </div>

          {embeddedAudios.length > 1 && (
            <>
              <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider mt-4">
                Áudios Extras (Extrair p/ Atalho)
              </div>
              <div className="flex flex-col gap-2">
                {embeddedAudios.filter(a => a.index !== primaryAudioTrack).map((audio) => (
                  <label 
                    key={`ext-${audio.index}`} 
                    className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={extraAudioTracks.has(audio.index)}
                      onChange={() => toggleExtraAudio(audio.index)}
                      className="accent-brand-500 rounded"
                    />
                    <span>
                      {audio.title || (audio.language && audio.language !== 'und' ? audio.language.toUpperCase() : `Áudio Extra`)} {audio.codec ? `(${audio.codec})` : ''}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {embeddedSubs.length > 0 && (
        <div className="space-y-2 mt-2 pt-4 border-t border-white/5">
          <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider">
            Legendas Embutidas (Extrair)
          </div>
          <div className="flex flex-col gap-2">
            {embeddedSubs.map((sub, i) => (
              <label 
                key={sub.index} 
                className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
              >
                <input 
                  type="checkbox" 
                  checked={extraSubtitleTracks.has(sub.index)}
                  onChange={() => toggleExtraSubtitle(sub.index)}
                  className="accent-purple-500 rounded"
                />
                <span>
                  {i + 1}. {sub.title || (sub.language && sub.language !== 'und' ? sub.language.toUpperCase() : `Legenda ${i + 1}`)} {sub.codec ? `[${sub.codec}]` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
