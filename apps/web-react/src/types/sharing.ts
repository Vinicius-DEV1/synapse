/**
 * @file sharing.ts
 * @description Core TypeScript contracts and schemas for Caderno's Page Sharing feature,
 * including owner-gated access control, end-to-end encryption keys, device fingerprints,
 * real-time collaboration deltas, live cursor awareness, and witty animal pun personas.
 */

/** Configuration metadata for a publicly shared page */
export interface SharedPageConfig {
  /** Unique share ID (URL-safe cryptographically random 12-char slug) */
  id: string;
  /** Original local page ID in the owner's notebook */
  pageId: string;
  /** Owner device fingerprint hash to verify authorship */
  ownerId: string;

  // Scope & Inclusions
  /** Share scope: single page or include nested descendants */
  scope: 'single' | 'with-children';
  /** Whether embedded images, attachments, and PDFs are packaged */
  includeMedia: boolean;

  // Access Control & Security
  /** Whether the page requires a password to request access */
  isPasswordProtected: boolean;
  /** PBKDF2-SHA256 password hash (never raw password) */
  passwordHash: string | null;
  /** Cryptographically random salt for PBKDF2 */
  passwordSalt: string | null;
  /** Whether the owner must actively approve each new device even after correct password */
  requireOwnerApproval: boolean;

  // Permissions & Collaboration
  /** Permission tier: read-only or collaborative live editing */
  permission: 'read-only' | 'editable';

  // Cryptographic Verification
  /** SHA-256 hash of the page's isolated AES-256-GCM symmetric key */
  encryptionKeyHash: string;
  /** Share key wrapped with the owner's Master Key for local/cloud storage */
  wrappedShareKey: string;

  // Status & Quotas
  /** Whether the share link is active (false = revoked without deletion) */
  isActive: boolean;
  /** Optional ISO-8601 expiration timestamp */
  expiresAt: string | null;
  /** Maximum allowed successful views (null = unlimited) */
  maxViews: number | null;
  /** Cumulative view counter */
  viewCount: number;

  // Page Snapshot Metadata
  /** Page title snapshot at share creation time */
  title: string;
  /** Page icon snapshot */
  icon: string;
  /** Creation timestamp in ISO format */
  createdAt: string;
  /** Last update timestamp in ISO format */
  updatedAt: string;
}

/** Encrypted page content payload stored in Firestore */
export interface SharedPagePayload {
  shareId: string;
  /** AES-256-GCM encrypted HTML/ProseMirror content (Base64 IV + Ciphertext + Tag) */
  encryptedContent: string;
  /** AES-256-GCM encrypted title */
  encryptedTitle: string;
  /** AES-256-GCM encrypted icon */
  encryptedIcon: string;
  /** Optional encrypted cover image URL */
  coverImage: string | null;
  /** SHA-256 hash of decrypted content for tamper detection */
  contentHash: string;
  /** Update timestamp in ISO format */
  updatedAt: string;
}

/** Encrypted child page payload (for scope='with-children') */
export interface SharedChildPagePayload {
  shareId: string;
  childPageId: string;
  encryptedContent: string;
  encryptedTitle: string;
  encryptedIcon: string;
  sortOrder: number;
  contentHash: string;
}

// ─── Owner-Gated Access Control & Fingerprinting ────────────────────────────

/** Raw browser signals used to compute high-entropy device fingerprint */
export interface DeviceSignals {
  canvasHash: string;
  webglRenderer: string;
  webglVendor: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  language: string;
  touchSupport: boolean;
  cookieEnabled: boolean;
  doNotTrack: string | null;
}

/** Composite device fingerprint combining hardware signals with persistent token */
export interface DeviceFingerprint {
  /** SHA-256 hash of combined hardware signals */
  fingerprintHash: string;
  /** Persistent random UUID stored in visitor's localStorage to track device across updates */
  persistentToken: string;
  /** Human-readable device label shown to the owner (e.g. "Chrome 126 · Linux · 8 cores") */
  displayLabel: string;
  /** Raw signal components for audit inspection */
  signals: DeviceSignals;
}

