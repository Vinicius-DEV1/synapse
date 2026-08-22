import { decryptText } from '../crypto';

export interface CloudData {
  encryptedData?: string;
  isCompressed?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
}

export interface DecryptedResult {
  docSnap: any;
  cloudData: CloudData;
  parsed: any;
  isLegacy: boolean;
  error: any;
}

export async function decryptCloudDoc(
  docSnap: any,
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>
): Promise<DecryptedResult> {
  const cloudData = docSnap.data() as CloudData;
  try {
    let decryptedJsonOrB64;
    let isLegacy = false;
    try {
      decryptedJsonOrB64 = await decryptText(cloudData.encryptedData!, key);
    } catch (e) {
      if (key !== moduleKeys['core']) {
        try {
          decryptedJsonOrB64 = await decryptText(cloudData.encryptedData!, moduleKeys['core']);
          isLegacy = true; // Decrypt success with core key instead of module key
        } catch (e2) {
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
        console.error(`Erro ao descomprimir doc`, decErr);
        throw decErr;
      }
    }

    const parsed = JSON.parse(finalJson);
    return { docSnap, cloudData, parsed, isLegacy, error: null };
  } catch (err: any) {
    return { docSnap, cloudData, parsed: null, isLegacy: false, error: err };
  }
}

export async function decryptCloudBatch(
  batch: any[],
  key: CryptoKey,
  moduleKeys: Record<string, CryptoKey>
): Promise<DecryptedResult[]> {
  return Promise.all(batch.map((docSnap) => decryptCloudDoc(docSnap, key, moduleKeys)));
}
