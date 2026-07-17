import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Link2, Globe, Video, MessageCircle, Code2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const LinkPreviewComponent = (props: any) => {
  const { url, title, isLoading } = props.node.attrs;
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(title);
  const [loading, setLoading] = useState(isLoading);

  useEffect(() => {
    if (fetchedTitle || !loading) return;

    let isMounted = true;
    
    const fetchTitle = async () => {
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
      }
    };

    fetchTitle();

    return () => { isMounted = false; };
  }, [url, fetchedTitle, loading, props]);

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
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-dark-card border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all rounded-lg p-3 group cursor-pointer no-underline"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-dark-bg border border-white/5 flex items-center justify-center shrink-0">
            {renderIcon()}
          </div>
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {loading ? (
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
