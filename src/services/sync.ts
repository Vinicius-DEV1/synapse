import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { encryptText, decryptText } from './crypto';
import type { Page } from '../types';

const COLLECTION_PAGES = 'pages';

/**
 * Sincroniza (salva/atualiza) uma página no Firebase, criptografando os dados.
 */
export async function pushPageToCloud(page: Page, masterKey: CryptoKey): Promise<void> {
  // Convertemos a página inteira (exceto IDs e metadados básicos) em uma string JSON
  // para ser criptografada como um único bloco, protegendo toda a estrutura.
  const payloadToEncrypt = JSON.stringify({
    title: page.title,
    content: page.content,
    icon: page.icon,
    sort_order: page.sort_order,
    parent_id: page.parent_id
  });

  const encryptedData = await encryptText(payloadToEncrypt, masterKey);

  const docRef = doc(db, COLLECTION_PAGES, page.id);
  await setDoc(docRef, {
    encryptedData, // Todo o conteúdo protegido
    updatedAt: page.updated_at,
    createdAt: page.created_at,
    // Não enviamos os campos sensíveis puros para o Firebase
  });
}

/**
 * Remove uma página do Firebase.
 */
export async function deletePageFromCloud(pageId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_PAGES, pageId);
  await deleteDoc(docRef);
}

/**
 * Puxa todas as páginas do Firebase e as descriptografa.
 */
export async function pullPagesFromCloud(masterKey: CryptoKey): Promise<Page[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTION_PAGES));
  const pages: Page[] = [];

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.encryptedData) {
      try {
        const decryptedJson = await decryptText(data.encryptedData, masterKey);
        const parsed = JSON.parse(decryptedJson);
        
        pages.push({
          id: docSnap.id,
          parent_id: parsed.parent_id,
          title: parsed.title,
          content: parsed.content,
          icon: parsed.icon,
          sort_order: parsed.sort_order,
          created_at: data.createdAt,
          updated_at: data.updatedAt,
        });
      } catch (err) {
        console.error(`Falha ao descriptografar página ${docSnap.id}`, err);
      }
    }
  }

  return pages;
}
