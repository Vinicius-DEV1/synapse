import React, { useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { 
  Globe, 
  Cloud, 
  ExternalLink, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  Trash2, 
  Loader2,
  HardDrive
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { encryptAndSaveScrap } from '../../../services/scrap/scrap-storage';
import { captureWebScrap } from '../../../services/scrap/scrap-service';
import { platform } from '../../../services/platform';

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ScrapWidgetNodeView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const { id, url, title, favicon, drive_file_id, local_path, file_size, status, error_reason, created_at } = node.attrs;
  const { state } = useStore();
  const masterKey = state.moduleKeys['notes'] || state.moduleKeys['files'];

  const [isRetrying, setIsRetrying] = useState(false);

  const cleanDomain = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  })();

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRetrying) return;
    setIsRetrying(true);
    updateAttributes({ status: 'capturing', error_reason: null });

    try {
      if (platform.platform === 'desktop') {
        const payload = await captureWebScrap(url);
        const saveResult = await encryptAndSaveScrap(payload.id, payload.html_content, payload.local_path, masterKey);

        updateAttributes({
          id: payload.id,
          url: payload.url,
          title: payload.title,
          favicon: payload.favicon,
          local_path: payload.local_path,
          drive_file_id: saveResult.driveFileId,
          file_size: payload.file_size,
          status: saveResult.isSynced ? 'ready' : 'sync_pending',
          created_at: payload.created_at,
          error_reason: null,
        });
      } else {
        updateAttributes({
          status: 'error',
          error_reason: 'A captura completa está disponível no Desktop.'
        });
      }
    } catch (err: unknown) {
      console.error('[ScrapWidget] Erro no retry de captura:', err);
      updateAttributes({
        status: 'error',
        error_reason: err instanceof Error ? err.message : String(err) || 'Falha ao conectar à página.'
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleOpenActionModal = () => {
    if (status === 'capturing') return;
    window.dispatchEvent(
      new CustomEvent('caderno-open-scrap-action', {
        detail: {
          scrapId: id,
          url,
          title: title || cleanDomain,
          driveFileId: drive_file_id,
          localPath: local_path,
          fileSize: file_size,
          createdAt: created_at,
          status,
        }
      })
    );
  };

  const handleOpenLiveDirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteRequest = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Contar quantas ocorrências deste mesmo scrapId existem no documento (caso tenha sido duplicado)
    let occurrences = 0;
    if (props.editor?.state?.doc) {
      props.editor.state.doc.descendants((n: PMNode) => {
        if (n.type.name === 'scrapWidget' && n.attrs.id === id) {
          occurrences++;
        }
        return true;
      });
    }

    const isLastReference = occurrences <= 1;

    window.dispatchEvent(
      new CustomEvent('caderno-request-scrap-delete', {
        detail: {
          scrapId: id,
          url,
          title: title || cleanDomain,
          driveFileId: drive_file_id,
          isLastReference,
          onConfirm: () => {
            deleteNode();
          },
        },
      })
    );
  };

  const isError = status === 'error';
  const isCapturing = status === 'capturing';

  return (
    <NodeViewWrapper as="span" className="inline-block relative group align-middle mx-1 my-1 not-prose select-none max-w-full">
      <div
        onMouseDown={() => {
          if (typeof pos === 'number' && props.editor) {
            props.editor.commands.setNodeSelection(pos);
          }
        }}
        onClick={handleOpenActionModal}
        title={isError ? `Erro: ${error_reason || 'Falha na captura'}. Clique para opções.` : `${title || url} (Snapshot Offline)`}
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all duration-200 max-w-[420px] sm:max-w-[500px] shadow-sm ${
          isError
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/60'
            : isCapturing
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 animate-pulse'
            : isNodeSelected
            ? 'ring-2 ring-brand-primary border-brand-primary bg-dark-card text-white'
            : 'border-white/10 bg-dark-card/90 hover:bg-dark-card text-dark-text hover:border-brand-primary/40 hover:text-white'
        }`}
      >
        {/* Favicon / Ícone */}
        <div className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center shrink-0 overflow-hidden">
          {favicon ? (
            <img src={favicon} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ) : (
            <Globe size={13} className={isError ? 'text-rose-400' : 'text-brand-primary'} />
          )}
        </div>

        {/* Título / Domínio compacto */}
        <span className="truncate max-w-[180px] sm:max-w-[260px] leading-tight">
          {title || cleanDomain || url}
        </span>

        {/* Metadados / Badges mínimos */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {isCapturing && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-normal">
              <Loader2 size={11} className="animate-spin" />
              Capturando...
            </span>
          )}

          {isError && (
            <span className="flex items-center gap-1 text-[11px] text-rose-400 font-normal">
              <AlertCircle size={12} />
              Falha
            </span>
          )}

          {!isError && !isCapturing && file_size && (
            <span className="font-mono text-[10px] opacity-60 bg-white/5 px-1.5 py-0.5 rounded">
              {formatBytes(file_size)}
            </span>
          )}

          {!isError && !isCapturing && (
            drive_file_id ? (
              <span title="Sincronizado no Google Drive E2EE">
                <Cloud size={11} className="text-blue-400/80" />
              </span>
            ) : (
              <span title="Salvo Localmente (Offline)">
                <HardDrive size={11} className="text-amber-400/80" />
              </span>
            )
          )}
        </div>

        {/* Ações Rápidas no Hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
          {isError ? (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors"
              title="Tentar Capturar Novamente"
            >
              <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
            </button>
          ) : !isCapturing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenActionModal();
                }}
                className="p-1 rounded hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
                title="Visualizar Opções"
              >
                <Eye size={12} />
              </button>
              <button
                onClick={handleOpenLiveDirect}
                className="p-1 rounded hover:bg-white/10 text-dark-subtext hover:text-blue-400 transition-colors"
                title="Abrir no Navegador"
              >
                <ExternalLink size={12} />
              </button>
            </>
          ) : null}

          <button
            onClick={handleDeleteRequest}
            className="p-1 rounded hover:bg-white/10 text-dark-subtext hover:text-rose-400 transition-colors"
            title="Excluir Snapshot"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
