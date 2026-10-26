/**
 * @file WorkspaceMembersModal.tsx
 * @description Administrative modal for managing workspace members, roles, and invitations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Loader2,
  Mail,
  AlertCircle,
} from 'lucide-react';
import type { WorkspaceMember, WorkspaceInvitation, WorkspaceRole } from '../../types/workspace';
import {
  listWorkspaceMembers,
  listWorkspaceInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  deleteWorkspace,
  getWorkspace,
} from '../../services/workspace/workspace-service';
import { getCurrentAuthUser } from '../../services/auth/firebase-auth';

interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onWorkspaceDeleted?: () => void;
}

export const WorkspaceMembersModal: React.FC<WorkspaceMembersModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onWorkspaceDeleted,
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const currentUser = getCurrentAuthUser();

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setActionError('');
    try {
      const [meta, memList, invList] = await Promise.all([
        getWorkspace(workspaceId),
        listWorkspaceMembers(workspaceId),
        listWorkspaceInvitations(workspaceId),
      ]);
      if (meta) setWorkspaceName(meta.name);
      setMembers(memList);
      setInvitations(invList);
    } catch (err) {
      console.error('Error loading workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwner = currentMember?.role === 'owner';
  const isAdminOrOwner = isOwner || currentMember?.role === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    if (!currentUser) return;

    setIsInviting(true);
    setActionError('');
    setActionSuccess('');

    try {
      await inviteMember(
        workspaceId,
        workspaceName,
        inviteEmail.trim(),
        inviteRole,
        currentUser.uid,
        currentUser.email || 'user@example.com'
      );
      setInviteEmail('');
      setActionSuccess(`Convite enviado com sucesso para ${inviteEmail}!`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao convidar membro';
      setActionError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: WorkspaceRole) => {
    try {
      await updateMemberRole(workspaceId, targetUserId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar função';
      setActionError(msg);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    try {
      await removeMember(workspaceId, targetUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover membro';
      setActionError(msg);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentUser || !isOwner) return;
    try {
      await deleteWorkspace(workspaceId, currentUser.uid);
      onWorkspaceDeleted?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir workspace';
      setActionError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-1 text-zinc-100 font-semibold text-lg">
          <Users size={20} className="text-brand-400" />
          <h2>Membros & Permissões</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          Workspace: <span className="text-zinc-200 font-medium">{workspaceName}</span>
        </p>

        {actionError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            {actionSuccess}
          </div>
        )}

        {/* Invite Form (Admins / Owners only) */}
        {isAdminOrOwner && (
          <form onSubmit={handleInvite} className="mb-6 p-3.5 rounded-xl bg-zinc-950 border border-white/[0.06] flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Mail size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="convidado@exemplo.com"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-100 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'editor' | 'viewer')}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Leitor</option>
              <option value="admin">Administrador</option>
            </select>
            <button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium text-xs hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
            >
              {isInviting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
              <span>Convidar</span>
            </button>
          </form>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 min-h-[160px]">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Membros Ativos ({members.length})
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500 text-xs gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Carregando membros...</span>
            </div>
          ) : (
            members.map((member) => {
              const isSelf = member.userId === currentUser?.uid;
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.04] text-xs"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-medium text-zinc-200 truncate">
                      {member.displayName || member.email} {isSelf && <span className="text-zinc-500 text-[10px]">(você)</span>}
                    </span>
                    <span className="text-[11px] text-zinc-500 truncate">{member.email}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role changer */}
                    {isOwner && !isSelf ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value as WorkspaceRole)}
                        className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-[11px] text-zinc-300 focus:outline-none"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Leitor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-white/5 border border-white/10 text-zinc-300 font-medium">
                        {member.role === 'owner' ? 'Dono' : member.role === 'admin' ? 'Admin' : member.role === 'editor' ? 'Editor' : 'Leitor'}
                      </span>
                    )}

                    {/* Remove button */}
                    {isAdminOrOwner && !isSelf && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remover do Workspace"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Convites Pendentes ({invitations.length})
              </div>
              <div className="flex flex-col gap-1.5">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-dashed border-white/10 text-xs text-zinc-400"
                  >
                    <span>{inv.invitedEmail}</span>
                    <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded">
                      Pendente ({inv.role})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions: Delete Workspace */}
        {isOwner && (
          <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">Ações perigosas</span>
            <button
              type="button"
              onClick={handleDeleteWorkspace}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Excluir Workspace</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
