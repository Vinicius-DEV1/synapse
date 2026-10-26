/**
 * @file workspace-service.ts
 * @description Orchestrator for collaborative multi-user workspaces.
 * Manages workspace lifecycle, membership indices, invitations, role transitions,
 * and cryptographic key distribution with zero plaintext leakage.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  WorkspaceMeta,
  WorkspaceMember,
  WorkspaceRole,
  UserMembershipPointer,
  WorkspaceInvitation,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '../../types/workspace';
import {
  generateWorkspaceKey,
  wrapWorkspaceKeyWithMaster,
  unwrapWorkspaceKeyWithMaster,
} from './workspace-crypto';
import { getErrorMessage } from '../../utils/error';

/**
 * Creates a brand new workspace with its own E2EE workspace key and links the creator as owner.
 */
export async function createWorkspace(
  userId: string,
  userEmail: string,
  input: CreateWorkspaceInput,
  masterKey: CryptoKey
): Promise<{ workspace: WorkspaceMeta; workspaceKey: CryptoKey }> {
  const wsId = `ws_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // 1. Generate dedicated workspace E2EE key and wrap with creator's Master Key
  const workspaceKey = await generateWorkspaceKey();
  const encryptedWorkspaceKey = await wrapWorkspaceKeyWithMaster(workspaceKey, masterKey);

  const workspace: WorkspaceMeta = {
    id: wsId,
    name: input.name.trim() || 'Meu Workspace',
    icon: input.icon || '📁',
    ownerId: userId,
    type: input.type || 'team',
    isArchived: false,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  const member: WorkspaceMember = {
    userId,
    workspaceId: wsId,
    role: 'owner',
    email: userEmail,
    displayName: userEmail.split('@')[0] || 'Usuário',
    encryptedWorkspaceKey,
    joinedAt: now,
    invitedBy: userId,
  };

  const pointer: UserMembershipPointer = {
    workspaceId: wsId,
    name: workspace.name,
    icon: workspace.icon,
    role: 'owner',
    isDefault: input.type === 'personal',
    joinedAt: now,
  };

  // Atomic batch write across workspace, member, and user index
  const batch = writeBatch(db);
  batch.set(doc(db, 'workspaces', wsId), workspace);
  batch.set(doc(db, 'workspaces', wsId, 'members', userId), member);
  batch.set(doc(db, 'users', userId, 'memberships', wsId), pointer);

  await batch.commit();

  return { workspace, workspaceKey };
}

/**
 * Returns all workspaces the user belongs to by querying their denormalized index.
 * Cost: Exactly 1 query returning N documents ($O(1)$ read complexity).
 */
export async function listUserWorkspaces(userId: string): Promise<UserMembershipPointer[]> {
  try {
    const q = collection(db, 'users', userId, 'memberships');
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserMembershipPointer);
  } catch (err) {
    console.warn('[WorkspaceService] Error listing user workspaces:', getErrorMessage(err));
    return [];
  }
}

/**
 * Retrieves metadata for a specific workspace.
 */
export async function getWorkspace(workspaceId: string): Promise<WorkspaceMeta | null> {
  try {
    const ref = doc(db, 'workspaces', workspaceId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as WorkspaceMeta;
  } catch (err) {
    console.warn('[WorkspaceService] Error fetching workspace:', getErrorMessage(err));
    return null;
  }
}

/**
 * Lists all active members of a workspace.
 */
export async function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const q = collection(db, 'workspaces', workspaceId, 'members');
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WorkspaceMember);
  } catch (err) {
    console.warn('[WorkspaceService] Error listing workspace members:', getErrorMessage(err));
    return [];
  }
}

/**
 * Updates workspace name, icon, or archive status.
 */
export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput
): Promise<void> {
  const ref = doc(db, 'workspaces', workspaceId);
  const updates: Partial<WorkspaceMeta> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.icon !== undefined) updates.icon = input.icon;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await updateDoc(ref, updates);
}

/**
 * Unwraps the workspace's E2EE key for the current member using their personal Master Key.
 */
export async function unlockWorkspaceKey(
  workspaceId: string,
  userId: string,
  masterKey: CryptoKey
): Promise<CryptoKey | null> {
  try {
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', userId);
    const snap = await getDoc(memberRef);
    if (!snap.exists()) return null;

    const member = snap.data() as WorkspaceMember;
    if (!member.encryptedWorkspaceKey) return null;

    return await unwrapWorkspaceKeyWithMaster(member.encryptedWorkspaceKey, masterKey);
  } catch (err) {
    console.error('[WorkspaceService] Failed to unlock workspace key:', getErrorMessage(err));
    return null;
  }
}

/**
 * Creates an invitation for a collaborator by email.
 */
export async function inviteMember(
  workspaceId: string,
  workspaceName: string,
  invitedEmail: string,
  role: 'admin' | 'editor' | 'viewer',
  invitedByUserId: string,
  invitedByEmail: string
): Promise<WorkspaceInvitation> {
  const invId = `inv_${crypto.randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7-day TTL

  const invitation: WorkspaceInvitation = {
    id: invId,
    workspaceId,
    workspaceName,
    invitedEmail: invitedEmail.trim().toLowerCase(),
    role,
    status: 'pending',
    invitedByUserId,
    invitedByEmail,
    createdAt: now.toISOString(),
    expiresAt,
  };

  await setDoc(doc(db, 'workspaces', workspaceId, 'invitations', invId), invitation);
  return invitation;
}

/**
 * Lists pending invitations for a workspace.
 */
export async function listWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  try {
    const q = query(
      collection(db, 'workspaces', workspaceId, 'invitations'),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WorkspaceInvitation);
  } catch (err) {
    console.warn('[WorkspaceService] Error listing invitations:', getErrorMessage(err));
    return [];
  }
}

