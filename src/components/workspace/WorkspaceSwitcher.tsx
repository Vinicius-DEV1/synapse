/**
 * @file WorkspaceSwitcher.tsx
 * @description Notion-style interactive workspace selector with role badge,
 * instant workspace switching, and administrative modal triggers.
 */

import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Users,
  Check,
  Shield,
  UserCheck,
  Edit3,
  Eye,
  Sparkles,
} from 'lucide-react';
import type { UserMembershipPointer, WorkspaceRole } from '../../types/workspace';
import { listUserWorkspaces } from '../../services/workspace/workspace-service';
import { getCurrentAuthUser } from '../../services/auth/firebase-auth';

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onOpenCreateModal: () => void;
  onOpenMembersModal: () => void;
  currentRole?: WorkspaceRole;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  currentWorkspaceId,
  onSelectWorkspace,
  onOpenCreateModal,
  onOpenMembersModal,
  currentRole = 'owner',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<UserMembershipPointer[]>([]);
  const user = getCurrentAuthUser();

  useEffect(() => {
    if (!user) return;
    listUserWorkspaces(user.uid).then((list) => {
      setWorkspaces(list);
    }).catch(console.error);
  }, [user, currentWorkspaceId]);

  const activePointer = workspaces.find((w) => w.workspaceId === currentWorkspaceId) || workspaces[0];
  const activeName = activePointer?.name || (user ? 'Workspace Pessoal' : 'Espaço Pessoal (Local)');
  const activeIcon = activePointer?.icon || '📁';
  const role = activePointer?.role || currentRole;

  const renderRoleBadge = (r: WorkspaceRole) => {
    switch (r) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Shield size={10} /> Dono
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
            <UserCheck size={10} /> Admin
          </span>
        );
      case 'editor':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Edit3 size={10} /> Editor
          </span>
        );
      case 'viewer':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
            <Eye size={10} /> Leitor
          </span>
        );
    }
  };

  return (
    <div className="relative select-none px-2 py-1.5 border-b border-white/[0.06]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all text-left group"
        title="Alternar Workspace"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg leading-none shrink-0">{activeIcon}</span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white">
              {activeName}
            </span>
            <div className="mt-0.5">{renderRoleBadge(role)}</div>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 shrink-0 ml-1 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-2 right-2 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 text-xs">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Seus Workspaces
            </div>

            {workspaces.length === 0 && (
              <div className="px-2.5 py-2 text-zinc-400 text-[11px] italic">
                {user ? 'Nenhum workspace encontrado.' : 'Espaço local ativo (usuário único).'}
              </div>
            )}

            {workspaces.map((ws) => {
              const isSelected = ws.workspaceId === (currentWorkspaceId || activePointer?.workspaceId);
              return (
                <button
                  key={ws.workspaceId}
                  onClick={() => {
                    onSelectWorkspace(ws.workspaceId);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left ${
                    isSelected
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{ws.icon || '📁'}</span>
                    <span className="truncate">{ws.name}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                </button>
              );
            })}

            {!user && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent('open-account-evolution'));
                }}
                className="flex items-center gap-2 px-2.5 py-2 mt-1 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-left font-medium"
              >
                <Sparkles size={14} />
                <span>Evoluir para Multiusuário</span>
              </button>
            )}

            <div className="h-px bg-white/5 my-1" />

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenCreateModal();
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Plus size={14} className="text-zinc-400" />
              <span>Criar Workspace</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenMembersModal();
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Users size={14} className="text-zinc-400" />
              <span>Membros & Permissões</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