/** Access request initiated by visitor and processed by owner via Firestore */
export interface ShareAccessRequest {
  id: string;
  shareId: string;
  deviceFingerprint: DeviceFingerprint;
  /** Truncated/salted IP hash for owner pattern inspection */
  ipHash: string;
  /** Request resolution status */
  status: 'pending' | 'approved' | 'denied' | 'expired';
  requestedAt: string;
  resolvedAt: string | null;
  expiresAt: string;
  /** Whether the visitor entered the correct password */
  passwordVerified: boolean;
  /**
   * Encrypted share key wrapped using AES-KW with shared secret derived
   * via ECDH P-256 between visitor and owner ephemeral keys.
   */
  encryptedShareKey: string | null;
  /** Visitor's ephemeral ECDH public key (JWK format) */
  visitorPublicKey: string;
  /** Owner's ephemeral ECDH public key (JWK format) populated upon approval */
  ownerPublicKey?: string | null;
}

/** Trusted device entry allowing bypass of the owner approval gate */
export interface ShareTrustedDevice {
  id: string;
  shareId: string;
  fingerprintHash: string;
  persistentToken: string;
  displayLabel: string;
  signals: DeviceSignals;
  trustedAt: string;
  lastAccessAt: string;
  accessCount: number;
  /** Share key wrapped with device-specific derived key */
  encryptedShareKey: string;
  isRevoked: boolean;
  revokedAt: string | null;
}

/** Audit trail log record */
export interface ShareAccessLog {
  id: string;
  shareId: string;
  accessedAt: string;
  ipHash: string;
  ipCountry?: string;
  userAgent: string;
  deviceFingerprintHash: string;
  action:
    | 'view'
    | 'unlock'
    | 'edit'
    | 'failed-password'
    | 'pending-approval'
    | 'approved'
    | 'denied'
    | 'trusted-device-access'
    | 'device-revoked';
  metadata?: Record<string, string>;
}

/** Media blob reference */
export interface SharedMediaRef {
  shareId: string;
  mediaId: string;
  storagePath: string;
  mimeType: string;
  size: number;
  encryptedWithShareKey: boolean;
}

// ─── Personas & Live Collaboration ──────────────────────────────────────────

/** Witty, non-cliché English animal pun persona assigned to a visitor device */
export interface VisitorPersona {
  /** Unique animal pun moniker, e.g. "SyntaxLynx", "AlgoRhythmOtter" */
  name: string;
  /** Primary animal category, e.g. "Lynx", "Otter" */
  animal: string;
  /** Harmonic hex color code, e.g. "#10b981" */
  color: string;
  /** Witty catchphrase or motto */
  tagline: string;
}

/** Live cursor & presence state for Yjs awareness */
export interface SharePresenceState {
  deviceId: string;
  persona: VisitorPersona;
  cursor: {
    anchor: number;
    head: number;
  } | null;
  lastActive: number;
}

/** Encrypted Yjs delta update broadcast across collaborators */
export interface ShareCollabDelta {
  id: string;
  shareId: string;
  authorDeviceId: string;
  /** AES-256-GCM encrypted Base64 string of the Yjs Uint8Array update */
  encryptedUpdate: string;
  timestamp: number;
}

// ─── UI Request Contracts ───────────────────────────────────────────────────

/** Payload from UI to create a share */
export interface CreateShareRequest {
  pageId: string;
  scope: 'single' | 'with-children';
  includeMedia: boolean;
  password: string | null;
  requireOwnerApproval: boolean;
  permission: 'read-only' | 'editable';
  expiresAt: string | null;
  maxViews: number | null;
}

/** Payload to update an existing share */
export interface UpdateShareRequest {
  shareId: string;
  password?: string | null;
  requireOwnerApproval?: boolean;
  permission?: 'read-only' | 'editable';
  isActive?: boolean;
  expiresAt?: string | null;
  maxViews?: number | null;
}
