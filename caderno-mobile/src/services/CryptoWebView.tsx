import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * CryptoWebView — WebView ultra-otimizado que executa criptografia e CRDT nativo.
 * 
 * - Motor Criptográfico: C++ BoringSSL + V8 Fallback
 * - Motor CRDT: Parser de estado Yjs ProseMirror no ambiente browser DOM
 * - Comunicação 100% segura via Base64 IPC.
 */

import { YJS_SOURCE } from './yjsSource';

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
};

let pendingRequests: Record<string, PendingRequest> = {};
let webViewRef: any = null;
let isReady = false;
let readyCallbacks: Array<() => void> = [];

const CRYPTO_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>${YJS_SOURCE}</script>
<script>
// ================================================================
// PURE JS PBKDF2-HMAC-SHA256 (V8 JIT Engine)
// ================================================================
const K256 = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
]);

function sha256(data) {
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = ((msgLen + 8) >> 6 << 6) + 64;
  const msg = new Uint8Array(padLen);
  msg.set(data);
  msg[msgLen] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(padLen - 4, bitLen, false);

  let h0=0x6a09e667, h1=0xbb67ae85, h2=0x3c6ef372, h3=0xa54ff53a;
  let h4=0x510e527f, h5=0x9b05688c, h6=0x1f83d9ab, h7=0x5be0cd19;
  const w = new Uint32Array(64);

  for (let off = 0; off < padLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = (w[i-15]>>>7 | w[i-15]<<25) ^ (w[i-15]>>>18 | w[i-15]<<14) ^ (w[i-15]>>>3);
      const s1 = (w[i-2]>>>17 | w[i-2]<<15) ^ (w[i-2]>>>19 | w[i-2]<<13) ^ (w[i-2]>>>10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let i = 0; i < 64; i++) {
      const S1 = (e>>>6|e<<26)^(e>>>11|e<<21)^(e>>>25|e<<7);
      const ch = (e&f)^(~e&g);
      const t1 = (h + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = (a>>>2|a<<30)^(a>>>13|a<<19)^(a>>>22|a<<10);
      const maj = (a&b)^(a&c)^(b&c);
      const t2 = (S0 + maj) | 0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0;
    h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  ov.setUint32(0,h0,false); ov.setUint32(4,h1,false);
  ov.setUint32(8,h2,false); ov.setUint32(12,h3,false);
  ov.setUint32(16,h4,false); ov.setUint32(20,h5,false);
  ov.setUint32(24,h6,false); ov.setUint32(28,h7,false);
  return out;
}

function hmacSha256(key, message) {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) k = sha256(k);
  const padded = new Uint8Array(blockSize);
  padded.set(k);
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = padded[i] ^ 0x36;
    opad[i] = padded[i] ^ 0x5c;
  }
  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad); inner.set(message, blockSize);
  const innerHash = sha256(inner);
  const outer = new Uint8Array(blockSize + 32);
  outer.set(opad); outer.set(innerHash, blockSize);
  return sha256(outer);
}

function pbkdf2Sha256(password, salt, iterations, dkLen) {
  const hLen = 32;
  const numBlocks = Math.ceil(dkLen / hLen);
  const dk = new Uint8Array(dkLen);
  for (let block = 1; block <= numBlocks; block++) {
    const blockBuf = new Uint8Array(salt.length + 4);
    blockBuf.set(salt);
    blockBuf[salt.length] = (block >>> 24) & 0xff;
    blockBuf[salt.length+1] = (block >>> 16) & 0xff;
    blockBuf[salt.length+2] = (block >>> 8) & 0xff;
    blockBuf[salt.length+3] = block & 0xff;
    let u = hmacSha256(password, blockBuf);
    const result = new Uint8Array(u);
    for (let i = 1; i < iterations; i++) {
      u = hmacSha256(password, u);
      for (let j = 0; j < hLen; j++) result[j] ^= u[j];
    }
    const offset = (block - 1) * hLen;
    dk.set(result.subarray(0, Math.min(hLen, dkLen - offset)), offset);
  }
  return dk;
}

// ================================================================
// AES-GCM PURE JS ENGINE
// ================================================================
const SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
]);

