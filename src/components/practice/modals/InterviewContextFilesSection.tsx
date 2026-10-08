import React, { useRef } from 'react';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';

export interface AttachedFileItem {
  name: string;
  type: 'resume' | 'job';
}

interface InterviewContextFilesSectionProps {
  attachedFiles: AttachedFileItem[];
  isReadingFile: boolean;
  fileError: string | null;
  onFileUpload: (file: File, type: 'resume' | 'job') => Promise<void>;
  onRemoveFile: (fileName: string, type: 'resume' | 'job') => void;
}

export const InterviewContextFilesSection = React.memo(function InterviewContextFilesSection({
  attachedFiles,
  isReadingFile,
  fileError,
  onFileUpload,
  onRemoveFile,
}: InterviewContextFilesSectionProps) {
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pt-2 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
          <FileText size={14} className="text-brand-400" />
          Contexto Adicional (Arquivos & Currículo)
        </label>
        {isReadingFile && (
          <span className="flex items-center gap-1 text-xs text-brand-400">
            <Loader2 size={12} className="animate-spin" /> Lendo documento...
          </span>
        )}
      </div>
      <p className="text-xs text-dark-subtext mb-3">
        Anexe seu currículo ou a descrição da vaga (PDF ou TXT). O entrevistador usará essas informações para fazer perguntas realistas sobre seu histórico.
      </p>

      {/* Buttons for file upload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => resumeInputRef.current?.click()}
          disabled={isReadingFile}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-white/80 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          <Upload size={14} className="text-brand-400" />
          Anexar Currículo (PDF/TXT)
        </button>
        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file, 'resume');
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => jobInputRef.current?.click()}
          disabled={isReadingFile}
          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-white/80 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
        >
          <Upload size={14} className="text-sky-400" />
          Anexar Vaga (PDF/TXT)
        </button>
        <input
          ref={jobInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileUpload(file, 'job');
            e.target.value = '';
          }}
        />
      </div>

      {/* Error Message */}
      {fileError && <p className="text-xs text-red-400 mt-2">{fileError}</p>}

      {/* Attached Files List */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {attachedFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs text-white"
            >
              <FileText size={12} className={file.type === 'resume' ? 'text-brand-400' : 'text-sky-400'} />
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-[10px] text-dark-subtext">
                ({file.type === 'resume' ? 'Currículo' : 'Vaga'})
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(file.name, file.type)}
                className="text-dark-subtext hover:text-red-400 transition-colors ml-1 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
