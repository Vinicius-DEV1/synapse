# Arquitetura de Streaming de Vídeo Criptografado

Este documento descreve como o sistema de vídeos criptografados do **Caderno** funciona. O fluxo é desenhado para suportar arquivos gigantescos (múltiplos gigabytes) tanto em modo local no Desktop (Tauri) quanto de forma totalmente nativa na versão Web PWA, mantendo sempre o vídeo criptografado em repouso e sem estourar a memória RAM.

> **ATENÇÃO PARA OUTRAS IAs / AGENTES:** 
> Se você modificar a lógica do Service Worker (`sw.js`), do streaming Rust (`cmd_stream.rs`) ou do gerador de URL (`video-manager.ts`), **VOCÊ DEVE ATUALIZAR ESTE ARQUIVO** com as novas regras e estruturas!

---

## 1. O Formato ENC1

Os vídeos do sistema não são MP4 puros, eles são criptografados no formato proprietário **ENC1**.
- **Header:** Os primeiros 16 bytes do arquivo contêm a assinatura "ENC1", o tamanho original do arquivo (8 bytes) e o tamanho dos blocos de criptografia (4 bytes).
- **Conteúdo:** O resto do arquivo é dividido em chunks. Cada chunk possui 12 bytes de IV (Nonce) e o resto do conteúdo criptografado via `AES-256-GCM` com a tag de autenticação embutida (mais 16 bytes overhead por chunk).
- **Vantagem:** Podemos pular (seek) para qualquer byte exato do vídeo sem ter que descriptografar o vídeo inteiro, basta calcular em qual bloco ele cai.

---

## 2. A Lógica de Descriptografia Assíncrona ("O Cano de Água")

O maior desafio deste sistema é servir vídeos para a tag `<video>` do HTML5 através de requests HTTP `Range: bytes=X-Y` sem jogar o vídeo inteiro na memória RAM. Para solucionar isso:

Tanto o Backend Rust (Tauri) quanto o Service Worker (Web) usam streams assíncronos (`ReadableStream` no Web, e `async_stream` + `Body::from_stream` no Axum do Rust).

O fluxo funciona da seguinte maneira:
1. O HTML5 envia um request com o cabeçalho `Range: bytes=X-Y`.
2. O servidor (ou Service Worker) descobre quais *chunks* de criptografia precisam ser decodificados para atender a esse range.
3. Inicia-se um laço (`while` ou `for`) pegando pequenos pedaços (geralmente 1MB a 2MB por vez).
4. O pedaço é buscado do disco local ou da nuvem, descriptografado, injetado no *Stream* de resposta, e imediatamente descartado da memória RAM.
5. Isso previne bugs graves no WebKitGTK (Linux/Mac) onde truncar o request faria o motor do navegador pensar que o vídeo "terminou". O Stream garante ao HTML5 a entrega integral do Range.

---

## 3. Streaming no Desktop (Tauri) - Windows, Mac e Linux

No desktop, toda a inteligência fica isolada em Rust por questões de performance nativa.

- **Arquivo Responsável:** `src-tauri/src/cmd_stream.rs` e `src-tauri/src/crypto_stream.rs`.
- **Rota Atendida:** O app abre uma porta interna aleatória com o `axum` (ex: `http://127.0.0.1:37773/stream?file=...`).
- **Comportamento:** O `video-manager.ts` do frontend resolve a URL do vídeo usando esse IP do `axum`. Quando você dá o "play", o frontend acessa essa rota HTTP local. O Rust então lida diretamente com o Hard Drive, descriptografa com o `crypto_stream` pedaço por pedaço e cospe os `Bytes` no `Body::from_stream` do Axum.

---

## 4. Streaming na Versão Web PWA (Sem Tauri)

Se o aplicativo está rodando em um navegador comum, não existe o servidor `axum` interno. Toda a mágica acontece do lado do cliente no navegador.

- **Arquivo Responsável:** `public/sw.js` (Service Worker).
- **Rota Atendida:** O `video-manager.ts` joga a URL do `<video src="...">` como algo tipo `/stream-video/ID_DO_ARQUIVO_NO_DRIVE`.
- **Comportamento:** O navegador dispara a requisição. O **Service Worker** intercepta. Ele vai no Google Drive usando a API, pede um Range em bytes, recebe o bloco criptografado, usa a `Web Crypto API` (`crypto.subtle.decrypt`) para descriptografar na hora, e joga o resultado para a tag de vídeo usando a API nativa `ReadableStream`.
- Tudo isso acontece por trás dos panos; o HTML5 jura que está baixando um MP4 comum direto da nuvem.

---

## 5. Dicas para Bugs de Carregamento (Loading)

Ao mexer em `VideoPlayer.tsx`, lembre-se:
1. **WebKitGTK (Tauri Linux):** Ele é notoriamente agressivo com cache e "stuck loading". Se você tiver um spinner de "buffering" escutando `onWaiting`, e o vídeo der "seek", o WebKit frequentemente "esquece" de disparar `onPlaying`. Por isso, sempre limpe o state de loading nos eventos `onSeeked` ou `onTimeUpdate` se o tempo do vídeo estiver fluindo de verdade.
2. Não tente carregar legendas via Blob em modo Blob se você pode passar por `URL.createObjectURL()`. Mas preferencialmente o app usa conversão in-memory e injeta direto via Track API para melhor controle.
