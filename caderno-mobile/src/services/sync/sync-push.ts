import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { encryptText } from '../crypto';
import { SYNC_CONFIG } from './config';

export async function pushRowToCloud(
  table: string,
  row: any,
  key: string
): Promise<boolean> {
  if (!SYNC_CONFIG.SYNC_PUSH_ENABLED) {
    // Push is currently disabled to protect Firebase state
    return false;
  }

  try {
    const { id, updated_at, created_at, ...sensitiveData } = row;
    const jsonString = JSON.stringify(sensitiveData);
    const encryptedData = await encryptText(jsonString, key);

    await setDoc(doc(db, table, id), {
      encryptedData,
      updatedAt: updated_at || new Date().toISOString(),
      createdAt: created_at || new Date().toISOString(),
    }, { merge: true });

    return true;
  } catch (err) {
    console.error(`[Sync PUSH] Erro ao enviar doc ${row.id} para ${table}:`, err);
    return false;
  }
}