function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function aesKeyExpansion256(key) {
  const Nk = 8, Nr = 14;
  const W = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    W[i] = (key[4*i]<<24) | (key[4*i+1]<<16) | (key[4*i+2]<<8) | key[4*i+3];
  }
  const rcon = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
  let rci = 0;
  for (let i = Nk; i < 4*(Nr+1); i++) {
    let t = W[i-1];
    if (i % Nk === 0) {
      t = ((t << 8) | (t >>> 24)) >>> 0;
      t = (SBOX[(t>>>24)&0xff]<<24) | (SBOX[(t>>>16)&0xff]<<16) | (SBOX[(t>>>8)&0xff]<<8) | SBOX[t&0xff];
      t = (t ^ (rcon[rci++] << 24)) >>> 0;
    } else if (i % Nk === 4) {
      t = (SBOX[(t>>>24)&0xff]<<24) | (SBOX[(t>>>16)&0xff]<<16) | (SBOX[(t>>>8)&0xff]<<8) | SBOX[t&0xff];
    }
    W[i] = (W[i-Nk] ^ t) >>> 0;
  }
  return { W, Nr };
}

function aesEncryptBlock(block, W, Nr) {
  const s = new Uint8Array(16);
  for (let i = 0; i < 16; i++) s[i] = block[i];
  for (let i = 0; i < 4; i++) {
    s[4*i] ^= (W[i]>>>24)&0xff; s[4*i+1] ^= (W[i]>>>16)&0xff;
    s[4*i+2] ^= (W[i]>>>8)&0xff; s[4*i+3] ^= W[i]&0xff;
  }
  for (let r = 1; r <= Nr; r++) {
    for (let i = 0; i < 16; i++) s[i] = SBOX[s[i]];
    let t;
    t=s[1]; s[1]=s[5]; s[5]=s[9]; s[9]=s[13]; s[13]=t;
    t=s[2]; s[2]=s[10]; s[10]=t; t=s[6]; s[6]=s[14]; s[14]=t;
    t=s[15]; s[15]=s[11]; s[11]=s[7]; s[7]=s[3]; s[3]=t;
    if (r < Nr) {
      for (let c = 0; c < 4; c++) {
        const a0=s[4*c],a1=s[4*c+1],a2=s[4*c+2],a3=s[4*c+3];
        s[4*c]=gmul(2,a0)^gmul(3,a1)^a2^a3;
        s[4*c+1]=a0^gmul(2,a1)^gmul(3,a2)^a3;
        s[4*c+2]=a0^a1^gmul(2,a2)^gmul(3,a3);
        s[4*c+3]=gmul(3,a0)^a1^a2^gmul(2,a3);
      }
    }
    for (let i = 0; i < 4; i++) {
      const wi = W[r*4+i];
      s[4*i] ^= (wi>>>24)&0xff; s[4*i+1] ^= (wi>>>16)&0xff;
      s[4*i+2] ^= (wi>>>8)&0xff; s[4*i+3] ^= wi&0xff;
    }
  }
  return s;
}

function ghashMultiply(X, H) {
  const Z = new Uint8Array(16);
  const V = new Uint8Array(H);
  for (let i = 0; i < 128; i++) {
    if ((X[Math.floor(i/8)] >> (7 - i%8)) & 1) {
      for (let j = 0; j < 16; j++) Z[j] ^= V[j];
    }
    const lsb = V[15] & 1;
    for (let j = 15; j > 0; j--) V[j] = (V[j] >> 1) | ((V[j-1] & 1) << 7);
    V[0] >>= 1;
    if (lsb) V[0] ^= 0xe1;
  }
  return Z;
}

function incCounter(counter) {
  const c = new Uint8Array(counter);
  for (let i = 15; i >= 12; i--) {
    c[i]++;
    if (c[i] !== 0) break;
  }
  return c;
}

