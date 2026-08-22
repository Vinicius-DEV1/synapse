/**
 * page-broadcast.ts
 *
 * Sincronização entre abas do browser via BroadcastChannel.
 *
 * Quando uma aba salva uma página no IndexedDB, ela notifica todas as outras
 * abas abertas com o mesmo origin. As abas que têm essa página aberta aplicam
 * o CRDT recebido ao seu YDoc local, evitando que o conteúdo stale sobrescreva
 * edições feitas em outra aba — o bug de perda de dados reportado.
 *
 * A API BroadcastChannel é suportada em todos os browsers modernos e não
 * requer configuração adicional. Mensagens NÃO chegam à aba emissora.
 */

export interface PageSavedMessage {
  type: 'PAGE_SAVED';
  pageId: string;
  crdtState: string | null;
  html: string;
  timestamp: number;
  senderInstanceId?: string;
}

type PageSavedCallback = (msg: PageSavedMessage) => void;

const CHANNEL_NAME = 'caderno-pages';

let channel: BroadcastChannel | null = null;
const listeners = new Set<PageSavedCallback>();

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<PageSavedMessage>) => {
      if (event.data?.type === 'PAGE_SAVED') {
        listeners.forEach((cb) => {
          try {
            cb(event.data);
          } catch (err) {
            console.error('[Caderno:Broadcast] Erro no listener do canal:', err);
          }
        });
      }
    };
  }
  return channel;
}

/**
 * Notifica outras abas abertas que uma página foi salva.
 * Notifica tanto abas remotas (via BroadcastChannel) quanto abas/componentes locais
 * na mesma janela (já que o BroadcastChannel padrão ignora a própria janela emissora).
 */
export function broadcastPageSaved(
  pageId: string,
  crdtState: string | null,
  html: string,
  senderInstanceId?: string
): void {
  const msg: PageSavedMessage = {
    type: 'PAGE_SAVED',
    pageId,
    crdtState,
    html,
    timestamp: Date.now(),
    senderInstanceId,
  };

  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(msg);
    } catch (err) {
      console.warn('[Caderno:Broadcast] Falha ao enviar mensagem de broadcast:', err);
    }
  }

  // Notifica também os listeners na mesma janela (para sincronização entre abas internas do app)
  listeners.forEach((cb) => {
    try {
      cb(msg);
    } catch (err) {
      console.error('[Caderno:Broadcast] Erro ao disparar listener local:', err);
    }
  });
}

/**
 * Registra um callback que será chamado sempre que outra aba salvar uma página.
 * Retorna uma função para cancelar o registro (use em useEffect cleanup).
 */
export function onPageSaved(callback: PageSavedCallback): () => void {
  getChannel(); // garante que o canal está inicializado
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
