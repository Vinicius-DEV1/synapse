import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileVideo, FileText, Loader2, CloudOff, Cloud } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';
import { useStore } from '../../store/useStore';
import { Portal } from '../ui/Portal';
import { TrackSelectionSection } from './ui/TrackSelectionSection';
import { VideoUploadSuccess } from './ui/VideoUploadSuccess';
import { VideoQualitySelector } from './ui/VideoQualitySelector';
import { useVideoUploadScanner } from './hooks/useVideoUploadScanner';
import { getValidAccessToken } from '../../services/drive';
import type { UploadOptions } from '../../services/video/video-types';

export type { UploadOptions };

interface VideoUploadModalProps {
  collectionId?: string;
  collectionName?: string;
  onClose: () => void;
  onUpload: (options: UploadOptions) => Promise<void> | void;
}

export default function VideoUploadModal({ collectionId, collectionName, onClose, onUpload }: VideoUploadModalProps) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['culture'];
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<string>('Processando e enviando...');
  const [uploadResult] = useState<any>(null);
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getValidAccessToken()
      .then(t => {
        if (mounted) setDriveStatus(t ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (mounted) setDriveStatus('disconnected');
      });

    return () => {
      mounted = false;
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
  
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const {
    isScanning,
    videoDuration,
    embeddedSubs,
    embeddedAudios,
    primaryAudioTrack,
    setPrimaryAudioTrack,
    extraAudioTracks,
    extraSubtitleTracks,
    toggleExtraAudio,
    toggleExtraSubtitle,
    resetTracks,
    scanFilePath,
  } = useVideoUploadScanner();

  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSubtitleFile(e.target.files[0]);
    }
  };

  const handleSelectLocalFile = async () => {
    console.log('[DEBUG] handleSelectLocalFile - Clicked. Has Tauri openFileDialog:', !!window.api?.video?.openFileDialog);
    if (!window.api?.video?.openFileDialog) {
      console.log('[DEBUG] handleSelectLocalFile - Opening standard HTML file picker');
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
        videoFileInputRef.current.click();
      }
      return;
    }
    try {
      console.log('[DEBUG] handleSelectLocalFile - Awaiting Tauri dialog result...');
      const res = await window.api.video.openFileDialog();
      console.log('[DEBUG] handleSelectLocalFile - Dialog result:', res);
      if (!isMountedRef.current) return;
      if (res) {
        const dummyFile = new File([], res.name, { type: res.type || 'video/mp4' }) as File & { TauriPath?: string };
        dummyFile.TauriPath = res.path;
        
        console.log('[DEBUG] handleSelectLocalFile - Setting videoFile state with:', res.name, res.path);
        setVideoFile(dummyFile);
        setError(null);
        resetTracks();
        await scanFilePath(res.path);
      } else {
        console.log('[DEBUG] handleSelectLocalFile - No file chosen or dialog cancelled');
      }
    } catch (err: unknown) {
      console.error('[DEBUG] handleSelectLocalFile - Exception:', err);
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setError('Falha ao carregar arquivo local: ' + msg);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Por favor, selecione um arquivo de vídeo.');
      return;
    }

    const isDesktop = !!window.api?.video;
    if (!isDesktop && webQuality !== 'original' && videoFile.size > 500 * 1024 * 1024) {
      const confirm = window.confirm(
        "Atenção: Converter vídeos maiores que 500MB na versão Web pode causar lentidão severa ou travamento da aba por falta de memória. Recomenda-se usar o Desktop para conversão ou marcar a qualidade como 'Original'.\n\nDeseja continuar mesmo assim?"
      );
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
            <div className="flex items-center gap-2">
              <h2 className="text-white font-medium flex items-center gap-2">
                <Upload size={18} className="text-brand-400" />
                {uploadResult ? "Upload Concluído" : "Importar Novo Vídeo"}
              </h2>
              {driveStatus === 'connected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Cloud size={12} />
                  Drive
                </span>
              ) : driveStatus === 'disconnected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <CloudOff size={12} />
                  Drive Desconectado
                </span>
              ) : null}
            </div>
            <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {uploadResult ? (
            <VideoUploadSuccess uploadResult={uploadResult} onClose={onClose} />
          ) : (
            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 overflow-y-auto">
              {driveStatus === 'disconnected' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CloudOff size={18} className="text-amber-400 shrink-0" />
                    <p className="text-amber-200/90 text-xs leading-relaxed">
                      <strong>Google Drive desconectado:</strong> O envio e streaming de vídeos dependem do Google Drive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('drive-auth-expired'));
                    }}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-lg shrink-0 transition-colors"
                  >
                    Conectar
                  </button>
                </div>
              )}

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
                    onClick={handleSelectLocalFile}
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
                    accept="video/*,.mkv,.mp4,.avi,.mov,.webm,.flv,.wmv"
                    ref={videoFileInputRef}
                    className="hidden"
                    disabled={isUploading || isScanning}
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      console.log('[DEBUG] HTML file input onChange:', file);
                      if (file) {
                        setVideoFile(file);
                        if (webQuality === 'original' && !file.name.toLowerCase().endsWith('.mp4') && !file.name.toLowerCase().endsWith('.webm')) {
                          setWebQuality('720p');
                        }
                        setError(null);
                        resetTracks();
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
                  }}
                  extraAudioTracks={extraAudioTracks}
                  toggleExtraAudio={toggleExtraAudio}
                  extraSubtitleTracks={extraSubtitleTracks}
                  toggleExtraSubtitle={toggleExtraSubtitle}
                />
              )}

              {/* Web Quality Selection */}
              <VideoQualitySelector
                webQuality={webQuality}
                onChangeQuality={setWebQuality}
                disabled={isUploading}
              />

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
