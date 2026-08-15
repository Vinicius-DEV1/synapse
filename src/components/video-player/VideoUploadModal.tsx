import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileVideo, FileText, Loader2, Settings2 } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';
import { useStore } from '../../store/useStore';
import { Portal } from '../ui/Portal';
import { TrackSelectionSection } from './ui/TrackSelectionSection';


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
  webQuality: 'original' | 'remux' | '1080p' | '720p' | '480p' | '360p';
  conversionPreset?: string;
  onProgress?: (percent: number) => void;
  onPhaseChange?: (phase: string) => void;
  signal?: AbortSignal;
}

interface VideoUploadModalProps {
  collectionId?: string;
  collectionName?: string;
  onClose: () => void;
  onUpload: (options: UploadOptions) => Promise<any>;
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
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [webQuality, setWebQuality] = useState<'original' | 'remux' | '1080p' | '720p' | '480p' | '360p'>('720p');

  // Load defaults from settings
  useEffect(() => {
    import('../../utils/settings').then(({ getSettings }) => {
      const s = getSettings();
      if (s.videoDefaultWebQuality) {
        setWebQuality(s.videoDefaultWebQuality);
      }
    });
  }, []);
  
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
      
      // Fire and forget
      onUpload({
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
        conversionPreset: (await import('../../utils/settings')).getSettings().videoConversionPreset,
      }).catch(err => {
        console.error("Erro no upload assíncrono", err);
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
            {uploadResult ? "Upload Concluído" : "Importar Novo Vídeo"}
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {uploadResult ? (
          <div className="p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Vídeo Processado com Sucesso!</h3>
            
            <div className="w-full bg-black/20 rounded-xl p-4 flex flex-col gap-3 text-sm text-left border border-white/5">
              <div className="flex justify-between">
                <span className="text-dark-subtext">Arquivo:</span>
                <span className="text-white truncate max-w-[250px]">{uploadResult.video.original_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-subtext">Tempo Total:</span>
                <span className="text-white">{Math.round(uploadResult.stats.durationMs / 1000)}s</span>
              </div>
              {uploadResult.stats.originalSize && (
                <div className="flex justify-between">
                  <span className="text-dark-subtext">Tamanho Original:</span>
                  <span className="text-white">{(uploadResult.stats.originalSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              )}
              {uploadResult.stats.webSize && (
                <div className="flex justify-between">
                  <span className="text-dark-subtext">Tamanho Web ({uploadResult.stats.webQuality}):</span>
                  <span className="text-white">{(uploadResult.stats.webSize / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium"
            >
              Concluir
            </button>
          </div>
        ) : (
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
                    if (webQuality === 'original' && !file.name.toLowerCase().endsWith('.mp4') && !file.name.toLowerCase().endsWith('.webm')) {
                        setWebQuality('720p');
                    }
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
          {videoFile && !isScanning && (
            <TrackSelectionSection
              embeddedAudios={embeddedAudios}
              embeddedSubs={embeddedSubs}
              primaryAudioTrack={primaryAudioTrack}
              setPrimaryAudioTrack={(track) => {
                setPrimaryAudioTrack(track);
                const newSet = new Set(extraAudioTracks);
                newSet.delete(track);
                setExtraAudioTracks(newSet);
              }}
              extraAudioTracks={extraAudioTracks}
              toggleExtraAudio={toggleExtraAudio}
              extraSubtitleTracks={extraSubtitleTracks}
              toggleExtraSubtitle={toggleExtraSubtitle}
            />
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
              <option className="bg-gray-900 text-white" value="original">Original (Nenhuma Conversão - Pesado)</option>
              <option className="bg-gray-900 text-white" value="remux">Clonar Original (Remux MP4 Ultra Rápido)</option>
              <option className="bg-gray-900 text-white" value="1080p">1080p Full HD (Alta Qualidade)</option>
              <option className="bg-gray-900 text-white" value="720p">720p HD (Rápido e Leve - Recomendado)</option>
              <option className="bg-gray-900 text-white" value="480p">480p SD (Bom para Celular)</option>
              <option className="bg-gray-900 text-white" value="360p">360p (Economia Máxima de Espaço)</option>
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
        )}
      </div>
    </div>
    </Portal>
  );
}
