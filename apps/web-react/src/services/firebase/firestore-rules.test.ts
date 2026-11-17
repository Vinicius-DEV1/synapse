import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const projectId = 'demo-synapse';
const rules = readFileSync(resolve(process.cwd(), '../../firestore.rules'), 'utf8');
let testEnvironment: RulesTestEnvironment;

async function seedDocument(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe('Firestore security rules', () => {
  beforeAll(async () => {
    const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST;
    if (!emulatorAddress) throw new Error('Run this suite through the Firestore Emulator.');
    const [host, port] = emulatorAddress.split(':');
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: { host, port: Number(port), rules },
    });
  });

  beforeEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('isolates private account sync data and denies flat root collections', async () => {
    await seedDocument('users/alice/sync/data/pages/page-1', { encryptedData: 'alice-data' });
    await seedDocument('users/alice/sync/data/pages/page-1/chunks/chunk-1', { encryptedChunk: 'alice-chunk' });
    await seedDocument('pages/legacy-page', { encryptedData: 'unscoped-data' });

    const aliceDb = testEnvironment.authenticatedContext('alice', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const bobDb = testEnvironment.authenticatedContext('bob', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const anonymousDb = testEnvironment.authenticatedContext('visitor', {
      firebase: { sign_in_provider: 'anonymous' },
    }).firestore();

    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/sync/data/pages/page-1')));
    await assertSucceeds(getDoc(doc(aliceDb, 'users/alice/sync/data/pages/page-1/chunks/chunk-1')));
    await assertFails(getDoc(doc(bobDb, 'users/alice/sync/data/pages/page-1')));
    await assertFails(getDoc(doc(bobDb, 'users/alice/sync/data/pages/page-1/chunks/chunk-1')));
    await assertFails(getDocs(collection(bobDb, 'users/alice/sync/data/pages')));
    await assertFails(setDoc(doc(bobDb, 'users/alice/sync/data/pages/page-2'), { encryptedData: 'x' }));
    await assertFails(setDoc(doc(bobDb, 'users/alice/sync/data/pages/page-1/chunks/chunk-2'), { encryptedChunk: 'x' }));
    await assertFails(deleteDoc(doc(bobDb, 'users/alice/sync/data/pages/page-1')));
    await assertFails(getDoc(doc(anonymousDb, 'users/alice/sync/data/pages/page-1')));
    await assertFails(getDoc(doc(anonymousDb, 'users/alice/sync/data/pages/page-1/chunks/chunk-1')));
    await assertFails(getDoc(doc(aliceDb, 'pages/legacy-page')));
    await assertFails(setDoc(doc(anonymousDb, 'pages/injected'), { encryptedData: 'x' }));
  });

  it('enforces workspace membership roles and rejects self-enrollment', async () => {
    await seedDocument('workspaces/team-1', { ownerId: 'owner' });
    await seedDocument('workspaces/team-1/members/owner', { role: 'owner' });
    await seedDocument('workspaces/team-1/members/admin', { role: 'admin' });
    await seedDocument('workspaces/team-1/members/editor', { role: 'editor' });
    await seedDocument('workspaces/team-1/members/viewer', { role: 'viewer' });
    await seedDocument('workspaces/team-1/pages/page-1', { encryptedData: 'team-data' });
    await seedDocument('workspaces/team-1/pages/page-1/chunks/chunk-1', { encryptedChunk: 'team-chunk' });

    const editorDb = testEnvironment.authenticatedContext('editor', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const adminDb = testEnvironment.authenticatedContext('admin', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const ownerDb = testEnvironment.authenticatedContext('owner', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const viewerDb = testEnvironment.authenticatedContext('viewer', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const outsiderDb = testEnvironment.authenticatedContext('outsider', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();

    await assertSucceeds(getDoc(doc(editorDb, 'workspaces/team-1/pages/page-1')));
    await assertSucceeds(getDoc(doc(editorDb, 'workspaces/team-1/pages/page-1/chunks/chunk-1')));
    await assertSucceeds(setDoc(doc(editorDb, 'workspaces/team-1/pages/page-1/chunks/chunk-2'), { encryptedChunk: 'new' }));
    await assertSucceeds(setDoc(doc(editorDb, 'workspaces/team-1/pages/page-2'), { encryptedData: 'new' }));
    await assertSucceeds(setDoc(doc(adminDb, 'workspaces/team-1/pages/page-3'), { encryptedData: 'admin' }));
    await assertSucceeds(setDoc(doc(ownerDb, 'workspaces/team-1/pages/page-4'), { encryptedData: 'owner' }));
    await assertSucceeds(getDoc(doc(viewerDb, 'workspaces/team-1/pages/page-1')));
    await assertSucceeds(getDoc(doc(viewerDb, 'workspaces/team-1/pages/page-1/chunks/chunk-1')));
    await assertFails(setDoc(doc(viewerDb, 'workspaces/team-1/pages/page-1/chunks/chunk-2'), { encryptedChunk: 'new' }));
    await assertFails(setDoc(doc(viewerDb, 'workspaces/team-1/pages/page-2'), { encryptedData: 'new' }));
    await assertFails(getDoc(doc(outsiderDb, 'workspaces/team-1/pages/page-1')));
    await assertFails(getDoc(doc(outsiderDb, 'workspaces/team-1/pages/page-1/chunks/chunk-1')));
    await assertFails(setDoc(doc(outsiderDb, 'workspaces/team-1/members/outsider'), { role: 'editor' }));
  });

  it('accepts an invitation only for the authenticated invitee', async () => {
    await seedDocument('workspaces/team-2', { ownerId: 'owner' });
    await seedDocument('workspaces/team-2/members/owner', { role: 'owner' });
    await seedDocument('workspaces/team-2/invitations/invite-1', {
      workspaceId: 'team-2',
      invitedEmail: 'invitee@example.com',
      role: 'editor',
      status: 'pending',
    });

    const inviteeDb = testEnvironment.authenticatedContext('invitee', {
      email: 'invitee@example.com',
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const batch = writeBatch(inviteeDb);
    batch.update(doc(inviteeDb, 'workspaces/team-2/invitations/invite-1'), { status: 'accepted' });
    batch.set(doc(inviteeDb, 'workspaces/team-2/members/invitee'), {
      userId: 'invitee',
      role: 'editor',
      invitationId: 'invite-1',
    });
    batch.set(doc(inviteeDb, 'users/invitee/memberships/team-2'), {
      workspaceId: 'team-2',
      role: 'editor',
    });

    await assertSucceeds(batch.commit());
  });

  it('allows public reads only for active version 2 shares', async () => {
    await seedDocument('shared_pages/share-v2', {
      id: 'share-v2',
      ownerUid: 'owner',
      keyProtectionVersion: 2,
      isActive: true,
      wrappedShareKey: 'master-wrapped-key',
    });
    await seedDocument('shared_pages/share-legacy', {
      id: 'share-legacy',
      isActive: true,
      wrappedShareKey: 'plaintext-legacy-key',
    });

    const publicDb = testEnvironment.unauthenticatedContext().firestore();
    const ownerDb = testEnvironment.authenticatedContext('owner', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const otherDb = testEnvironment.authenticatedContext('other', {
      firebase: { sign_in_provider: 'password' },
    }).firestore();

    await assertSucceeds(getDoc(doc(publicDb, 'shared_pages/share-v2')));
    await assertFails(getDoc(doc(publicDb, 'shared_pages/share-legacy')));
    await assertSucceeds(setDoc(doc(ownerDb, 'shared_pages/share-v2'), {
      id: 'share-v2',
      ownerUid: 'owner',
      keyProtectionVersion: 2,
      isActive: false,
      wrappedShareKey: 'master-wrapped-key',
    }));
    await assertFails(setDoc(doc(otherDb, 'shared_pages/share-v2'), {
      id: 'share-v2',
      ownerUid: 'other',
      keyProtectionVersion: 2,
      isActive: true,
      wrappedShareKey: 'tampered',
    }));
  });
});
