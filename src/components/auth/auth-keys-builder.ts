import { importHexKey } from '../../services/crypto';

export async function buildModuleKeys(
  rawKeys: Record<string, string> | null | undefined,
  masterKey: CryptoKey
): Promise<Record<string, CryptoKey>> {
  const keys: Record<string, CryptoKey> = {};
  const modules = [
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
  ];

  for (const mod of modules) {
    if (rawKeys && rawKeys[mod]) {
      keys[mod] = await importHexKey(rawKeys[mod]);
    } else {
      keys[mod] = masterKey;
    }
  }
  return keys;
}