function aesGcmEncrypt(key, iv, plaintext) {
  const { W, Nr } = aesKeyExpansion256(key);
  const H = aesEncryptBlock(new Uint8Array(16), W, Nr);
  const J0 = new Uint8Array(16);
  J0.set(iv);
  J0[15] = 1;
  
  let counter = new Uint8Array(J0);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i += 16) {
    counter = incCounter(counter);
    const keystream = aesEncryptBlock(counter, W, Nr);
    const blockLen = Math.min(16, plaintext.length - i);
    for (let j = 0; j < blockLen; j++) {
      ciphertext[i + j] = plaintext[i + j] ^ keystream[j];
    }
  }
  
  let tag = new Uint8Array(16);
  for (let i = 0; i < ciphertext.length; i += 16) {
    const block = new Uint8Array(16);
    const bLen = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < bLen; j++) block[j] = ciphertext[i + j];
    for (let j = 0; j < 16; j++) tag[j] ^= block[j];
    tag = ghashMultiply(tag, H);
  }
  
  const lenBlock = new Uint8Array(16);
  const lv = new DataView(lenBlock.buffer);
  lv.setUint32(12, ciphertext.length * 8, false);
  for (let j = 0; j < 16; j++) tag[j] ^= lenBlock[j];
  tag = ghashMultiply(tag, H);
  
  const S = aesEncryptBlock(J0, W, Nr);
  for (let j = 0; j < 16; j++) tag[j] ^= S[j];
  
  const result = new Uint8Array(ciphertext.length + 16);
  result.set(ciphertext);
  result.set(tag, ciphertext.length);
  return result;
}

function aesGcmDecrypt(key, iv, ciphertextWithTag) {
  const { W, Nr } = aesKeyExpansion256(key);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - 16);
  const receivedTag = ciphertextWithTag.subarray(ciphertextWithTag.length - 16);
  const H = aesEncryptBlock(new Uint8Array(16), W, Nr);
  const J0 = new Uint8Array(16);
  J0.set(iv);
  J0[15] = 1;
  
  let tag = new Uint8Array(16);
  for (let i = 0; i < ciphertext.length; i += 16) {
    const block = new Uint8Array(16);
    const bLen = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < bLen; j++) block[j] = ciphertext[i + j];
    for (let j = 0; j < 16; j++) tag[j] ^= block[j];
    tag = ghashMultiply(tag, H);
  }
  const lenBlock = new Uint8Array(16);
  const lv = new DataView(lenBlock.buffer);
  lv.setUint32(12, ciphertext.length * 8, false);
  for (let j = 0; j < 16; j++) tag[j] ^= lenBlock[j];
  tag = ghashMultiply(tag, H);
  const S = aesEncryptBlock(J0, W, Nr);
  for (let j = 0; j < 16; j++) tag[j] ^= S[j];
  
  let valid = true;
  for (let i = 0; i < 16; i++) {
    if (tag[i] !== receivedTag[i]) { valid = false; break; }
  }
  if (!valid) throw new Error('AES-GCM: authentication tag mismatch');
  
  let counter = new Uint8Array(J0);
  const plaintext = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i += 16) {
    counter = incCounter(counter);
    const keystream = aesEncryptBlock(counter, W, Nr);
    const blockLen = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < blockLen; j++) {
      plaintext[i + j] = ciphertext[i + j] ^ keystream[j];
    }
  }
  return plaintext;
}

// ================================================================
// YJS CRDT PARSER FOR PROSEMIRROR XML FRAGMENTS
// ================================================================
function getNodeText(node) {
  // YXmlText leaf — the actual text content lives here
  if (typeof node.toString === 'function' && node.constructor && node.constructor.name === 'YXmlText') {
    return node.toString();
  }
  // YText
  if (typeof Y !== 'undefined' && node instanceof Y.Text) {
    return node.toString();
  }
  // Generic fallback for text-like nodes without children
  if ((!node.toArray || node.toArray().length === 0) && typeof node.toString === 'function') {
    const str = node.toString();
    // Only return if it looks like real text (not Yjs internal repr like "YXmlText#...")
    if (!str.startsWith('Y') && !str.includes('#')) return str;
  }
  return null;
}

