import { importHexKey } from '../../services/crypto';

export const ACCOUNT_MODULES = [
  'library',
  'finance',
  'notes',
  'core',
  'focus',
  'vault',
  'culture',
  'anki',
  'files',
  'calendar',
  'practice',
  'video',
  'diagrams',
  'quiz',
  'habits',
  'notifications',
  'sharing',
] as const;

export async function buildModuleKeys(
  rawKeys: Record<string, string> | null | undefined,
  accountKey: CryptoKey
): Promise<Record<string, CryptoKey>> {
  const keys: Record<string, CryptoKey> = {};

  for (const mod of ACCOUNT_MODULES) {
    if (rawKeys && rawKeys[mod]) {
      keys[mod] = await importHexKey(rawKeys[mod]);
    } else {
      keys[mod] = accountKey;
    }
  }
  return keys;
}
