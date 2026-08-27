import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Archive, 
  Globe, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  HardDrive, 
  Cloud 
} from 'lucide-react';
import { triggerToast } from '../ui/ToastContext';

export interface ScrapActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenViewer: () => void;
  scrapData: {
    scrapId: string;
    url: string;
    title: string;
    driveFileId?: string | null;
    localPath?: string | null;
    fileSize?: number | null;
    createdAt?: string;
  } | null;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ScrapActionModal({
  isOpen,
  onClose,
  onOpenViewer,
  scrapData,
}: ScrapActionModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !scrapData) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(scrapData.url);
      setCopied(true);
      triggerToast('URL copiada para a área de transferência!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerToast('Falha ao copiar URL', 'error');
    }
  };

  const handleOpenLive = () => {
    window.open(scrapData.url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleOpenOffline = () => {
    onClose();
    onOpenViewer();
  };

  const cleanDomain = (() => {
    try {
      return new URL(scrapData.url).hostname.replace(/^www\./, '');
    } catch {
      return scrapData.url;
    }
  })();

  const modalJsx = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in w-screen h-screen">
      <div 
        className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com gradiente sutil */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono tracking-wider uppercase text-brand-primary font-semibold flex items-center gap-1.5 mb-1">
                <Globe size={13} />
                {cleanDomain}
              </span>
              <h3 className="text-lg font-bold text-dark-text truncate leading-snug" title={scrapData.title}>
                {scrapData.title || 'Snapshot Web'}
              </h3>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Badges de metadados */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-dark-subtext">
            {scrapData.fileSize ? (
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                <HardDrive size={12} className="text-brand-primary" />
                {formatBytes(scrapData.fileSize)}
              </span>
            ) : null}

            {scrapData.createdAt ? (
              <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                <Clock size={12} />
                {new Date(scrapData.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}

            {scrapData.driveFileId ? (
              <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/20 font-medium">
                <Cloud size={12} /> Google Drive E2EE
              </span>
            ) : null}
          </div>
        </div>

        {/* Corpo com as Opções de Ação */}
        <div className="p-6 space-y-3.5">
          <p className="text-xs text-dark-subtext uppercase tracking-wider font-medium px-1">
            Como você deseja visualizar esta página?
          </p>

          {/* Opção 1: Snapshot Offline (Destaque Primário) */}
          <button
            onClick={handleOpenOffline}
            className="w-full p-4 rounded-2xl border border-brand-primary/40 hover:border-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 text-left transition-all group flex items-start gap-4 shadow-lg shadow-brand-primary/5"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Archive size={24} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                  Abrir Cópia Salva (Offline)
                </h4>
                <span className="text-[10px] uppercase font-semibold bg-brand-primary/30 text-brand-primary px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-dark-subtext mt-1 leading-relaxed">
                Visualização offline e instantânea do HTML, CSS e imagens exatos arquivados, sem rastreadores nem propagandas.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 mt-2 font-medium">
                <ShieldCheck size={13} />
                Isolado em Sandbox Seguro
              </div>
            </div>
          </button>

          {/* Opção 2: Página ao Vivo no Navegador */}
          <button
            onClick={handleOpenLive}
            className="w-full p-4 rounded-2xl border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-left transition-all group flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 text-dark-text flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Globe size={24} className="text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-dark-text group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  Visitar Página ao Vivo
                  <ExternalLink size={13} className="opacity-60" />
                </h4>
                <span className="text-[10px] uppercase font-medium bg-white/5 text-dark-subtext px-2 py-0.5 rounded-full">
                  Navegador
                </span>
              </div>
              <p className="text-xs text-dark-subtext mt-1 leading-relaxed">
                Acessa o site original em tempo real no seu navegador padrão para ver alterações recentes ou fazer login.
              </p>
            </div>
          </button>
        </div>

        {/* Rodapé com botão de copiar link */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-xs text-dark-subtext">
          <span className="truncate max-w-[280px] font-mono text-[11px]" title={scrapData.url}>
            {scrapData.url}
          </span>

          <button
            onClick={handleCopyUrl}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all flex items-center gap-1.5 font-medium shrink-0"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar URL'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJsx, document.body);
}
