/**
 * @file workspace.ts
 * @description Domain types and role contracts for collaborative multi-user workspaces.
 */

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMeta {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
  type: 'personal' | 'team';
  isArchived: boolean;
  memberCount: number;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  email: string;
  displayName: string;
  encryptedWorkspaceKey: string; // Base64 wrapped with member's Master Key
  joinedAt: string;
  invitedBy: string;
}

export interface UserMembershipPointer {
  workspaceId: string;
  name: string;
  icon: string;
  role: WorkspaceRole;
  isDefault: boolean;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedEmail: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invitedByUserId: string;
  invitedByEmail: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  icon?: string;
  type?: 'personal' | 'team';
}

export interface UpdateWorkspaceInput {
  name?: string;
  icon?: string;
  isArchived?: boolean;
}

export interface WorkspaceContextState {
  currentWorkspace: WorkspaceMeta | null;
  workspaces: UserMembershipPointer[];
  currentMemberRole: WorkspaceRole | null;
  isLoadingWorkspaces: boolean;
  workspaceKey: CryptoKey | null;
}
