import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, Globe, RefreshCw } from 'lucide-react';
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

    const proxies = [
      async () => {
        // Microlink (Excelente para extrair Título, Imagem e Logo. Limite por IP do usuário)
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Microlink failed');
        const json = await res.json();
        if (json.data && json.data.title) {
          return json.data.title as string;
        }
        throw new Error('No title in Microlink response');
      },
      async () => {
        // JSONLink (Alternativa gratuita e sem chave para extração)
        const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('JSONLink failed');
        const json = await res.json();
        if (json.title) {
          return json.title as string;
        }
        throw new Error('No title in JSONLink response');
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

      const newTitle = fetchedTitleStr;
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
                  {fetchedTitle || url}
                </div>
              )}
              <div className="text-xs text-white/40 truncate flex items-center gap-1">
                <Link2 size={12} />
                {url}
              </div>
            </div>
          </div>
        </a>
        <button
          onClick={handleReload}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10 text-dark-subtext hover:text-white bg-dark-card/80 backdrop-blur-sm border border-white/5"
          title="Recarregar título"
        >
          <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
        </button>
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
