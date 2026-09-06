/**
 * Helper to determine programming language comment syntax and formatting rules
 * for AI code generation within TipTap code blocks.
 */

export interface LanguageCommentInfo {
  syntaxGuide: string;
  lineComment?: string;
  blockComment?: { start: string; end: string };
  supportsComments: boolean;
}

export function getLanguageCommentInfo(language: string): LanguageCommentInfo {
  const lang = (language || 'auto').toLowerCase().trim();

  // Languages using // and /* ... */
  const cStyleLanguages = [
    'javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx',
    'c', 'cpp', 'c++', 'csharp', 'c#', 'cs', 'java',
    'go', 'golang', 'rust', 'rs', 'kotlin', 'kt',
    'swift', 'php', 'dart', 'scala', 'solidity',
    'jsonc', 'glsl', 'hlsl', 'verilog',
  ];
  if (cStyleLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use comentários de linha "//" ou blocos de comentários "/* ... */".',
      lineComment: '//',
      blockComment: { start: '/*', end: '*/' },
      supportsComments: true,
    };
  }

  // Languages using #
  const hashLanguages = [
    'python', 'py', 'ruby', 'rb', 'bash', 'sh', 'shell', 'zsh',
    'perl', 'pl', 'r', 'yaml', 'yml', 'dockerfile', 'powershell',
    'ps1', 'makefile', 'cmake', 'nginx', 'elixir', 'ex', 'exs',
    'crystal', 'nim', 'toml',
  ];
  if (hashLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use comentários iniciando com "#".',
      lineComment: '#',
      supportsComments: true,
    };
  }

  // Languages using --
  const dashLanguages = [
    'sql', 'pgsql', 'postgres', 'postgresql', 'mysql',
    'sqlite', 'lua', 'haskell', 'hs', 'ada', 'vhdl',
  ];
  if (dashLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use comentários de linha "--" ou blocos quando aplicável.',
      lineComment: '--',
      supportsComments: true,
    };
  }

  // HTML / XML / SVG
  const xmlLanguages = ['html', 'htm', 'xml', 'svg', 'xhtml', 'vue', 'svelte'];
  if (xmlLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use a sintaxe de comentários "<!-- ... -->".',
      blockComment: { start: '<!--', end: '-->' },
      supportsComments: true,
    };
  }

  // CSS / SCSS / SASS / Less
  const cssLanguages = ['css', 'scss', 'sass', 'less'];
  if (cssLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use blocos de comentários "/* ... */".',
      blockComment: { start: '/*', end: '*/' },
      supportsComments: true,
    };
  }

  // Semicolon ;
  const semicolonLanguages = ['lisp', 'clojure', 'clj', 'scheme', 'racket', 'ini', 'asm', 'assembly', 'nasm'];
  if (semicolonLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use comentários iniciando com ";".',
      lineComment: ';',
      supportsComments: true,
    };
  }

  // Percent %
  const percentLanguages = ['latex', 'tex', 'matlab', 'erlang', 'prolog'];
  if (percentLanguages.includes(lang)) {
    return {
      syntaxGuide: 'Use comentários iniciando com "%".',
      lineComment: '%',
      supportsComments: true,
    };
  }

  // JSON
  if (lang === 'json') {
    return {
      syntaxGuide: 'JSON padrão NÃO suporta comentários. O código deve ser JSON estritamente válido, sem comentários e sem nenhum texto fora da estrutura.',
      supportsComments: false,
    };
  }

  // Fallback (auto or unknown)
  return {
    syntaxGuide: 'Identifique a linguagem utilizada e use estritamente os comentários nativos dessa linguagem (ex: // para C/JS/TS/Java, # para Python/Shell, -- para SQL, <!-- --> para HTML/XML).',
    supportsComments: true,
  };
}

/**
 * Builds the strict context and rules for code block editing by AI
 */
export function buildCodeBlockRules(language: string, currentCode: string): string {
  const lang = (language || 'auto').trim();
  const commentInfo = getLanguageCommentInfo(lang);

  return `[BLOCO ATUAL]
Tipo: Bloco de Código
Linguagem: ${lang}
Guia de Comentários: ${commentInfo.syntaxGuide}

Código atual:
\`\`\`${lang !== 'auto' ? lang : ''}
${currentCode}
\`\`\`

REGRAS E LIMITES MANDATÓRIOS:
1. UNIVERSO RESTRITO: Você é o assistente de IA encarregado EXCLUSIVAMENTE deste bloco de código. O seu universo de atuação e edição é 100% RESTRITO a este código específico. NUNCA tente editar, adicionar ou alterar conteúdo fora deste bloco.
2. RESPEITO RIGOROSO À SINTAXE: Todo código gerado DEVE respeitar estritamente as regras de sintaxe da linguagem "${lang}". O código deve ser limpo, funcional e livre de erros sintáticos.
3. NUNCA INSERIR TEXTO OU MARKDOWN DENTRO DO CÓDIGO: Jamais insira texto explicativo livre, títulos markdown (#), negrito (**), listas (- ou *) ou qualquer texto em linguagem natural solto dentro do bloco de código. Qualquer texto fora da sintaxe quebra a lógica de execução.
4. COMENTÁRIOS OBRIGATÓRIOS DA LINGUAGEM: Caso vá escrever explicações, anotações, descrições de funções ou notas contextuais dentro do código, utilize OBRIGATORIAMENTE os comentários nativos da linguagem (${commentInfo.syntaxGuide}).
5. CÓDIGO PURO: Ao propor alterações, o código fornecido dentro de \`\`\`${lang !== 'auto' ? lang : ''} ... \`\`\`. deve ser 100% código válido e compilável/executável, pronto para substituição direta sem demandar limpeza manual.`;
}

/**
 * Builds the system instruction for code blocks
 */
export function buildCodeBlockSystemInstruction(language: string): string {
  const lang = (language || 'auto').trim();
  const commentInfo = getLanguageCommentInfo(lang);

  return `Você é um assistente de IA especialista em programação e edição de código, encarregado EXCLUSIVAMENTE deste bloco de código.
Seu universo de atuação é estritamente limitado ao código deste bloco.

DIRETRIZES DE SINTAXE E CÓDIGO:
- Respeite rigorosamente a sintaxe da linguagem "${lang}".
- Jamais coloque texto comum, markdown ou explicações soltas dentro do bloco de código.
- Se for escrever qualquer observação, explicação ou documentação dentro do código, use SEMPRE os comentários da linguagem (${commentInfo.syntaxGuide}).
- Forneça o código atualizado dentro de um bloco delimitado por \`\`\`${lang !== 'auto' ? lang : ''} ... \`\`\`.`;
}
