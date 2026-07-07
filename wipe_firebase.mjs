import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDlyok0x6CSJgVq-rKCsFqIAonxR5ezR_c",
  authDomain: "fourth-cirrus-468923-h7.firebaseapp.com",
  projectId: "fourth-cirrus-468923-h7",
  storageBucket: "fourth-cirrus-468923-h7.firebasestorage.app",
  messagingSenderId: "380707248992",
  appId: "1:380707248992:web:4b53a35c0983459fd85c05"
};

const SYNC_TABLES = [
  'config',
  'pages',
  'transactions',
  'wishlist',
  'library_books',
  'library_highlights',
  'library_bookmarks',
  'library_collections',
  'library_book_collections',
  'library_reading_sessions',
  'items',
  'episodes',
  'videos'
];

async function wipe() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const table of SYNC_TABLES) {
    try {
      const snap = await getDocs(collection(db, table));
      if (snap.docs.length > 0) {
        console.log(`🗑️ Limpando tabela: ${table} (${snap.docs.length} docs)...`);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } else {
        console.log(`✅ Tabela ${table} já está vazia.`);
      }
    } catch (err) {
      console.log(`❌ Erro ao limpar tabela ${table}: ${err.message}`);
    }
  }

  console.log('\n🏁 WIPE concluído. O Firebase está completamente vazio!');
  process.exit(0);
}

wipe().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