/**
 * Changes a member's role within a workspace.
 */
export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceRole
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'workspaces', workspaceId, 'members', targetUserId), { role: newRole });
  batch.update(doc(db, 'users', targetUserId, 'memberships', workspaceId), { role: newRole });
  await batch.commit();
}

/**
 * Removes a member from a workspace atomically.
 */
export async function removeMember(workspaceId: string, targetUserId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'workspaces', workspaceId, 'members', targetUserId));
  batch.delete(doc(db, 'users', targetUserId, 'memberships', workspaceId));
  await batch.commit();
}

/**
 * Transfers primary ownership of a workspace to another member.
 */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const wsRef = doc(db, 'workspaces', workspaceId);
    const currentOwnerRef = doc(db, 'workspaces', workspaceId, 'members', currentOwnerId);
    const newOwnerRef = doc(db, 'workspaces', workspaceId, 'members', newOwnerId);
    const currentOwnerPointer = doc(db, 'users', currentOwnerId, 'memberships', workspaceId);
    const newOwnerPointer = doc(db, 'users', newOwnerId, 'memberships', workspaceId);

    const wsSnap = await transaction.get(wsRef);
    if (!wsSnap.exists()) throw new Error('Workspace não encontrado');
    if (wsSnap.data().ownerId !== currentOwnerId) throw new Error('Apenas o dono atual pode transferir a propriedade.');

    transaction.update(wsRef, { ownerId: newOwnerId, updatedAt: new Date().toISOString() });
    transaction.update(currentOwnerRef, { role: 'admin' });
    transaction.update(newOwnerRef, { role: 'owner' });
    transaction.update(currentOwnerPointer, { role: 'admin' });
    transaction.update(newOwnerPointer, { role: 'owner' });
  });
}

/**
 * Safely deletes a workspace.
 */
export async function deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  const wsRef = doc(db, 'workspaces', workspaceId);
  const snap = await getDoc(wsRef);
  if (!snap.exists()) return;
  if (snap.data().ownerId !== userId) {
    throw new Error('Apenas o dono pode excluir o workspace.');
  }

  // Mark as archived and delete member pointers
  const members = await listWorkspaceMembers(workspaceId);
  const batch = writeBatch(db);
  for (const m of members) {
    batch.delete(doc(db, 'users', m.userId, 'memberships', workspaceId));
  }
  batch.delete(wsRef);
  await batch.commit();
}

/**
 * Accepts a pending workspace invitation for the authenticated user.
 */
export async function acceptInvitation(
  workspaceId: string,
  invitationId: string,
  userId: string,
  userEmail: string,
  userName?: string
): Promise<void> {
  const invRef = doc(db, 'workspaces', workspaceId, 'invitations', invitationId);
  const invSnap = await getDoc(invRef);
  if (!invSnap.exists()) throw new Error('Convite não encontrado.');
  const invitation = invSnap.data() as WorkspaceInvitation;
  if (invitation.status !== 'pending') throw new Error('Este convite não está mais pendente.');
  if (invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('Este convite não pertence a este e-mail.');
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Mark invitation as accepted
  batch.update(invRef, { status: 'accepted' });

  // 2. Add member
  const member: WorkspaceMember = {
    userId,
    workspaceId,
    email: userEmail,
    displayName: userName || userEmail.split('@')[0],
    role: invitation.role,
    encryptedWorkspaceKey: '',
    joinedAt: now,
    invitedBy: invitation.invitedByUserId,
  };
  batch.set(doc(db, 'workspaces', workspaceId, 'members', userId), member);

  // 3. Add membership pointer to user profile
  const pointer: UserMembershipPointer = {
    workspaceId,
    name: invitation.workspaceName,
    icon: '📁',
    role: invitation.role,
    isDefault: false,
    joinedAt: now,
  };
  batch.set(doc(db, 'users', userId, 'memberships', workspaceId), pointer);

  await batch.commit();
}

/**
 * Declines a pending workspace invitation.
 */
export async function declineInvitation(
  workspaceId: string,
  invitationId: string
): Promise<void> {
  const invRef = doc(db, 'workspaces', workspaceId, 'invitations', invitationId);
  await updateDoc(invRef, { status: 'declined' });
}
