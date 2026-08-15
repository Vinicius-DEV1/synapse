import React from 'react';
import { FileText, MoreVertical } from 'lucide-react';
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

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-white/5 text-dark-subtext text-xs uppercase">
              <th className="px-4 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium w-24">Tipo</th>
              <th className="px-4 py-3 font-medium w-32">Tamanho</th>
              <th className="px-4 py-3 font-medium w-40">Modificado</th>
              <th className="px-4 py-3 font-medium w-32">Origem</th>
              <th className="px-4 py-3 font-medium w-16 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {files.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-dark-subtext">
                  Nenhum arquivo encontrado nesta pasta.
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
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(file.id)}
                      onChange={() => onToggleSelect(file.id)}
                      className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <FileText size={18} className="text-blue-400 shrink-0" />
                    <span className="truncate max-w-[300px]" title={file.name}>{file.name}</span>
                  </td>
                  <td className="px-4 py-3 text-dark-subtext uppercase text-xs">{file.file_type}</td>
                  <td className="px-4 py-3 text-dark-subtext">{(file.file_size / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-4 py-3 text-dark-subtext">{new Date(file.updated_at || Date.now()).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-xs text-dark-subtext border border-white/5">
                      ☁️ Drive
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onContextMenu(e, file);
                      }}
                      className="p-1 text-dark-subtext hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
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
