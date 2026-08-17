import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';

export const mdRenderers = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
  strong: ({ children }: any) => <strong className="font-bold text-brand-300">{children}</strong>,
  em: ({ children }: any) => <em className="italic">{children}</em>,
  h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-md font-bold mb-2 text-white">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>,
  ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }: any) => <li>{children}</li>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-brand-500 pl-3 my-2 text-brand-50/80 italic">{children}</blockquote>,
  code: ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = match || String(children).includes('\n');
    
    if (isBlock) {
      const codeText = String(children).replace(/\n$/, '');
      let highlightedHtml: string | null = null;
      
      if (match && hljs.getLanguage(match[1])) {
        try {
          highlightedHtml = hljs.highlight(codeText, { language: match[1] }).value;
        } catch (e) {
          // fallback
        }
      } else {
        try {
          highlightedHtml = hljs.highlightAuto(codeText).value;
        } catch (e) {
          // fallback
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
  pre: ({ children }: any) => (
    <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto mb-2 custom-scrollbar">
      {children}
    </pre>
  )
};

export function AiChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
      {content}
    </ReactMarkdown>
  );
}