function yXmlToMarkdown(node) {
  if (!node) return '';

  // Leaf text node
  const leafText = getNodeText(node);
  if (leafText !== null) return leafText;

  const nodeName = node.nodeName || '';
  const children = node.toArray ? node.toArray() : [];
  let innerText = '';
  for (let i = 0; i < children.length; i++) {
    innerText += yXmlToMarkdown(children[i]);
  }

  switch (nodeName) {
    case 'doc': {
      return innerText;
    }
    case 'heading': {
      const level = node.getAttribute ? (node.getAttribute('level') || 1) : 1;
      const prefix = '#'.repeat(Number(level) || 1);
      return prefix + ' ' + innerText.trim() + '\\n\\n';
    }
    case 'paragraph': {
      return innerText ? innerText + '\\n\\n' : '\\n';
    }
    case 'bulletList':
    case 'bullet_list': {
      return innerText + '\\n';
    }
    case 'orderedList':
    case 'ordered_list': {
      return innerText + '\\n';
    }
    case 'listItem':
    case 'list_item': {
      return '• ' + innerText.trim() + '\\n';
    }
    case 'taskList':
    case 'task_list': {
      return innerText + '\\n';
    }
    case 'taskItem':
    case 'task_item': {
      const checked = node.getAttribute ? (node.getAttribute('checked') === true || node.getAttribute('checked') === 'true') : false;
      return '[' + (checked ? 'x' : ' ') + '] ' + innerText.trim() + '\\n';
    }
    case 'toggleBlock':
    case 'toggle': {
      const title = (node.getAttribute ? node.getAttribute('title') : '') || 'Seção Retrátil';
      return '<details class="caderno-toggle" open><summary>' + title + '</summary><div class="toggle-content">' + innerText.trim() + '</div></details>\\n\\n';
    }
    case 'blockquoteToggle': {
      const title = (node.getAttribute ? node.getAttribute('title') : '') || 'Citação';
      return '<details class="caderno-toggle"><summary>' + title + '</summary><blockquote>' + innerText.trim() + '</blockquote></details>\\n\\n';
    }
    case 'colorBlockquote':
    case 'blockquote': {
      const color = (node.getAttribute ? node.getAttribute('color') : '') || '#8b5cf6';
      return '<blockquote style="border-left-color: ' + color + '; background: ' + color + '15;">' + innerText.trim() + '</blockquote>\\n\\n';
    }
    case 'columnGroup': {
      return '<div class="column-group">' + innerText + '</div>\\n\\n';
    }
    case 'columnBlock': {
      return '<div class="column-block">' + innerText + '</div>';
    }
    case 'pageReference': {
      const pageId = (node.getAttribute ? node.getAttribute('pageId') : '') || '';
      const title = (node.getAttribute ? node.getAttribute('title') : '') || 'Página';
      return '📄 [[' + title + ']]';
    }
    case 'fileWidgetBlock':
    case 'fileWidget': {
      const fileName = (node.getAttribute ? node.getAttribute('fileName') : '') || 'Arquivo Anexo';
      const fileSize = (node.getAttribute ? node.getAttribute('fileSize') : '') || '';
      return '📎 **' + fileName + '** ' + (fileSize ? '(' + fileSize + ')' : '') + '\\n\\n';
    }
    case 'focusWidgetBlock':
    case 'focusWidget': {
      return '⏱️ **Sessão de Foco**\\n\\n';
    }
    case 'alarmWidgetBlock':
    case 'alarmWidget': {
      return '⏰ **Alarme Agendado**\\n\\n';
    }
    case 'calendarEventWidgetBlock':
    case 'calendarEvent': {
      const eventTitle = (node.getAttribute ? node.getAttribute('title') : '') || 'Evento do Calendário';
      return '📅 **' + eventTitle + '**\\n\\n';
    }
    case 'mediaWidgetBlock':
    case 'mediaWidget': {
      const mediaTitle = (node.getAttribute ? node.getAttribute('title') : '') || 'Mídia / Vídeo';
      return '🎥 **' + mediaTitle + '**\\n\\n';
    }
    case 'codeBlock':
    case 'code_block': {
      const lang = (node.getAttribute ? node.getAttribute('language') : '') || '';
      return '\`\`\`' + lang + '\\n' + innerText.trim() + '\\n\`\`\`\\n\\n';
    }
    case 'customDivider':
    case 'horizontalRule':
    case 'horizontal_rule': {
      return '---\\n\\n';
    }
    case 'hardBreak':
    case 'hard_break': {
      return '\\n';
    }
    case 'table': {
      return '<div class="table-wrapper"><table class="caderno-table">' + innerText + '</table></div>\\n\\n';
    }
    case 'tableRow': {
      return '<tr>' + innerText + '</tr>';
    }
    case 'tableHeader': {
      return '<th>' + innerText.trim() + '</th>';
    }
    case 'tableCell': {
      return '<td>' + innerText.trim() + '</td>';
    }
    case 'image':
    case 'encryptedImage':
    case 'resizableImage': {
      const src = (node.getAttribute ? node.getAttribute('src') : '') || '';
      const alt = (node.getAttribute ? node.getAttribute('alt') : '') || '';
      return '![' + (alt || '') + '](' + (src || '') + ')';
    }
    case 'spoiler': {
      return '<span class="caderno-spoiler">' + innerText + '</span>';
    }
    // Inline marks
    case 'bold':
    case 'strong': return '<strong>' + innerText + '</strong>';
    case 'italic':
    case 'em': return '<em>' + innerText + '</em>';
    case 'underline': return '<u>' + innerText + '</u>';
    case 'strike': return '<s>' + innerText + '</s>';
    case 'code': return '<code>' + innerText + '</code>';
    default:
      return innerText;
  }
}

