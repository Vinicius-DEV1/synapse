import { useState, useRef, type FormEvent } from 'react';
import {
  X,
  Briefcase,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Building2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import type { InterviewConfig, InterviewSeniority, InterviewType } from '../../../types';
import { extractTextFromFile } from './fileContextReader';

interface InterviewSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onSubmit: (config: InterviewConfig) => void;
}

export function InterviewSetupModal({
  isOpen,
  onClose,
  onBack,
  onSubmit,
}: InterviewSetupModalProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [seniority, setSeniority] = useState<InterviewSeniority>('senior');
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [companyName, setCompanyName] = useState('');

  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: 'resume' | 'job' }[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jobInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File, type: 'resume' | 'job') => {
    setIsReadingFile(true);
    setFileError(null);
    try {
      const extracted = await extractTextFromFile(file);
      if (type === 'resume') {
        setResumeText((prev) => (prev ? `${prev}\n\n${extracted.text}` : extracted.text));
      } else {
        setJobDescriptionText((prev) => (prev ? `${prev}\n\n${extracted.text}` : extracted.text));
      }
      setAttachedFiles((prev) => [...prev, { name: extracted.fileName, type }]);
    } catch (err: unknown) {
      console.error('Failed to read context file:', err);
      setFileError('Não foi possível extrair o texto do arquivo selecionado.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const removeAttachedFile = (fileName: string, type: 'resume' | 'job') => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== fileName));
    if (type === 'resume') {
      setResumeText('');
    } else {
      setJobDescriptionText('');
    }
  };

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) return;

    const config: InterviewConfig = {
      mode: 'interview',
      jobTitle: jobTitle.trim(),
      seniority,
      interviewType,
      companyName: companyName.trim() || undefined,
      resumeText: resumeText.trim() || undefined,
      jobDescriptionText: jobDescriptionText.trim() || undefined,
      attachedFileNames: attachedFiles.map((f) => f.name),
      avatarId: 'carlos_recruiter',
    };

    onSubmit(config);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-dark-card border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={20} className="text-brand-400" />
                Configurar Entrevista
              </h3>
              <p className="text-xs text-dark-subtext mt-0.5">
                Personalize os detalhes para calibrar o entrevistador virtual.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleStart} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
          {/* Cargo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
              Cargo / Função Desejada *
            </label>
            <input
              type="text"
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex: Engenheiro de Software Frontend, Tech Lead, Product Designer..."
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/60 transition-colors"
            />
          </div>

          {/* Grid: Senioridade e Foco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Nível de Senioridade
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as InterviewSeniority)}
                className="w-full px-3.5 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500/60"
              >
                <option value="junior" className="bg-dark-bg text-white">Júnior (Entrada / 1-2 anos)</option>
                <option value="pleno" className="bg-dark-bg text-white">Pleno (Autônomo / 3-5 anos)</option>
                <option value="senior" className="bg-dark-bg text-white">Sênior (Especialista / 6+ anos)</option>
                <option value="lead" className="bg-dark-bg text-white">Tech Lead / Liderança</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Foco da Entrevista
              </label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                className="w-full px-3.5 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500/60"
              >
                <option value="mixed" className="bg-dark-bg text-white">Mista (Técnica + Comportamental)</option>
                <option value="technical" className="bg-dark-bg text-white">Técnica e Arquitetura</option>
                <option value="behavioral" className="bg-dark-bg text-white">Comportamental e RH (Método STAR)</option>
                <option value="english" className="bg-dark-bg text-white">Inglês Internacional</option>
              </select>
            </div>
          </div>

          {/* Empresa (Opcional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2 flex items-center gap-1.5">
              <Building2 size={14} className="text-dark-subtext" />
              Empresa-Alvo (Opcional)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Google, Nubank, Startup em rápida expansão..."
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-500/60 transition-colors"
            />
          </div>

          {/* Anexar Arquivos de Contexto */}
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
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-white/80 hover:text-white transition-all disabled:opacity-50"
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
                  if (file) handleFileUpload(file, 'resume');
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                onClick={() => jobInputRef.current?.click()}
                disabled={isReadingFile}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-medium text-white/80 hover:text-white transition-all disabled:opacity-50"
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
                  if (file) handleFileUpload(file, 'job');
                  e.target.value = '';
                }}
              />
            </div>

            {/* Error Message */}
            {fileError && (
              <p className="text-xs text-red-400 mt-2">{fileError}</p>
            )}

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
                      onClick={() => removeAttachedFile(file.name, file.type)}
                      className="text-dark-subtext hover:text-red-400 transition-colors ml-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium text-dark-subtext hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!jobTitle.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles size={16} />
              Iniciar Entrevista com Avatar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
