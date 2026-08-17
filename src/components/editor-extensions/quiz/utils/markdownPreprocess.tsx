import { Code, Copy } from 'lucide-react';

export const preprocessMarkdownCode = (text: string): string => {
  if (!text) return '';
  const validLangs = [
    'js',
    'javascript',
    'ts',
    'typescript',
    'python',
    'py',
    'sql',
    'html',
    'css',
    'json',
    'bash',
    'sh',
    'c',
    'cpp',
    'java',
  ];

  return text.replace(/`([a-z]{2,10})\s+([^`\n]{12,})`/gi, (match, lang, codeBody) => {
    if (validLangs.includes(lang.toLowerCase())) {
      const formattedCode = codeBody.trim().replace(/;\s*/g, ';\n');
      return `\n\`\`\`${lang.toLowerCase()}\n${formattedCode}\n\`\`\`\n`;
    }
    return match;
  });
};

export const markdownComponents = {
  p: ({ children }: any) => <span className="inline leading-relaxed">{children}</span>,
  code: ({ inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const isInline = inline || (!className && !codeString.includes('\n'));

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
        <pre className="p-3 overflow-x-auto text-xs text-purple-100 font-mono leading-relaxed custom-scrollbar bg-black/70">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
};