function parseYjsStateToMarkdown(base64State) {
  if (!base64State || base64State.length < 8) return '';
  
  // Require Yjs to be loaded — no binary heuristic fallback (that causes garbage)
  if (typeof Y === 'undefined') {
    return '__YJS_NOT_LOADED__';
  }

  try {
    const binary = atob(base64State);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const doc = new Y.Doc();
    Y.applyUpdate(doc, bytes);
    
    // Try known fragment names first
    const knownNames = ['default', 'prosemirror', 'content', 'document'];
    for (const name of knownNames) {
      try {
        const fragment = doc.getXmlFragment(name);
        if (fragment && fragment.length > 0) {
          const md = yXmlToMarkdown(fragment).trim();
          if (md && md.length > 2) return md;
        }
      } catch(e) {}
    }
    
    // Try all shared types
    for (const [key, type] of doc.share.entries()) {
      try {
        if (typeof Y !== 'undefined' && type instanceof Y.XmlFragment) {
          const md = yXmlToMarkdown(type).trim();
          if (md && md.length > 2) return md;
        } else if (typeof Y !== 'undefined' && type instanceof Y.Text) {
          const text = type.toString().trim();
          if (text && text.length > 2) return text;
        }
      } catch(e) {}
    }
    
    return '';
  } catch (e) {
    console.warn('Yjs parsing error:', e);
    return '';
  }
}


