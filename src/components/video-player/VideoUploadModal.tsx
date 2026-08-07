import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileVideo, FileText, Loader2, Settings2 } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';
import { useStore } from '../../store/useStore';
import { Portal } from '../ui/Portal';

export interface UploadOptions {
  videoFile: File;
  subtitleText: string | null;
  duration?: number;
  primaryAudioTrack?: string;
  extraAudioTracks?: string[];
  extraSubtitleTracks?: string[];
  masterKey?: CryptoKey;
  collectionId?: string;
  collectionName?: string;
  webQuality: 'original' | '1080p' | '720p';
  onProgress?: (percent: number) => void;
  onPhaseChange?: (phase: string) => void;
  signal?: AbortSignal;
}

interface VideoUploadModalProps {
  collectionId?: string;
  collectionName?: string;
  onClose: () => void;
  onUpload: (options: UploadOptions) => Promise<void>;
}

export default function VideoUploadModal({ collectionId, collectionName, onClose, onUpload }: VideoUploadModalProps) {
  const { state } = useStore();
  // We use culture or whatever the active module is, assuming videos are tied to Culture.
  const masterKey = state.moduleKeys['culture'];
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<string>('Processando e enviando...');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [error, setError] = useState<string | null>(null);
  
  const [webQuality, setWebQuality] = useState<'original' | '1080p' | '720p'>('720p');
  
  const [embeddedSubs, setEmbeddedSubs] = useState<{ index: string; language?: string; codec: string; title?: string }[]>([]);
  const [embeddedAudios, setEmbeddedAudios] = useState<{ index: string; language?: string; codec: string; title?: string }[]>([]);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  
  const [primaryAudioTrack, setPrimaryAudioTrack] = useState<string>('');
  const [extraAudioTracks, setExtraAudioTracks] = useState<Set<string>>(new Set());
  const [extraSubtitleTracks, setExtraSubtitleTracks] = useState<Set<string>>(new Set());
  
  const [isScanning, setIsScanning] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | undefined>();

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSubtitleFile(e.target.files[0]);
    }
  };

  const toggleExtraAudio = (index: string) => {
    const newSet = new Set(extraAudioTracks);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExtraAudioTracks(newSet);
  };

  const toggleExtraSubtitle = (index: string) => {
    const newSet = new Set(extraSubtitleTracks);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setExtraSubtitleTracks(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Por favor, selecione um arquivo de vídeo.');
      return;
    }

    // Warning for Web > 500MB
    const isDesktop = !!window.api?.video;
    if (!isDesktop && webQuality !== 'original' && videoFile.size > 500 * 1024 * 1024) {
      const confirm = window.confirm("Atenção: Converter vídeos maiores que 500MB na versão Web pode causar lentidão severa ou travamento da aba por falta de memória. Recomenda-se usar o Desktop para conversão ou marcar a qualidade como 'Original'.\n\nDeseja continuar mesmo assim?");
      if (!confirm) {
        setIsUploading(false);
        return;
      }
    }

    try {
      let subtitleText = null;
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);
      setUploadPhase('Preparando...');
      
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;
      
      if (subtitleFile) {
        subtitleText = await processSubtitleFile(subtitleFile);
      }
      
      await onUpload({
        videoFile,
        subtitleText,
        duration: videoDuration,
        primaryAudioTrack: primaryAudioTrack || undefined,
        extraAudioTracks: Array.from(extraAudioTracks),
        extraSubtitleTracks: Array.from(extraSubtitleTracks),
        masterKey,
        collectionId,
        collectionName,
        webQuality,
        onProgress: (percent) => setUploadProgress(percent),
        onPhaseChange: (phase) => setUploadPhase(phase),
        signal: abortCtrl.signal
      });
      onClose();
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'Cancelado pelo usuário') {
        setError('Upload cancelado.');
      } else {
        console.error(err);
        setError(err.message || 'Ocorreu um erro durante o upload.');
      }
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-[560px] max-w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-white font-medium flex items-center gap-2">
            <Upload size={18} className="text-brand-400" />
            Importar Novo Vídeo
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {/* Video Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">Arquivo de Vídeo (MP4 / MKV)</label>
            <div className="relative">
              <button 
                type="button"
                onClick={async () => {
                  if (!window.api?.video?.openFileDialog) {
                    videoFileInputRef.current?.click();
                    return;
                  }
                  const res = await window.api.video.openFileDialog();
                  if (res) {
                    try {
                      // No desktop Tauri, evitamos fetch('file:///') para não falhar no CORS
                      // e não carregar arquivos gigantes na memória RAM do navegador.
                      const dummyFile = new File([], res.name, { type: res.type || 'video/mp4' });
                      (dummyFile as any).TauriPath = res.path;
                      
                      setVideoFile(dummyFile);
                      setError(null);
                      setEmbeddedSubs([]);
                      setEmbeddedAudios([]);
                      setPrimaryAudioTrack('');
                      setExtraAudioTracks(new Set());
                      setExtraSubtitleTracks(new Set());

                      // Use new scanTracks
                      if ((window.api?.video as any)?.scanTracks) {
                        setIsScanning(true);
                        try {
                          const scanRes = await (window.api.video as any).scanTracks(res.path);
                          if (scanRes.error) {
                            console.error('ffprobe error:', scanRes.error);
                          }
                          const streams = scanRes?.streams || [];
                          const dur = Number(scanRes?.format?.duration || streams[0]?.duration);
                          if (!isNaN(dur) && dur > 0) {
                            setVideoDuration(dur);
                          }
                          const subs = streams
                            .filter((s: any) => s.codec_type === 'subtitle')
                            .map((s: any, i: number) => {
                              const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
                              const title = s.tags?.title || s.tags?.TITLE || '';
                              const codec = (s.codec_name || s.codec_tag_string || 'SUB').toUpperCase();
                              return {
                                index: `0:s:${i}`,
                                language: lang,
                                title: title,
                                codec: codec,
                                label: title || (lang !== 'und' ? lang.toUpperCase() : `Legenda ${i + 1}`)
                              };
                            });
                          const audios = streams
                            .filter((s: any) => s.codec_type === 'audio')
                            .map((s: any, i: number) => {
                              const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
                              const title = s.tags?.title || s.tags?.TITLE || '';
                              const codec = (s.codec_name || s.codec_tag_string || 'AAC').toUpperCase();
                              return {
                                index: `0:a:${i}`,
                                language: lang,
                                title: title,
                                codec: codec,
                                label: title || (lang !== 'und' ? lang.toUpperCase() : `Áudio ${i + 1}`)
                              };
                            });
                          setEmbeddedSubs(subs);
                          setEmbeddedAudios(audios);
                          
                          if (audios.length > 0) {
                            setPrimaryAudioTrack(audios[0].index);
                          }
                          // Marcar tudo por padrão (todas as legendas embutidas e áudios extras)
                          setExtraSubtitleTracks(new Set(subs.map((s: any) => s.index)));
                          if (audios.length > 1) {
                            setExtraAudioTracks(new Set(audios.slice(1).map((a: any) => a.index)));
                          }
                        } catch (err: any) {
                          console.warn('Falha ao rodar o escâner:', err.message);
                        } finally {
                          setIsScanning(false);
                        }
                      }
                    } catch (err: any) {
                      setError('Falha ao carregar arquivo local: ' + err.message);
                    }
                  }
                }}
                disabled={isUploading}
                className={`w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl transition-colors ${
                  isUploading ? 'opacity-50 cursor-not-allowed border-white/10' : 'cursor-pointer focus:outline-none focus:border-brand-500'
                } ${
                  videoFile ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <FileVideo size={24} className={videoFile ? 'text-brand-400' : 'text-dark-subtext'} />
                <span className={`text-sm ${videoFile ? 'text-white font-medium' : 'text-dark-subtext'}`}>
                  {videoFile ? videoFile.name : 'Clique para selecionar um vídeo do PC'}
                </span>
              </button>
              <input
                type="file"
                accept="video/*"
                ref={videoFileInputRef}
                className="hidden"
                disabled={isUploading || isScanning}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setVideoFile(file);
                    setError(null);
                    setEmbeddedSubs([]);
                    setEmbeddedAudios([]);
                    setPrimaryAudioTrack('');
                    setExtraAudioTracks(new Set());
                    setExtraSubtitleTracks(new Set());
                    
                    // Nota: Na web não temos o ffprobe para extrair duração, legenda, etc.,
                    // pois o ffprobe no browser seria muito pesado. O usuário terá que
                    // upar legendas manualmente.
                  }
                }}
              />
            </div>
          </div>

          {/* Scanning Indicator */}
          {videoFile && isScanning && (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-400 p-3 bg-brand-500/10 rounded-xl">
              <Loader2 size={16} className="animate-spin" />
              <span>Analisando faixas de áudio e legenda...</span>
            </div>
          )}

          {/* Advanced Track Selection */}
          {videoFile && !isScanning && (embeddedAudios.length > 0 || embeddedSubs.length > 0) && (
            <div className="flex flex-col gap-4 p-4 bg-black/20 border border-white/10 rounded-xl">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Settings2 size={16} className="text-brand-400" />
                Configuração de Faixas
              </h3>
              
              {embeddedAudios.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider">Áudio Principal (Zero Lag)</div>
                  <div className="flex flex-col gap-2">
                    {embeddedAudios.map((audio, i) => (
                      <label key={`prim-${audio.index}`} className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                        <input 
                          type="radio" 
                          name="primaryAudio"
                          value={audio.index}
                          checked={primaryAudioTrack === audio.index}
                          onChange={(e) => {
                            setPrimaryAudioTrack(e.target.value);
                            // If it was in extras, remove it
                            const newSet = new Set(extraAudioTracks);
                            newSet.delete(e.target.value);
                            setExtraAudioTracks(newSet);
                          }}
                          className="accent-brand-500"
                        />
                        <span>{i + 1}. {audio.title || (audio.language && audio.language !== 'und' ? audio.language.toUpperCase() : `Áudio ${i + 1}`)} {audio.codec ? `(${audio.codec})` : ''}</span>
                      </label>
                    ))}
                  </div>

                  {embeddedAudios.length > 1 && (
                    <>
                      <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider mt-4">Áudios Extras (Extrair p/ Atalho)</div>
                      <div className="flex flex-col gap-2">
                        {embeddedAudios.filter(a => a.index !== primaryAudioTrack).map((audio, i) => (
                          <label key={`ext-${audio.index}`} className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                            <input 
                              type="checkbox" 
                              checked={extraAudioTracks.has(audio.index)}
                              onChange={() => toggleExtraAudio(audio.index)}
                              className="accent-brand-500 rounded"
                            />
                            <span>{audio.title || (audio.language && audio.language !== 'und' ? audio.language.toUpperCase() : `Áudio Extra`)} {audio.codec ? `(${audio.codec})` : ''}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {embeddedSubs.length > 0 && (
                <div className="space-y-2 mt-2 pt-4 border-t border-white/5">
                  <div className="text-xs font-medium text-dark-subtext uppercase tracking-wider">Legendas Embutidas (Extrair)</div>
                  <div className="flex flex-col gap-2">
                    {embeddedSubs.map((sub, i) => (
                      <label key={sub.index} className="flex items-center gap-2 text-sm text-white/90 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={extraSubtitleTracks.has(sub.index)}
                          onChange={() => toggleExtraSubtitle(sub.index)}
                          className="accent-purple-500 rounded"
                        />
                        <span>{i + 1}. {sub.title || (sub.language && sub.language !== 'und' ? sub.language.toUpperCase() : `Legenda ${i + 1}`)} {sub.codec ? `[${sub.codec}]` : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Web Quality Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">Qualidade da Versão Web</label>
            <select 
              value={webQuality}
              onChange={(e) => setWebQuality(e.target.value as any)}
              disabled={isUploading}
              className="bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white/90 outline-none focus:border-brand-500 transition-colors"
            >
              <option value="original">Original (Instantâneo - Apenas copia, pode não rodar na web)</option>
              <option value="720p">720p HD (Rápido e Leve - Recomendado)</option>
              <option value="1080p">1080p Full HD (Alta Qualidade - Lento)</option>
            </select>
          </div>

          {/* Subtitle Input (External) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">
              Adicionar Legenda Externa (Opcional - SRT/VTT)
            </label>
            <div className="relative">
              <input 
                type="file" 
                accept=".srt,.vtt" 
                onChange={handleSubtitleChange}
                className="hidden" 
                id="subtitle-upload"
                disabled={isUploading}
              />
              <label 
                htmlFor="subtitle-upload"
                className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl transition-colors ${
                  isUploading ? 'opacity-50 cursor-not-allowed border-white/10' : 'cursor-pointer'
                } ${
                  subtitleFile ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <FileText size={24} className={subtitleFile ? 'text-purple-400' : 'text-dark-subtext'} />
                <span className={`text-sm ${subtitleFile ? 'text-white font-medium' : 'text-dark-subtext'}`}>
                  {subtitleFile ? subtitleFile.name : 'Procurar no PC'}
                </span>
              </label>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isUploading && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between text-xs text-dark-subtext font-medium">
                <span>{uploadPhase}</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-brand-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20"
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : (
                'Importar Vídeo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}
