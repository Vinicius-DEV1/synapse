import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { ScrollablePre } from '../../utils/scroll-forwarding';
import { getErrorMessage } from '../../utils/error';

export const mdRenderers: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-brand-300">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
  h2: ({ children }) => <h2 className="text-md font-bold mb-2 text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-brand-500 pl-3 my-2 text-brand-50/80 italic">{children}</blockquote>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = Boolean(match || String(children).includes('\n'));
    
    if (isBlock) {
      const codeText = String(children).replace(/\n$/, '');
      let highlightedHtml: string | null = null;
      
      if (match && hljs.getLanguage(match[1])) {
        try {
          const raw = hljs.highlight(codeText, { language: match[1] }).value;
          highlightedHtml = DOMPurify.sanitize(raw, { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'] });
        } catch (e: unknown) {
          console.debug('[AiChatMarkdown] Syntax highlight fallback:', getErrorMessage(e));
        }
      } else {
        try {
          const raw = hljs.highlightAuto(codeText).value;
          highlightedHtml = DOMPurify.sanitize(raw, { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'] });
        } catch (e: unknown) {
          console.debug('[AiChatMarkdown] Auto highlight fallback:', getErrorMessage(e));
        }
      }

      if (highlightedHtml) {
        return (
          <code
            className={`${className || ''} hljs`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            {...props}
          />
        );
      }

      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300 text-xs font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <ScrollablePre className="bg-black/30 p-3 rounded-lg overflow-x-auto mb-2 custom-scrollbar">
      {children}
    </ScrollablePre>
  )
};

export function AiChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
      {content}
    </ReactMarkdown>
  );
}
