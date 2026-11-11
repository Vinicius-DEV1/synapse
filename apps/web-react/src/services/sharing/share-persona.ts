/**
 * @file share-persona.ts
 * @description Deterministic animal pun persona generator for Caderno's collaborative page sharing.
 * Assigns short, witty, non-cliché English animal puns paired with fixed harmonic colors.
 * Identical across page refreshes for that specific device.
 */

import type { VisitorPersona } from '../../types/sharing';

interface PunDefinition {
  name: string;
  animal: string;
  tagline: string;
}

/** Curated collection of high-IQ, creative English animal puns with tech/logic wit */
const CLEVER_ANIMAL_PUNS: readonly PunDefinition[] = [
  { name: 'SyntaxLynx', animal: 'Lynx', tagline: 'Linting reality' },
  { name: 'AlgoRhythmOtter', animal: 'Otter', tagline: 'Dancing in O(1)' },
  { name: 'CacheCow', animal: 'Cow', tagline: 'Always hit, never miss' },
  { name: 'ByteBadger', animal: 'Badger', tagline: 'Tenacious at 64-bit' },
  { name: 'CtrlAltDolphin', animal: 'Dolphin', tagline: 'Rebooting the pod' },
  { name: 'QuantumQuokka', animal: 'Quokka', tagline: 'Smiling in superposition' },
  { name: 'BufferBeaver', animal: 'Beaver', tagline: 'Building stream dams' },
  { name: 'PolyMorphicPug', animal: 'Pug', tagline: 'Overriding fetch()' },
  { name: 'HashHawk', animal: 'Hawk', tagline: 'Spotting collisions' },
  { name: 'BooleanBear', animal: 'Bear', tagline: 'Strictly true or false' },
  { name: 'LlamaLogic', animal: 'Llama', tagline: 'Deductive wool power' },
  { name: 'PixelPenguin', animal: 'Penguin', tagline: 'Anti-aliased on ice' },
  { name: 'CipherCheetah', animal: 'Cheetah', tagline: 'Zero-latency sprint' },
  { name: 'StackPlatypus', animal: 'Platypus', tagline: 'Nature’s union type' },
  { name: 'ForkFalcon', animal: 'Falcon', tagline: 'Branching at high speed' },
  { name: 'AsyncAlpaca', animal: 'Alpaca', tagline: 'Always resolving promises' },
  { name: 'KernelKoala', animal: 'Koala', tagline: 'Root-level eucalyptus' },
  { name: 'GitGiraffe', animal: 'Giraffe', tagline: 'High-level rebase' },
  { name: 'RecursionRaven', animal: 'Raven', tagline: 'Nevermore... base case' },
  { name: 'VectorViper', animal: 'Viper', tagline: 'Magnitude and direction' },
  { name: 'DeBugDingo', animal: 'Dingo', tagline: 'Tracking exceptions' },
  { name: 'TernaryToucan', animal: 'Toucan', tagline: 'Condition ? Beak : Flight' },
  { name: 'MonadMoose', animal: 'Moose', tagline: 'Flat-mapping forests' },
  { name: 'SocketSloth', animal: 'Sloth', tagline: 'Persistent low idle' },
  { name: 'MutexMeerkat', animal: 'Meerkat', tagline: 'One sentinel at a time' },
  { name: 'PacketParrot', animal: 'Parrot', tagline: 'Echoing with ACK' },
  { name: 'ChrootChameleon', animal: 'Chameleon', tagline: 'Blends into any namespace' },
  { name: 'BTreeBison', animal: 'Bison', tagline: 'Balanced across plains' },
];

/** Curated vibrant, harmonic colors designed for dark-mode canvas */
const HARMONIC_PALETTE: readonly string[] = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#14b8a6', // Teal
  '#38bdf8', // Sky
];

const PERSONA_STORAGE_KEY = 'caderno_share_visitor_persona';

/**
 * Derives a 32-bit integer seed from a combined string (fingerprint + token).
 */
function deriveIntegerSeed(str: string): number {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash);
}

/**
 * Deterministically generates or loads the animal pun persona for a visitor device.
 * Stores the result in localStorage so the persona never changes for this browser.
 */
export function getOrGeneratePersona(
  fingerprintHash: string,
  persistentToken: string
): VisitorPersona {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(PERSONA_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as VisitorPersona;
        if (parsed?.name && parsed?.color && parsed?.animal) {
          return parsed;
        }
      }
    } catch {
      // Fallback to calculation if localStorage fails
    }
  }

  const seed = deriveIntegerSeed(`${fingerprintHash}:${persistentToken}`);
  const punIndex = seed % CLEVER_ANIMAL_PUNS.length;
  const colorIndex = Math.floor(seed / CLEVER_ANIMAL_PUNS.length) % HARMONIC_PALETTE.length;

  const pun = CLEVER_ANIMAL_PUNS[punIndex];
  const color = HARMONIC_PALETTE[colorIndex];

  const persona: VisitorPersona = {
    name: pun.name,
    animal: pun.animal,
    color,
    tagline: pun.tagline,
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(persona));
    } catch {
      // Ignore localStorage quota errors
    }
  }

  return persona;
}
