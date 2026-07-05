import React, { useState } from 'react';
import { X, Upload, FileVideo, FileText, Loader2, Settings2 } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';

export interface UploadOptions {
  videoFile: File;
  subtitleText: string | null;
  duration?: number;
  primaryAudioTrack?: string;
  extraAudioTracks?: string[];
  extraSubtitleTracks?: string[];
  onProgress?: (percent: number) => void;
}

interface VideoUploadModalProps {
  onClose: () => void;
  onUpload: (options: UploadOptions) => Promise<void>;
}

export default function VideoUploadModal({ onClose, onUpload }: VideoUploadModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [embeddedSubs, setEmbeddedSubs] = useState<{ index: string; language?: string; codec: string; title?: string }[]>([]);
  const [embeddedAudios, setEmbeddedAudios] = useState<{ index: string; language?: string; codec: string; title?: string }[]>([]);
  
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

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      let subtitleText = null;
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
        onProgress: (percent) => setUploadProgress(percent)
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro durante o upload.');
      setIsUploading(false);
    }
  };

  return (
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
                  if (!window.api?.video?.openFileDialog) return;
                  const res = await window.api.video.openFileDialog();
                  if (res) {
                    try {
                      const fileReq = await fetch('file:///' + res.path.replace(/\\/g, '/'));
                      const blob = await fileReq.blob();
                      const file = new File([blob], res.name, { type: res.type });
                      (file as any).electronPath = res.path;
                      
                      setVideoFile(file);
                      setError(null);
                      setEmbeddedSubs([]);
                      setEmbeddedAudios([]);
                      setPrimaryAudioTrack('');
                      setExtraAudioTracks(new Set());
                      setExtraSubtitleTracks(new Set());
                      
                      const tempUrl = URL.createObjectURL(file);
                      const tempVideo = document.createElement('video');
                      tempVideo.preload = 'metadata';
                      tempVideo.onloadedmetadata = () => {
                        URL.revokeObjectURL(tempUrl);
                        setVideoDuration(tempVideo.duration);
                      };
                      tempVideo.src = tempUrl;

                      // Use new scanTracks
                      if ((window.api?.video as any)?.scanTracks) {
                        setIsScanning(true);
                        try {
                          const scanRes = await (window.api.video as any).scanTracks(res.path);
                          if (scanRes.error) {
                            console.error('ffprobe error:', scanRes.error);
                          }
                          setEmbeddedSubs(scanRes.subtitles || []);
                          setEmbeddedAudios(scanRes.audioTracks || []);
                          
                          if (scanRes.audioTracks && scanRes.audioTracks.length > 0) {
                            setPrimaryAudioTrack(scanRes.audioTracks[0].index); // Default to first track
                          }
                        } catch (err: any) {
                          alert('Falha ao rodar o escâner: ' + err.message);
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
                        <span>{i + 1}. {audio.language !== 'und' ? audio.language?.toUpperCase() : 'Desconhecido'} ({audio.codec})</span>
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
                            <span>{audio.language !== 'und' ? audio.language?.toUpperCase() : 'Desconhecido'} ({audio.codec})</span>
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
                        <span>{i + 1}. {sub.language !== 'und' ? sub.language?.toUpperCase() : 'Desconhecido'} {sub.title ? `- ${sub.title}` : ''}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                <span>Processando e enviando...</span>
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
              onClick={onClose}
              disabled={isUploading}
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
  );
}
