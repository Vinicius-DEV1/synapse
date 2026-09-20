import { decryptText } from '../crypto';

export interface CloudData {
  encryptedData?: string;
  isCompressed?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

export interface FirestoreDocLike {
  id: string;
  data: () => Record<string, unknown> | undefined;
  ref?: unknown;
}

export interface DecryptedResult {
  docSnap: FirestoreDocLike;
  cloudData: CloudData;
  parsed: Record<string, unknown> | null;
  isLegacy: boolean;
  error: unknown;
}

export async function decryptCloudDoc(
  docSnap: FirestoreDocLike,
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>
): Promise<DecryptedResult> {
  const rawData = docSnap.data();
  const cloudData: CloudData = (rawData as CloudData) || {};
  try {
    let decryptedJsonOrB64: string;
    let isLegacy = false;
    try {
      if (!cloudData.encryptedData) {
        throw new Error('Missing encryptedData');
      }
      decryptedJsonOrB64 = await decryptText(cloudData.encryptedData, key);
    } catch (e) {
      if (key !== moduleKeys['core'] && moduleKeys['core'] && cloudData.encryptedData) {
        try {
          decryptedJsonOrB64 = await decryptText(cloudData.encryptedData, moduleKeys['core']);
          isLegacy = true; // Decrypt success with core key instead of module key
        } catch {
          throw e;
        }
      } else {
        throw e;
      }
    }

    let finalJson = decryptedJsonOrB64;

    if (cloudData.isCompressed) {
      try {
        const binary_string = atob(decryptedJsonOrB64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binary_string.charCodeAt(j);
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        finalJson = await new Response(stream).text();
      } catch (decErr) {
        console.error('Erro ao descomprimir doc', decErr);
        throw decErr;
      }
    }

    const parsed = JSON.parse(finalJson) as Record<string, unknown>;
    return { docSnap, cloudData, parsed, isLegacy, error: null };
  } catch (err: unknown) {
    return { docSnap, cloudData, parsed: null, isLegacy: false, error: err };
  }
}

export async function decryptCloudBatch(
  batch: FirestoreDocLike[],
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>
): Promise<DecryptedResult[]> {
  return Promise.all(batch.map((docSnap) => decryptCloudDoc(docSnap, key, moduleKeys)));
}
