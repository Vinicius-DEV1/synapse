// Diagnóstico detalhado: verifica estrutura dos docs do Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "fourth-cirrus-468923-h7.firebaseapp.com",
  projectId: "fourth-cirrus-468923-h7",
  storageBucket: "fourth-cirrus-468923-h7.firebasestorage.app",
  messagingSenderId: "380707248992",
  appId: "1:380707248992:web:4b53a35c0983459fd85c05"
};

const SYNC_TABLES = ['pages', 'transactions', 'wishlist', 'library_books', 'library_highlights', 'library_bookmarks', 'library_collections'];

async function inspect() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const table of SYNC_TABLES) {
    try {
      const snap = await getDocs(collection(db, table));
      const docs = snap.docs.map(d => d.data());
      
      const withEncrypted = docs.filter(d => d.encryptedData);
      const withoutEncrypted = docs.filter(d => !d.encryptedData);
      const withUpdatedAt = docs.filter(d => d.updatedAt);

      console.log(`\n📦 TABELA: ${table} (${docs.length} docs)`);
      console.log(`  ✅ COM encryptedData: ${withEncrypted.length}`);
      console.log(`  ❌ SEM encryptedData: ${withoutEncrypted.length} ← ESTES SÃO IGNORADOS NO PULL`);
      console.log(`  🕐 COM updatedAt: ${withUpdatedAt.length}`);

      if (docs.length > 0) {
        const sample = docs[0];
        const keys = Object.keys(sample);
        console.log(`  🔑 Campos do 1º doc: [${keys.join(', ')}]`);
        if (sample.updatedAt) {
          console.log(`  🕐 updatedAt mais recente: ${docs.sort((a,b) => new Date(b.updatedAt||0) - new Date(a.updatedAt||0))[0].updatedAt}`);
        }
      }
    } catch (err) {
      console.log(`\n❌ TABELA: ${table} → ${err.message}`);
    }
  }

  console.log('\n🏁 Inspeção concluída.');
  process.exit(0);
}

inspect().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
