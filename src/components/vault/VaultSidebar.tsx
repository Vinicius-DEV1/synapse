import { Shield, Plus, ShieldAlert, ShieldCheck, Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import type { VaultGroup } from '../../types';

interface VaultSidebarProps {
  groups: VaultGroup[];
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  viewMode: 'list' | 'security';
  setViewMode: (mode: 'list' | 'security') => void;
  groupContextMenu: { id: string; x: number; y: number } | null;
  setGroupContextMenu: (ctx: { id: string; x: number; y: number } | null) => void;
  handleCreateGroup: () => void;
  handleEditGroup: (group: VaultGroup) => void;
  handleDeleteGroup: (group: VaultGroup) => void;
}

export function VaultSidebar({
  groups,
  selectedGroupId,
  setSelectedGroupId,
  viewMode,
  setViewMode,
  groupContextMenu,
  setGroupContextMenu,
  handleCreateGroup,
  handleEditGroup,
  handleDeleteGroup,
}: VaultSidebarProps) {
  return (
    <div className="w-64 border-r border-white/5 bg-dark-card/30 flex flex-col">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-400 font-semibold">
          <Shield size={20} />
          <span>Cofre</span>
        </div>
        <button
          onClick={handleCreateGroup}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
          title="Novo Grupo"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <button
          onClick={() => {
            setViewMode('list');
            setSelectedGroupId(null);
          }}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
            selectedGroupId === null && viewMode === 'list'
              ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500'
              : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
          }`}
        >
          <ShieldAlert size={16} />
          <span>Todos os Itens</span>
        </button>

        <button
          onClick={() => setViewMode('security')}
          className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors mt-1 ${
            viewMode === 'security'
              ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500'
              : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Painel de Segurança</span>
        </button>

        <div className="px-4 py-2 mt-4 text-xs font-semibold text-dark-subtext uppercase tracking-wider">
          Grupos
        </div>
        {groups.map((g) => (
          <div
            key={g.id}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setGroupContextMenu({ id: g.id, x: e.clientX, y: e.clientY });
            }}
            className={`group w-full flex items-center justify-between px-2 py-1 transition-colors cursor-pointer ${
              selectedGroupId === g.id && viewMode === 'list'
                ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500'
                : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
            }`}
          >
            <div
              className="flex items-center gap-2 flex-1 overflow-hidden px-2 py-1"
              onClick={() => {
                setViewMode('list');
                setSelectedGroupId(g.id);
              }}
            >
              <Folder size={16} style={{ color: g.color || undefined }} className="flex-shrink-0" />
              <span className="truncate text-sm">{g.name}</span>
            </div>
            <div className="flex flex-shrink-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setGroupContextMenu({ id: g.id, x: e.clientX, y: e.clientY });
                }}
                className="p-1 hover:bg-white/10 rounded"
              >
                <MoreVertical size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Context Menu for Groups */}
      {groupContextMenu && (
        <div
          className="fixed z-50 bg-dark-card border border-white/10 rounded-lg shadow-xl py-1 w-40 animate-fade-in"
          style={{ top: groupContextMenu.y, left: groupContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const group = groups.find((g) => g.id === groupContextMenu.id);
              if (group) handleEditGroup(group);
              setGroupContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/10 transition-colors"
          >
            <Edit2 size={14} /> Renomear
          </button>
          <button
            onClick={() => {
              const group = groups.find((g) => g.id === groupContextMenu.id);
              if (group) handleDeleteGroup(group);
              setGroupContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={14} /> Deletar
          </button>
        </div>
      )}
    </div>
  );
}