// ================================================================
// MESSAGE HANDLER
// ================================================================
async function executeCrypto(msg) {
  const hasSubtle = (typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.subtle.importKey === 'function');
  
  if (msg.type === 'pbkdf2') {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(msg.password);
    const saltBytes = enc.encode(msg.salt);
    let hexKey = null;

    if (hasSubtle) {
      try {
        const keyMaterial = await crypto.subtle.importKey(
          'raw', passwordBytes, { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const derivedBits = await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: saltBytes, iterations: msg.iterations, hash: 'SHA-256' },
          keyMaterial, 256
        );
        hexKey = Array.from(new Uint8Array(derivedBits))
          .map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {}
    }
    
    if (!hexKey) {
      const dk = pbkdf2Sha256(passwordBytes, saltBytes, msg.iterations, 32);
      hexKey = Array.from(dk).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    return { hexKey };
  }
  
  if (msg.type === 'decrypt') {
    const keyBytes = new Uint8Array(msg.keyHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const combined = Uint8Array.from(atob(msg.cipherBase64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertextWithTag = combined.slice(12);
    let text = null;
    
    if (hasSubtle) {
      try {
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertextWithTag);
        text = new TextDecoder('utf-8').decode(decrypted);
      } catch (e) {}
    }
    
    if (text === null) {
      const plainBytes = aesGcmDecrypt(keyBytes, iv, ciphertextWithTag);
      text = new TextDecoder('utf-8').decode(plainBytes);
    }
    
    return { plaintext: text };
  }
  
  if (msg.type === 'encrypt') {
    const keyBytes = new Uint8Array(msg.keyHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const data = new TextEncoder().encode(msg.plaintext);
    const iv = (typeof crypto !== 'undefined' && crypto.getRandomValues)
      ? crypto.getRandomValues(new Uint8Array(12))
      : new Uint8Array(Array.from({length: 12}, () => Math.floor(Math.random() * 256)));
      
    let combinedResult = null;
    
    if (hasSubtle) {
      try {
        const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
        const ct = new Uint8Array(encrypted);
        combinedResult = new Uint8Array(12 + ct.length);
        combinedResult.set(iv, 0);
        combinedResult.set(ct, 12);
      } catch (e) {}
    }
    
    if (!combinedResult) {
      const ct = aesGcmEncrypt(keyBytes, iv, data);
      combinedResult = new Uint8Array(12 + ct.length);
      combinedResult.set(iv, 0);
      combinedResult.set(ct, 12);
    }
    
    let binary = '';
    for (let i = 0; i < combinedResult.length; i++) binary += String.fromCharCode(combinedResult[i]);
    return { cipherBase64: btoa(binary) };
  }

  if (msg.type === 'extractCrdt') {
    let attempts = 0;
    while (typeof Y === 'undefined' && !window.__yjsFailed && attempts < 25) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    const markdown = parseYjsStateToMarkdown(msg.crdtState);
    return { markdown };
  }
}

window.handleIncomingMessage = async function(jsonStr) {
  let msgId = 'unknown';
  try {
    const msg = JSON.parse(jsonStr);
    msgId = msg.id;
    const result = await executeCrypto(msg);
    window.ReactNativeWebView.postMessage(JSON.stringify({
      id: msgId,
      success: true,
      ...result,
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      id: msgId,
      success: false,
      error: err.message || String(err),
    }));
  }
};

setTimeout(function() {
  const hasSubtle = (typeof crypto !== 'undefined' && !!crypto.subtle && typeof crypto.subtle.importKey === 'function');
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'ready',
    hasSubtle: hasSubtle,
  }));
}, 100);
</script>
</body>
</html>
`;

function generateId(): string {
  return Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

function stringToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function sendToWebView(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!webViewRef) {
      reject(new Error('CryptoWebView not mounted'));
      return;
    }
    const id = generateId();
    message.id = id;
    pendingRequests[id] = { resolve, reject };
    
    const b64 = stringToBase64(JSON.stringify(message));
    webViewRef.injectJavaScript(`
      (function() {
        try {
          var binary = atob("${b64}");
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          var jsonStr = new TextDecoder().decode(bytes);
          window.handleIncomingMessage(jsonStr);
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            id: '${id}',
            success: false,
            error: e.message || String(e),
          }));
        }
      })();
      true;
    `);

    setTimeout(() => {
      if (pendingRequests[id]) {
        delete pendingRequests[id];
        reject(new Error('CryptoWebView timeout (120s)'));
      }
    }, 120000);
  });
}

function handleMessage(event: any) {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    
    if (data.type === 'ready') {
      console.log(`[CRYPTO-WV] ✅ CryptoWebView online! Aceleração hardware: ${data.hasSubtle ? 'C++ BoringSSL' : 'V8 JIT Engine'}`);
      isReady = true;
      readyCallbacks.forEach(cb => cb());
      readyCallbacks = [];
      return;
    }

    const pending = pendingRequests[data.id];
    if (pending) {
      delete pendingRequests[data.id];
      if (data.success) {
        pending.resolve(data);
      } else {
        pending.reject(new Error(data.error || 'CryptoWebView error'));
      }
    }
  } catch (e) {
    console.error('[CRYPTO-WV] Erro ao parsear resposta:', e);
  }
}

export function waitForCryptoReady(): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise((resolve) => {
    readyCallbacks.push(resolve);
    setTimeout(() => resolve(), 3000);
  });
}

export const CryptoWebView: React.FC = () => {
  const ref = useRef<any>(null);

  const onRef = useCallback((r: any) => {
    ref.current = r;
    webViewRef = r;
  }, []);

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        ref={onRef}
        originWhitelist={['*']}
        source={{ html: CRYPTO_HTML, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  webview: {
    width: 1,
    height: 1,
  },
});
