import React from 'react';

interface VideoUploadSuccessProps {
  uploadResult: {
    video: { original_name: string };
    stats: {
      durationMs: number;
      originalSize?: number;
      webSize?: number;
      webQuality?: string;
    };
  };
  onClose: () => void;
}

export function VideoUploadSuccess({ uploadResult, onClose }: VideoUploadSuccessProps) {
  return (
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
        className="mt-4 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium cursor-pointer"
      >
        Concluir
      </button>
    </div>
  );
}
