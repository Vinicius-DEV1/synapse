const CACHE_NAME = 'video-stream-cache-v1';

let masterKeys = {};
let accessToken = '';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_KEYS') {
    masterKeys = event.data.keys || {};
    accessToken = event.data.token || '';
  }
});

const MAGIC_BYTES = [0x45, 0x4E, 0x43, 0x31]; // "ENC1"
const CLEAR_CHUNK_SIZE = 1024 * 1024; // 1MB
const ENC_CHUNK_EXTRA = 12 + 16; // IV + Auth Tag
const ENC_CHUNK_SIZE = CLEAR_CHUNK_SIZE + ENC_CHUNK_EXTRA;
const HEADER_SIZE = 16;

/**
 * Converte a masterKey exportada (do cliente) para um CryptoKey usável aqui.
 */
async function importKey(keyData) {
  return await crypto.subtle.importKey(
    "raw",
    new Uint8Array(keyData),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

/**
 * Lê o header do arquivo para saber o tamanho original.
 */
async function getOriginalSize(fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  const headers = new Headers();
  headers.append('Authorization', `Bearer ${accessToken}`);
  headers.append('Range', `bytes=0-15`);
  
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Falha ao ler header do Drive");
  
  const buffer = await res.arrayBuffer();
  const view = new DataView(buffer);
  
  for (let i = 0; i < 4; i++) {
    if (view.getUint8(i) !== MAGIC_BYTES[i]) {
      throw new Error("Arquivo não está no formato ENC1");
    }
  }
  
  const originalSize = Number(view.getBigUint64(4, true));
  return originalSize;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/stream-video/')) {
    event.respondWith(handleVideoStream(event.request, url));
  }
});

async function handleVideoStream(request, url) {
  try {
    const parts = url.pathname.split('/');
    const fileId = parts[2];
    
    // "culture" is default hardcoded for now
    let moduleKey = masterKeys['culture']; 
    if (!moduleKey) {
      return new Response("Key not found", { status: 401 });
    }
    
    // Se a chave vier via postMessage como CryptoKey, usamos direto.
    // Senão, importamos de raw bytes.
    let cryptoKey = moduleKey;
    if (!cryptoKey.type) {
      cryptoKey = await importKey(moduleKey);
    }
    
    const originalSize = await getOriginalSize(fileId);
    
    const rangeHeader = request.headers.get('Range');
    let start = 0;
    let end = originalSize - 1;
    
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = parseInt(match[2], 10);
        }
      }
    }
    
    if (start >= originalSize) {
      return new Response("", {
        status: 416,
        headers: { 'Content-Range': `bytes */${originalSize}` }
      });
    }
    
    if (end >= originalSize) {
      end = originalSize - 1;
    }
    
    // Calculate which chunks we need
    const startChunk = Math.floor(start / CLEAR_CHUNK_SIZE);
    const endChunk = Math.floor(end / CLEAR_CHUNK_SIZE);
    
    let decryptedData = new Uint8Array(end - start + 1);
    let outputOffset = 0;
    
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    for (let i = startChunk; i <= endChunk; i++) {
      let isLastChunk = false;
      let clearChunkSize = CLEAR_CHUNK_SIZE;
      
      if (i === Math.floor(originalSize / CLEAR_CHUNK_SIZE)) {
        clearChunkSize = originalSize % CLEAR_CHUNK_SIZE;
        isLastChunk = true;
        if (clearChunkSize === 0) break; // Exact multiple of 1MB, last chunk is empty
      }
      
      const encChunkSize = clearChunkSize + ENC_CHUNK_EXTRA;
      const fileOffsetStart = HEADER_SIZE + (i * ENC_CHUNK_SIZE);
      const fileOffsetEnd = fileOffsetStart + encChunkSize - 1;
      
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${accessToken}`);
      headers.append('Range', `bytes=${fileOffsetStart}-${fileOffsetEnd}`);
      
      const res = await fetch(driveUrl, { headers });
      if (!res.ok) throw new Error("Falha ao baixar chunk do Drive");
      
      const encBuffer = await res.arrayBuffer();
      const encArray = new Uint8Array(encBuffer);
      
      if (encArray.length < 12) throw new Error("Chunk corrompido (sem IV)");
      
      const iv = encArray.slice(0, 12);
      const ciphertext = encArray.slice(12);
      
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        ciphertext
      );
      
      const decryptedChunk = new Uint8Array(decryptedBuffer);
      
      const chunkStartGlobal = i * CLEAR_CHUNK_SIZE;
      let copyStart = 0;
      let copyEnd = decryptedChunk.length;
      
      if (start > chunkStartGlobal) {
        copyStart = start - chunkStartGlobal;
      }
      if (end < chunkStartGlobal + decryptedChunk.length - 1) {
        copyEnd = end - chunkStartGlobal + 1;
      }
      
      const neededSlice = decryptedChunk.slice(copyStart, copyEnd);
      decryptedData.set(neededSlice, outputOffset);
      outputOffset += neededSlice.length;
    }
    
    return new Response(decryptedData, {
      status: 206,
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${originalSize}`,
        'Content-Length': decryptedData.length.toString(),
      }
    });
    
  } catch (err) {
    console.error("Erro no Service Worker de vídeo:", err);
    return new Response(err.message, { status: 500 });
  }
}
