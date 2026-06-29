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
      try {
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        const html = data.contents;
        
        // Extract title using Regex
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          const newTitle = match[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
          if (isMounted) {
            setFetchedTitle(newTitle);
            props.updateAttributes({ title: newTitle, isLoading: false });
            setLoading(false);
          }
        } else {
          throw new Error('Title not found');
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

  const getIcon = () => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return <Video size={18} className="text-red-500" />;
      if (hostname.includes('github.com')) return <Code2 size={18} className="text-white" />;
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) return <MessageCircle size={18} className="text-blue-400" />;
      return <Globe size={18} className="text-brand-400" />;
    } catch {
      return <Link2 size={18} className="text-brand-400" />;
    }
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
            {getIcon()}
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
