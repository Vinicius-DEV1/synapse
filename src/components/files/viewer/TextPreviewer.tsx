import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import { ScrollablePre, ScrollableDiv } from '../../../utils/scroll-forwarding';

interface TextPreviewerProps {
  textContent: string;
  isMd: boolean;
  viewMode: 'rendered' | 'raw';
  darkMode: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

const mdRenderers: Components = {
  p: ({ children }) => <p className="mb-5 leading-[1.8] text-zinc-300 text-[15px] font-normal">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
  h1: ({ children }) => (
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6 mt-10 text-white border-b border-white/10 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4 mt-8 text-zinc-100 border-b border-white/5 pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold tracking-tight mb-3 mt-6 text-zinc-200">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mb-2 mt-4 text-zinc-300">
      {children}
    </h4>
  ),
  ul: ({ children }) => <ul className="list-disc pl-6 mb-5 space-y-2 text-zinc-300 leading-[1.75] text-[15px]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-5 space-y-2 text-zinc-300 leading-[1.75] text-[15px]">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.75]">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-600 bg-white/[0.02] pl-4 py-2 my-5 text-zinc-400 italic rounded-r text-[15px] leading-relaxed">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-white/10 my-8" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-400 hover:text-brand-300 underline underline-offset-4 decoration-brand-400/40 hover:decoration-brand-300 transition-colors"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <ScrollableDiv className="overflow-x-auto my-6 border-y border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left">{children}</table>
    </ScrollableDiv>
  ),
  thead: ({ children }) => <thead className="bg-white/[0.02]">{children}</thead>,
  th: ({ children }) => (
    <th className="py-3 px-4 text-left text-xs font-semibold text-zinc-200 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-3.5 px-4 text-sm text-zinc-300 border-t border-white/5 leading-relaxed">
      {children}
    </td>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && language) {
      try {
        const highlighted = hljs.highlight(codeString, { language }).value;
        return (
          <div className="relative group my-5">
            <div className="absolute top-2.5 right-3 text-[10px] uppercase font-mono text-zinc-400 bg-black/50 px-2 py-0.5 rounded border border-white/5 tracking-wider">
              {language}
            </div>
            <ScrollablePre className="bg-[#141416] p-4 sm:p-5 rounded-xl overflow-x-auto text-sm border border-white/5 font-mono leading-relaxed">
              <code dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlighted) }} />
            </ScrollablePre>
          </div>
        );
      } catch {
        // Fallback if language syntax is unsupported by highlight.js
      }
    }

    if (!inline) {
      return (
        <ScrollablePre className="bg-[#141416] p-4 sm:p-5 rounded-xl overflow-x-auto text-sm my-5 border border-white/5 font-mono text-zinc-300 leading-relaxed">
          <code>{codeString}</code>
        </ScrollablePre>
      );
    }

    return (
      <code className="bg-white/10 text-zinc-200 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
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
      className={`w-full h-full overflow-y-auto transition-colors duration-200 ${
        darkMode ? 'bg-black text-zinc-100' : 'bg-[#0f0f11] text-zinc-200'
      }`}
    >
      <div className="max-w-3xl mx-auto px-6 py-10 sm:px-12 sm:py-16">
        {isMd && viewMode === 'rendered' ? (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
              {textContent}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap break-words leading-relaxed select-text">
            {textContent}
          </pre>
        )}
      </div>
    </div>
  );
}
