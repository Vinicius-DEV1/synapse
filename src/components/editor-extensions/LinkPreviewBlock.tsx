import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, Globe, RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const LinkPreviewComponent = (props: any) => {
  const { url, title, isLoading } = props.node.attrs;
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [loading, setLoading] = useState(isLoading);
  const [isReloading, setIsReloading] = useState(false);

  const fetchTitle = async (forceReload = false) => {
    if (!forceReload && (fetchedTitle || !loading)) return;

    let isMounted = true;
    setIsReloading(true);

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');

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

    try {
      if (!success) throw new Error('All proxies failed');

      const newTitle = typeof fetchedTitleStr === 'string' ? fetchedTitleStr : String(fetchedTitleStr);
      if (isMounted) {
        setFetchedTitle(newTitle);
        props.updateAttributes({ title: newTitle, isLoading: false });
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch link title:', err);
      if (isMounted) {
        const fallbackTitle = new URL(url).hostname;
        setFetchedTitle(fallbackTitle);
        props.updateAttributes({ title: fallbackTitle, isLoading: false });
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
      <div className="relative group">
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-dark-card border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all rounded-lg p-3 cursor-pointer no-underline"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0">
              {renderIcon()}
            </div>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              {loading || isReloading ? (
                <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse mb-1"></div>
              ) : (
                <div className="text-sm font-semibold text-white/90 truncate mb-0.5 group-hover:text-brand-400 transition-colors">
                  {typeof fetchedTitle === 'string' ? fetchedTitle : url}
                </div>
              )}
              <div className="text-xs text-white/40 truncate flex items-center gap-1">
                <Link2 size={12} />
                {url}
              </div>
            </div>
          </div>
        </a>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      </div>
    </NodeViewWrapper>
  );
};

export const LinkPreviewBlock = Node.create({
  name: 'linkPreview',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      title: { default: null },
      isLoading: { default: true },
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
