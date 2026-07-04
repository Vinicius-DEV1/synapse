import React, { useState } from 'react';
import { X, Upload, FileVideo, FileText, Loader2 } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';

interface VideoUploadModalProps {
  onClose: () => void;
  onUpload: (videoFile: File, subtitleText: string | null, trackIndex?: string, duration?: number, onProgress?: (percent: number) => void) => Promise<void>;
}

export default function VideoUploadModal({ onClose, onUpload }: VideoUploadModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [embeddedSubs, setEmbeddedSubs] = useState<{ index: string; language?: string; codec: string; title?: string }[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | undefined>();



  const handleSubtitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSubtitleFile(e.target.files[0]);
    }
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
      
      await onUpload(videoFile, subtitleText, subtitleText ? undefined : selectedTrackIndex, videoDuration, (percent) => setUploadProgress(percent));
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro durante o upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-[480px] max-w-full shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-white font-medium flex items-center gap-2">
            <Upload size={18} className="text-brand-400" />
            Importar Novo Vídeo
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6">
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
                    // Crie um File a partir do path nativo (funciona porque webSecurity: false)
                    try {
                      const fileReq = await fetch('file:///' + res.path.replace(/\\/g, '/'));
                      const blob = await fileReq.blob();
                      const file = new File([blob], res.name, { type: res.type });
                      // Manter o path original anexado
                      (file as any).electronPath = res.path;
                      
                      setVideoFile(file);
                      setError(null);
                      setEmbeddedSubs([]);
                      setSelectedTrackIndex('');
                      
                      const tempUrl = URL.createObjectURL(file);
                      const tempVideo = document.createElement('video');
                      tempVideo.preload = 'metadata';
                      tempVideo.onloadedmetadata = () => {
                        URL.revokeObjectURL(tempUrl);
                        setVideoDuration(tempVideo.duration);
                      };
                      tempVideo.src = tempUrl;

                      if (window.api?.video?.scanSubtitles) {
                        setIsScanning(true);
                        try {
                          const scanRes = await window.api.video.scanSubtitles(res.path);
                          if (scanRes.error) {
                            console.error('ffprobe error:', scanRes.error, 'debug:', scanRes.debug);
                          }
                          setEmbeddedSubs(scanRes.subtitles || []);
                          if (scanRes.subtitles && scanRes.subtitles.length > 0) {
                            setSelectedTrackIndex(scanRes.subtitles[0].index);
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

          {/* Embedded Subtitles Select */}
          {!subtitleFile && videoFile && isScanning && (
            <div className="flex items-center gap-2 text-sm text-brand-400 p-3 bg-brand-500/10 rounded-xl">
              <Loader2 size={16} className="animate-spin" />
              <span>Procurando legendas embutidas...</span>
            </div>
          )}

          {!subtitleFile && videoFile && !isScanning && embeddedSubs.length > 0 && (
            <div className="flex flex-col gap-2 p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl">
              <label className="text-sm font-medium text-white/80">Legendas embutidas detectadas</label>
              <select 
                value={selectedTrackIndex}
                onChange={(e) => setSelectedTrackIndex(e.target.value)}
                disabled={isUploading}
                className="w-full bg-dark-bg border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Nenhuma (Não extrair)</option>
                {embeddedSubs.map((sub, i) => (
                  <option key={sub.index} value={sub.index}>
                    {i + 1}. {sub.language !== 'und' ? sub.language.toUpperCase() : 'Desconhecido'} ({sub.codec}) {sub.title ? `- ${sub.title}` : ''}
                  </option>
                ))}
              </select>
              <span className="text-xs text-dark-subtext">Você pode extrair uma destas legendas ou fazer upload de uma externa abaixo.</span>
            </div>
          )}

          {/* Subtitle Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">
              Arquivo de Legenda (Opcional - SRT / VTT)
              <span className="block text-xs text-dark-subtext font-normal mt-0.5">Sobrescreve a legenda embutida, se houver. SRT é convertido pra VTT.</span>
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
                  {subtitleFile ? subtitleFile.name : 'Adicionar legenda externa'}
                </span>
              </label>
            </div>
          </div>
          
          {/* Progress Bar */}
          {isUploading && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-between text-xs text-dark-subtext font-medium">
                <span>Enviando para o Google Drive...</span>
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

          <div className="flex justify-end gap-3 mt-2">
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
                  Importando...
                </>
              ) : (
                'Importar para o Drive'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
