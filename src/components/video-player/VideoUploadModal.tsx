import React, { useState } from 'react';
import { X, Upload, FileVideo, FileText, Loader2 } from 'lucide-react';
import { processSubtitleFile } from '../../utils/subtitles';

interface VideoUploadModalProps {
  onClose: () => void;
  onUpload: (videoFile: File, subtitleText: string | null, onProgress?: (percent: number) => void) => Promise<void>;
}

export default function VideoUploadModal({ onClose, onUpload }: VideoUploadModalProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Basic validation for mp4/mkv
      if (!file.name.toLowerCase().endsWith('.mp4') && !file.name.toLowerCase().endsWith('.mkv')) {
        setError('Por favor, selecione um arquivo de vídeo válido (.mp4 ou .mkv)');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

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
      
      await onUpload(videoFile, subtitleText, (percent) => setUploadProgress(percent));
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
              <input 
                type="file" 
                accept=".mp4,.mkv,video/mp4,video/x-matroska" 
                onChange={handleVideoChange}
                className="hidden" 
                id="video-upload"
                disabled={isUploading}
              />
              <label 
                htmlFor="video-upload"
                className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl transition-colors ${
                  isUploading ? 'opacity-50 cursor-not-allowed border-white/10' : 'cursor-pointer'
                } ${
                  videoFile ? 'border-brand-500/50 bg-brand-500/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                <FileVideo size={24} className={videoFile ? 'text-brand-400' : 'text-dark-subtext'} />
                <span className={`text-sm ${videoFile ? 'text-white font-medium' : 'text-dark-subtext'}`}>
                  {videoFile ? videoFile.name : 'Clique para selecionar um vídeo'}
                </span>
              </label>
            </div>
          </div>

          {/* Subtitle Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-white/80">
              Arquivo de Legenda (Opcional - SRT / VTT)
              <span className="block text-xs text-dark-subtext font-normal mt-0.5">Legendas SRT serão convertidas automaticamente para VTT.</span>
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
                  style={{ width: \`\${uploadProgress}%\` }}
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
