import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, Copy } from 'lucide-react';
import { ScrollablePre } from '../../../../utils/scroll-forwarding';

const MARKDOWN_SYNTAX_REGEX = /[`*_~\[\]#$<\\]|\n/;

export function isPlainMarkdownText(text: string): boolean {
  if (!text) return true;
  return !MARKDOWN_SYNTAX_REGEX.test(text);
}

export const FastMarkdown = memo(function FastMarkdown({
  content,
  className = 'inline leading-relaxed',
}: {
  content?: string | null;
  className?: string;
}) {
  if (!content) return null;
  if (isPlainMarkdownText(content)) {
    return <span className={className}>{content}</span>;
  }
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {preprocessMarkdownCode(content)}
    </ReactMarkdown>
  );
});

export const preprocessMarkdownCode = (text: string): string => {
  if (!text) return '';
  const validLangs: Record<string, string> = {
    js: 'javascript',
    javascript: 'javascript',
    ts: 'typescript',
    typescript: 'typescript',
    python: 'python',
    py: 'python',
    sql: 'sql',
    html: 'html',
    css: 'css',
    json: 'json',
    bash: 'bash',
    sh: 'bash',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'csharp',
    cs: 'csharp',
    'c#': 'csharp',
    dotnet: 'csharp',
    java: 'java',
    rust: 'rust',
    rs: 'rust',
    go: 'go',
    golang: 'go',
    kotlin: 'kotlin',
    kt: 'kotlin',
    swift: 'swift',
    php: 'php',
    ruby: 'ruby',
    rb: 'ruby',
    dart: 'dart',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    r: 'r',
    scala: 'scala',
  };

  return text.replace(/`([a-z0-9#+]{1,10})\s+([^`\n]{12,})`/gi, (match, lang, codeBody) => {
    const normalizedLang = validLangs[lang.toLowerCase()];
    if (normalizedLang) {
      const formattedCode = codeBody.trim().replace(/;\s*/g, ';\n');
      return `\n\`\`\`${normalizedLang}\n${formattedCode}\n\`\`\`\n`;
    }
    return match;
  });
};

export const markdownComponents: Components = {
  p: ({ children }) => <span className="inline leading-relaxed">{children}</span>,
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const isInline = !className && !codeString.includes('\n');

    if (isInline) {
      return (
        <code
          className="bg-purple-950/70 text-purple-200 border border-purple-500/30 px-1.5 py-0.5 rounded text-xs font-mono font-semibold mx-0.5 inline-block"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-2.5 rounded-xl overflow-hidden border border-purple-500/30 bg-black/80 shadow-lg text-left font-normal normal-case block">
        <div className="flex items-center justify-between px-3 py-1.5 bg-purple-950/50 border-b border-purple-500/20 text-[11px] font-mono">
          <span className="font-semibold text-purple-300 flex items-center gap-1.5">
            <Code size={13} className="text-purple-400" />
            {match ? match[1] : 'code'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(codeString);
            }}
            className="text-dark-subtext hover:text-white transition-colors flex items-center gap-1 text-[10px]"
            title="Copiar trecho de código"
          >
            <Copy size={11} />
            <span>Copiar</span>
          </button>
        </div>
        <ScrollablePre className="p-3 overflow-x-auto text-xs text-purple-100 font-mono leading-relaxed custom-scrollbar bg-black/70">
          <code className={className} {...props}>
            {children}
          </code>
        </ScrollablePre>
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>,
};
