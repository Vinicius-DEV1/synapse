import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';

interface TextPreviewerProps {
  textContent: string;
  isMd: boolean;
  viewMode: 'rendered' | 'raw';
  darkMode: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

const mdRenderers: Components = {
  p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-200">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-brand-300">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-white/10 pb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-white border-b border-white/5 pb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4 text-brand-300">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-brand-400">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-200">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-200">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-brand-500 bg-brand-500/10 pl-4 py-2 my-3 text-gray-300 italic rounded-r">{children}</blockquote>,
  hr: () => <hr className="border-white/10 my-6" />,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{children}</a>,
  table: ({ children }) => <div className="overflow-x-auto my-4"><table className="min-w-full divide-y divide-white/10 border border-white/10">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2 text-sm text-gray-300 border-t border-white/5">{children}</td>,
  code: ({ className, children, ...props }) => {
    const inline = !className;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && language) {
      try {
        const highlighted = hljs.highlight(codeString, { language }).value;
        return (
          <div className="relative group my-3">
            <div className="absolute top-2 right-2 text-[10px] uppercase font-mono text-dark-subtext bg-black/40 px-2 py-0.5 rounded">
              {language}
            </div>
            <pre className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto text-sm border border-white/5">
              <code dangerouslySetInnerHTML={{ __html: highlighted }} />
            </pre>
          </div>
        );
      } catch {
        // Fallback if language syntax is unsupported by highlight.js
      }
    }

    if (!inline) {
      return (
        <pre className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto text-sm my-3 border border-white/5">
          <code className="text-gray-300">{codeString}</code>
        </pre>
      );
    }

    return (
      <code className="bg-white/10 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
        {children}
      </code>
    );
  }
};

export function TextPreviewer({
  textContent,
  isMd,
  viewMode,
  darkMode,
  scrollContainerRef,
  onScroll
}: TextPreviewerProps) {
  return (
    <div 
      ref={scrollContainerRef}
      onScroll={onScroll}
      className={`w-full max-w-4xl h-full overflow-y-auto rounded-xl p-8 shadow-2xl transition-colors duration-200 border ${
        darkMode 
          ? 'bg-black text-gray-100 border-white/5' 
          : 'bg-[#18181b] text-gray-200 border-white/10'
      }`}
      style={{
        lineHeight: '1.75',
        fontSize: '15px'
      }}
    >
      {isMd && viewMode === 'rendered' ? (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
            {textContent}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className="font-mono text-xs text-gray-300 whitespace-pre-wrap word-break leading-relaxed">
          {textContent}
        </pre>
      )}
    </div>
  );
}
