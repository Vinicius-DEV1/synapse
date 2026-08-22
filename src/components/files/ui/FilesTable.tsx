import React from 'react';
import { FileText, MoreVertical, Film, Image as ImageIcon, FileArchive, FileCode, File } from 'lucide-react';
import type { FileItem } from '../../../types';

interface FilesTableProps {
  files: FileItem[];
  selectedIds: Set<string>;
  onToggleSelect: (fileId: string) => void;
  onToggleSelectAll: () => void;
  onView: (file: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void;
}

export function FilesTable({
  files,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onContextMenu
}: FilesTableProps) {
  const allSelected = files.length > 0 && selectedIds.size === files.length;

  const getFileIcon = (file: FileItem) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const type = file.file_type?.toLowerCase() || '';

    if (type === 'pdf' || ext === 'pdf') {
      return <FileText size={18} className="text-red-400 shrink-0" />;
    }
    if (type === 'epub' || ext === 'epub') {
      return <FileText size={18} className="text-emerald-400 shrink-0" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || type === 'image') {
      return <ImageIcon size={18} className="text-blue-400 shrink-0" />;
    }
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext) || type === 'video') {
      return <Film size={18} className="text-purple-400 shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type === 'archive') {
      return <FileArchive size={18} className="text-amber-400 shrink-0" />;
    }
    if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'rs', 'py'].includes(ext) || type === 'code') {
      return <FileCode size={18} className="text-cyan-400 shrink-0" />;
    }
    return <File size={18} className="text-blue-400 shrink-0" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 0.01) return `${(bytes / 1024).toFixed(1)} KB`;
    if (mb >= 1000) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
      <div className="bg-white/5 rounded-xl border border-white/5 overflow-x-auto min-w-0 shadow-sm">
        <table className="w-full text-sm text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-white/5 text-dark-subtext text-xs uppercase tracking-wider border-b border-white/5">
              <th className="px-3 py-3 font-medium w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 font-medium">Nome</th>
              <th className="px-3 py-3 font-medium w-20">Tipo</th>
              <th className="px-3 py-3 font-medium w-24">Tamanho</th>
              <th className="px-3 py-3 font-medium w-28">Modificado</th>
              <th className="px-3 py-3 font-medium w-24 text-center">Origem</th>
              <th className="px-3 py-3 font-medium w-12 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {files.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-dark-subtext">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <File size={32} className="opacity-30" />
                    <span>Nenhum arquivo encontrado nesta pasta.</span>
                  </div>
                </td>
              </tr>
            ) : (
              files.map(file => (
                <tr 
                  key={file.id} 
                  className={`hover:bg-white/5 transition-colors group cursor-pointer ${
                    selectedIds.has(file.id) ? 'bg-brand-500/10' : ''
                  }`}
                  onDoubleClick={() => onView(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(e, file);
                  }}
                >
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(file.id)}
                      onChange={() => onToggleSelect(file.id)}
                      className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] md:max-w-xs xl:max-w-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getFileIcon(file)}
                      <span className="truncate text-white/90 font-medium hover:text-white" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[11px] font-mono uppercase text-dark-subtext border border-white/5">
                      {file.file_type || file.name.split('.').pop() || 'file'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-dark-subtext text-xs whitespace-nowrap">
                    {formatFileSize(file.file_size)}
                  </td>
                  <td className="px-3 py-2.5 text-dark-subtext text-xs whitespace-nowrap">
                    {new Date(file.updated_at || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[11px] text-dark-subtext border border-white/5 whitespace-nowrap">
                      ☁️ Drive
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onContextMenu(e, file);
                      }}
                      className="p-1 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                      title="Mais opções"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
