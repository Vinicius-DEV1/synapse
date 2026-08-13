import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, Globe, RefreshCw, X, PlayCircle, Clock, PlaySquare, ListVideo, Calendar, GripVertical, Plus, ChevronDown, ChevronUp, StickyNote, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import YouTubePlaylistModal from './YouTubePlaylistModal';
import { Portal } from '../ui/Portal';

const formatDuration = (seconds: number) => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr.length !== 8) return '';
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}/${month}/${year}`;
};

const LinkPreviewComponent = (props: any) => {
  const { url, title, isLoading, channel, duration, isPlaylist, uploadDate, notes: rawNotes, showNotes: rawShowNotes } = props.node.attrs;
  const notes = rawNotes || '';
  const showNotes = !!rawShowNotes;
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [fetchedChannel, setFetchedChannel] = useState<string | null>(channel);
  const [fetchedDuration, setFetchedDuration] = useState<number | null>(duration);
  const [fetchedIsPlaylist, setFetchedIsPlaylist] = useState<boolean>(isPlaylist);
  const [fetchedUploadDate, setFetchedUploadDate] = useState<string | null>(uploadDate);
  const [loading, setLoading] = useState(isLoading);
  const [isReloading, setIsReloading] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showLinkConfirm, setShowLinkConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleNotes = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextShow = !showNotes;
    props.updateAttributes({ showNotes: nextShow });
    if (nextShow) {
      setTimeout(() => {
        notesTextareaRef.current?.focus();
      }, 50);
    }
  };

  // Sincroniza o estado local com os atributos do nó toda vez que ele sofrer atualizações,
  // como acontece no drag and drop do TipTap (reciclagem de nós)
  useEffect(() => {
    setFetchedTitle(title);
    setFetchedChannel(channel);
    setFetchedDuration(duration);
    setFetchedIsPlaylist(isPlaylist);
    setFetchedUploadDate(uploadDate);
    setLoading(isLoading);
  }, [url, title, channel, duration, isPlaylist, uploadDate, isLoading]);

  useEffect(() => {
    const handleDeleteRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.url === url) {
        setShowDeleteConfirm(true);
      }
    };
    window.addEventListener('link-widget-delete-request', handleDeleteRequest);
    return () => window.removeEventListener('link-widget-delete-request', handleDeleteRequest);
  }, [url]);

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  const getVideoId = (videoUrl: string) => {
    try {
      const urlObj = new URL(videoUrl);
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      return urlObj.searchParams.get('v');
    } catch {
      return null;
    }
  };

  const fetchTitle = async (forceReload = false) => {
    if (!forceReload && (fetchedTitle || !loading)) return;

    let isMounted = true;
    setIsReloading(true);

    // Captured metadata from oEmbed/noembed (channel name is always available)
    let oEmbedChannel: string | null = null;

    const proxies = [
      // YouTube-specific proxies (tried first if URL is YouTube)
      ...(isYouTube ? [
        async () => {
          // noembed.com - Specialized for YouTube and other video platforms
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
          if (!res.ok) throw new Error('Noembed failed');
          const json = await res.json();
          // noembed returns {error: "..."} on failure — must check it's a plain string
          if (json.title && typeof json.title === 'string') {
            if (json.author_name) oEmbedChannel = json.author_name;
            return json.title;
          }
          throw new Error('No title in Noembed response');
        },
        async () => {
          // YouTube oEmbed API — supports videos, playlists and shorts natively
          const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
          if (!res.ok) throw new Error('YouTube oEmbed failed');
          const json = await res.json();
          if (json.title && typeof json.title === 'string') {
            if (json.author_name) oEmbedChannel = json.author_name;
            return json.title;
          }
          throw new Error('No title in YouTube oEmbed response');
        }
      ] : []),
      // General-purpose proxies
      async () => {
        // Microlink (Excelente para extrair Título, Imagem e Logo. Limite por IP do usuário)
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Microlink failed');
        const json = await res.json();
        if (json.data && json.data.title && typeof json.data.title === 'string') {
          return json.data.title;
        }
        throw new Error('No title in Microlink response');
      },
      async () => {
        // JSONLink (Alternativa gratuita e sem chave para extração)
        const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('JSONLink failed');
        const json = await res.json();
        if (json.title && typeof json.title === 'string') {
          return json.title;
        }
        throw new Error('No title in JSONLink response');
      },
      async () => {
        // LinkPreview.net
        const res = await fetch(`https://api.linkpreview.net/?key=${encodeURIComponent(url)}&q=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('LinkPreview failed');
        const json = await res.json();
        if (json.title && typeof json.title === 'string') {
          return json.title;
        }
        throw new Error('No title in LinkPreview response');
      },
      async () => {
        // Codetabs API
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Codetabs failed');
        const html = await res.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        throw new Error('Regex failed on Codetabs HTML');
      },
      async () => {
        // CORS Proxy with direct fetch
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('CORSProxy failed');
        const html = await res.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        throw new Error('Regex failed on CORSProxy HTML');
      },
      async () => {
        // Fallback final: proxy genérico do allorigins lendo o HTML cru
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('AllOrigins failed');
        const data = await res.json();
        const html = typeof data?.contents === 'string' ? data.contents : '';
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          return match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        }
        throw new Error('Regex failed on AllOrigins HTML');
      }
    ];

    let fetchedTitleStr = '';
    let success = false;

    for (const proxyFn of proxies) {
      try {
        fetchedTitleStr = await proxyFn();
        if (fetchedTitleStr) {
          success = true;
          break;
        }
      } catch (e) {
        // ignore and try next
      }
    }

    const updateNodeSafe = (updates: any) => {
      if (typeof props.getPos === 'function') {
        const pos = props.getPos();
        if (pos !== undefined && props.editor && props.editor.state) {
          const nodeAtPos = props.editor.state.doc.nodeAt(pos);
          if (nodeAtPos && nodeAtPos.type.name === 'linkPreview' && nodeAtPos.attrs.url === url) {
            props.updateAttributes(updates);
          } else {
            console.warn('LinkPreview safe update skipped: node at pos mismatch.');
          }
        }
      } else {
        props.updateAttributes(updates);
      }
    };

    try {
      let finalTitle = fetchedTitleStr;
      let finalChannel: string | null = oEmbedChannel; // Use oEmbed channel as default
      let finalDuration = null;
      let finalIsPlaylist = url.includes('list=');
      let finalUploadDate = null;

      // Tauri or Web yt-dlp/API fetch for YouTube (brings rich metadata)
      if (isYouTube && window.api && window.api.youtube && window.api.youtube.fetchPlaylistInfo && !url.includes('/@')) {
        try {
          const ytInfo = await window.api.youtube.fetchPlaylistInfo(url);
          if (ytInfo && ytInfo.title) {
            finalTitle = ytInfo.title;
            finalChannel = ytInfo.uploader || ytInfo.uploader_id || finalChannel;
            finalDuration = ytInfo.duration;
            finalIsPlaylist = ytInfo._type === 'playlist' || url.includes('list=');
            finalUploadDate = ytInfo.upload_date;
          }
        } catch (ytErr) {
          console.warn('yt-dlp fetch failed, falling back to oEmbed metadata', ytErr);
        }
      }

      if (!finalTitle && !success) throw new Error('All proxies failed');

      const newTitle = typeof finalTitle === 'string' ? finalTitle : String(finalTitle || fetchedTitleStr);
      if (isMounted) {
        setFetchedTitle(newTitle);
        if (finalChannel) setFetchedChannel(finalChannel);
        if (finalDuration) setFetchedDuration(finalDuration);
        if (finalIsPlaylist) setFetchedIsPlaylist(finalIsPlaylist);
        if (finalUploadDate) setFetchedUploadDate(finalUploadDate);
        
        updateNodeSafe({ 
          title: newTitle, 
          isLoading: false,
          channel: finalChannel,
          duration: finalDuration,
          isPlaylist: finalIsPlaylist,
          uploadDate: finalUploadDate
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch link title:', err);
      if (isMounted) {
        const fallbackTitle = new URL(url).hostname;
        setFetchedTitle(fallbackTitle);
        updateNodeSafe({ title: fallbackTitle, isLoading: false });
        setLoading(false);
      }
    } finally {
      if (isMounted) {
        setIsReloading(false);
      }
    }

    return () => { isMounted = false; };
  };

  useEffect(() => {
    fetchTitle();
  }, [url]);

  const handleReload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFetchedTitle(null);
    setLoading(true);
    fetchTitle(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const [faviconError, setFaviconError] = useState(false);
  
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();

  const renderIcon = () => {
    if (!domain || faviconError) {
      return <Globe size={18} className="text-brand-400" />;
    }
    
    return (
      <img 
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
        alt={`${domain} icon`}
        className="w-5 h-5 rounded-sm"
        onError={() => setFaviconError(true)}
      />
    );
  };

  return (
    <NodeViewWrapper className="link-preview-block block my-4 group/widget" contentEditable={false}>
      <div className="relative group/link">
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/widget:opacity-100 flex items-center z-10 bg-dark-bg/50 backdrop-blur-sm rounded-md border border-white/5 shadow-sm">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function') {
                const pos = props.getPos();
                props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
              }
            }}
            className="cursor-pointer hover:bg-white/10 p-1 rounded-l text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
            title="Adicionar linha abaixo"
          >
            <Plus size={16} />
          </button>
          <div 
            data-drag-handle
            className="cursor-grab hover:bg-white/10 p-1 rounded-r text-dark-subtext hover:text-white flex items-center justify-center transition-colors"
            title="Arrastar bloco"
          >
            <GripVertical size={16} />
          </div>
        </div>
        <div 
          onClick={() => setShowLinkConfirm(true)}
          className={`block transition-all rounded-lg p-3 pr-[104px] cursor-pointer ${
            props.selected 
              ? 'bg-brand-500/5 border border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10' 
              : 'bg-dark-card border border-white/10 hover:bg-white/5 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
              {isYouTube ? (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowVideo(!showVideo); }}
                  className="w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors"
                  title={showVideo ? "Fechar vídeo" : "Assistir vídeo"}
                >
                  <PlaySquare size={16} className={`${showVideo ? 'text-white' : 'text-brand-500'} drop-shadow-sm flex-shrink-0 transition-colors`} />
                </button>
              ) : (
                renderIcon()
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              {loading || isReloading ? (
                <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse mb-1"></div>
              ) : (
                <span className="text-[13px] font-medium text-white/90 truncate leading-tight tracking-wide">
                  {fetchedTitle || new URL(url).hostname}
                </span>
              )}
              <div className="flex items-center gap-3 mt-1 opacity-60">
                <span className="text-[11px] truncate tracking-wide text-brand-200">
                  {new URL(url).hostname}
                </span>
                
                {fetchedChannel && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-[11px] truncate">{fetchedChannel}</span>
                  </>
                )}
                
                {fetchedDuration && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-[11px] flex items-center gap-1">
                      <Clock size={10} />
                      {formatDuration(fetchedDuration)}
                    </span>
                  </>
                )}
                {fetchedUploadDate && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="text-[11px] flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(fetchedUploadDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {fetchedIsPlaylist && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPlaylistModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg text-[11px] font-medium transition-colors border border-brand-500/30 backdrop-blur-sm shadow-sm whitespace-nowrap"
                >
                  <ListVideo size={14} />
                  Ver Playlist
                </button>
              )}
            </div>
          </div>
          
          {showVideo && isYouTube && (
            <div 
              className="mt-3 w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${getVideoId(url)}?origin=${encodeURIComponent(window.location.origin)}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
        <div className={`absolute top-2 right-2 flex items-center gap-1 transition-opacity ${
          notes || showNotes ? 'opacity-100' : 'opacity-0 group-hover/link:opacity-100'
        }`}>
          <button
            onClick={handleToggleNotes}
            className={`p-1.5 rounded transition-all flex items-center gap-1 border backdrop-blur-sm ${
              showNotes
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm'
                : notes
                ? 'bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 border-brand-500/30'
                : 'bg-dark-card/80 hover:bg-white/10 text-dark-subtext hover:text-white border-white/5'
            }`}
            title={
              !showNotes && !notes
                ? 'Adicionar Anotações ao Link (+)'
                : showNotes
                ? 'Recolher Anotações do Link'
                : 'Expandir Anotações do Link'
            }
          >
            {!notes && !showNotes ? (
              <Plus size={14} />
            ) : showNotes ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </button>
          <button
            onClick={handleReload}
            className="p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
            title="Recarregar título"
          >
            <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-500/20 text-dark-subtext hover:text-red-400 bg-dark-card/80 backdrop-blur-sm border border-white/5"
            title="Remover link"
          >
            <X size={14} />
          </button>
        </div>

        {/* Campo de Anotações Acoplado ao Widget de Link */}
        {showNotes && (
          <div 
            className="mt-1.5 bg-dark-card border border-white/10 rounded-lg p-3 transition-all shadow-md animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-300">
                <StickyNote size={13} className="text-brand-400 shrink-0" />
                <span>Anotações do Link</span>
              </div>
              {notes && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.updateAttributes({ notes: '' });
                  }}
                  className="text-[10px] text-dark-subtext hover:text-red-400 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5"
                  title="Limpar anotações"
                >
                  <Trash2 size={11} />
                  <span>Limpar</span>
                </button>
              )}
            </div>
            <textarea
              ref={notesTextareaRef}
              value={notes}
              onChange={(e) => props.updateAttributes({ notes: e.target.value })}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              placeholder="Escreva suas anotações, destaques ou resumo referente a este link aqui..."
              className="w-full bg-black/40 border border-white/10 focus:border-brand-500/50 rounded-md p-2.5 text-xs text-brand-100 placeholder-white/25 outline-none resize-y min-h-[65px] leading-relaxed transition-colors"
              rows={3}
            />
          </div>
        )}
        
        {showPlaylistModal && (
          <YouTubePlaylistModal
            url={url}
            title={fetchedTitle || 'Playlist'}
            onClose={() => setShowPlaylistModal(false)}
          />
        )}
        
        {showLinkConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowLinkConfirm(false)}>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 w-[400px] shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">Abrir Link Externo</h3>
                <p className="text-dark-subtext text-sm mb-4">
                  Deseja abrir o seguinte link no seu navegador padrão?
                </p>
                <div className="bg-black/30 border border-white/5 p-3 rounded-lg mb-6 overflow-hidden">
                  <p className="text-brand-400 text-xs break-all">{url}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setShowLinkConfirm(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setShowLinkConfirm(false);
                      if (window.api?.os?.openInBrowser) {
                        window.api.os.openInBrowser(url);
                      } else {
                        window.open(url, '_blank');
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                  >
                    Abrir Navegador
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}

        {showDeleteConfirm && (
          <Portal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
              <div className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-white font-semibold text-lg text-center">Remover Link</h3>
                <p className="text-dark-subtext text-sm text-center">
                  Tem certeza que deseja remover este link da página?
                </p>
                
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      props.deleteNode();
                    }}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </Portal>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const LinkPreviewBlock = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }

        const { $from, empty } = selection;

        if (!empty || $from.parentOffset !== 0) {
          return false;
        }

        // Get the position before the current block (before the <p>)
        const pPos = $from.before();
        
        // Resolve that position to find the block right before it
        const resolveBefore = state.doc.resolve(pPos);
        const nodeBeforeBlock = resolveBefore.nodeBefore;

        if (nodeBeforeBlock && nodeBeforeBlock.type.name === this.name) {
          if ($from.parent.content.size === 0) {
            const tr = state.tr;
            const widgetPos = pPos - nodeBeforeBlock.nodeSize;
            
            // Delete the empty paragraph
            tr.delete(pPos, pPos + $from.parent.nodeSize);
            
            // Select the widget
            tr.setSelection(NodeSelection.create(tr.doc, widgetPos));
            
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
      ArrowDown: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        
        // If we are currently selecting THIS widget
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const posAfter = selection.$to.pos;
          const nextNode = state.doc.nodeAt(posAfter);
          
          // If the node immediately after is also an atom block (like another widget)
          if (nextNode && nextNode.isAtom && nextNode.isBlock) {
            const tr = state.tr;
            tr.setSelection(NodeSelection.create(state.doc, posAfter));
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;

        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const url = selection.node.attrs.url;
          window.dispatchEvent(new CustomEvent('link-widget-delete-request', { detail: { url } }));
          return true;
        }
        return false;
      },
      ArrowUp: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        // If we are currently selecting THIS widget
        if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
          const posBefore = selection.$from.pos;
          const resolveBefore = state.doc.resolve(posBefore);
          const nodeBefore = resolveBefore.nodeBefore;

          // If the node immediately before is also an atom block (like another widget)
          if (nodeBefore && nodeBefore.isAtom && nodeBefore.isBlock) {
            const tr = state.tr;
            const widgetPos = posBefore - nodeBefore.nodeSize;
            tr.setSelection(NodeSelection.create(state.doc, widgetPos));
            view.dispatch(tr);
            return true;
          }
        }
        return false;
      }
    };
  },

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: null },
      isLoading: { default: true },
      channel: { default: null },
      duration: { default: null },
      isPlaylist: { default: false },
      uploadDate: { default: null },
      notes: { default: '' },
      showNotes: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'div.link-preview-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'link-preview-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkPreviewComponent);
  },
});
