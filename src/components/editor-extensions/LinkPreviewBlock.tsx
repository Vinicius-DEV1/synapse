import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, Globe, RefreshCw, X, PlayCircle, Clock, PlaySquare, ListVideo, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import YouTubePlaylistModal from './YouTubePlaylistModal';

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
  const { url, title, isLoading, channel, duration, isPlaylist, uploadDate } = props.node.attrs;
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [fetchedChannel, setFetchedChannel] = useState<string | null>(channel);
  const [fetchedDuration, setFetchedDuration] = useState<number | null>(duration);
  const [fetchedIsPlaylist, setFetchedIsPlaylist] = useState<boolean>(isPlaylist);
  const [fetchedUploadDate, setFetchedUploadDate] = useState<string | null>(uploadDate);
  const [loading, setLoading] = useState(isLoading);
  const [isReloading, setIsReloading] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

  const fetchTitle = async (forceReload = false) => {
    if (!forceReload && (fetchedTitle || !loading)) return;

    let isMounted = true;
    setIsReloading(true);

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
      let finalChannel = null;
      let finalDuration = null;
      let finalIsPlaylist = url.includes('list=');
      let finalUploadDate = null;

      // Tauri or Web yt-dlp/API fetch for YouTube (brings rich metadata)
      if (isYouTube && window.api && window.api.youtube && window.api.youtube.fetchPlaylistInfo && !url.includes('/@')) {
        try {
          const ytInfo = await window.api.youtube.fetchPlaylistInfo(url);
          if (ytInfo && ytInfo.title) {
            finalTitle = ytInfo.title;
            finalChannel = ytInfo.uploader || ytInfo.uploader_id;
            finalDuration = ytInfo.duration;
            finalIsPlaylist = ytInfo._type === 'playlist' || url.includes('list=');
            finalUploadDate = ytInfo.upload_date;
          }
        } catch (ytErr) {
          console.warn('yt-dlp fetch failed, falling back to basic title', ytErr);
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
    props.deleteNode();
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
    <NodeViewWrapper className="link-preview-block block my-4" contentEditable={false}>
      <div className="relative group/link">
        <div 
          onClick={() => window.open(url, '_blank')}
          className={`block transition-all rounded-lg p-3 pr-[72px] cursor-pointer ${
            props.selected 
              ? 'bg-brand-500/5 border border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10' 
              : 'bg-dark-card border border-white/10 hover:bg-white/5 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0">
              {isYouTube ? (
                <PlaySquare size={16} className="text-brand-500 drop-shadow-sm flex-shrink-0" />
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
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
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
        
        {showPlaylistModal && (
          <YouTubePlaylistModal
            url={url}
            title={fetchedTitle || 'Playlist'}
            onClose={() => setShowPlaylistModal(false)}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const LinkPreviewBlock = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: true,

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
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
