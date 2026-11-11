import { describe, it, expect } from 'vitest';
import {
  getLanguageCommentInfo,
  buildCodeBlockRules,
  buildCodeBlockSystemInstruction,
} from './codeBlockSyntaxHelper';

describe('codeBlockSyntaxHelper', () => {
  it('identifies C-style comment syntax for JS, TS, Java, Rust, Go', () => {
    const ts = getLanguageCommentInfo('typescript');
    expect(ts.lineComment).toBe('//');
    expect(ts.blockComment?.start).toBe('/*');
    expect(ts.syntaxGuide).toContain('//');

    const rust = getLanguageCommentInfo('rust');
    expect(rust.lineComment).toBe('//');

    const cpp = getLanguageCommentInfo('c++');
    expect(cpp.lineComment).toBe('//');
  });

  it('identifies hash comment syntax for Python, Bash, Ruby, YAML', () => {
    const py = getLanguageCommentInfo('python');
    expect(py.lineComment).toBe('#');
    expect(py.syntaxGuide).toContain('#');

    const bash = getLanguageCommentInfo('bash');
    expect(bash.lineComment).toBe('#');

    const yaml = getLanguageCommentInfo('yaml');
    expect(yaml.lineComment).toBe('#');
  });

  it('identifies SQL comment syntax', () => {
    const sql = getLanguageCommentInfo('sql');
    expect(sql.lineComment).toBe('--');
    expect(sql.syntaxGuide).toContain('--');
  });

  it('identifies HTML comment syntax', () => {
    const html = getLanguageCommentInfo('html');
    expect(html.blockComment?.start).toBe('<!--');
    expect(html.syntaxGuide).toContain('<!-- ... -->');
  });

  it('identifies CSS comment syntax', () => {
    const css = getLanguageCommentInfo('css');
    expect(css.blockComment?.start).toBe('/*');
    expect(css.syntaxGuide).toContain('/* ... */');
  });

  it('identifies JSON comment limitations', () => {
    const json = getLanguageCommentInfo('json');
    expect(json.supportsComments).toBe(false);
    expect(json.syntaxGuide).toContain('NÃO suporta comentários');
  });

  it('builds code block rules with strict bounding, language comments, and syntax mandates', () => {
    const rules = buildCodeBlockRules('python', 'def foo():\n    pass');
    expect(rules).toContain('Linguagem: python');
    expect(rules).toContain('Guia de Comentários: Use comentários iniciando com "#".');
    expect(rules).toContain('RESPEITO RIGOROSO À SINTAXE');
    expect(rules).toContain('NUNCA INSERIR TEXTO OU MARKDOWN DENTRO DO CÓDIGO');
    expect(rules).toContain('COMENTÁRIOS OBRIGATÓRIOS DA LINGUAGEM');
    expect(rules).toContain('def foo():');
  });

  it('builds system instruction for code block AI', () => {
    const sysInstruction = buildCodeBlockSystemInstruction('typescript');
    expect(sysInstruction).toContain('linguagem "typescript"');
    expect(sysInstruction).toContain('Jamais coloque texto comum, markdown ou explicações soltas');
    expect(sysInstruction).toContain('use SEMPRE os comentários da linguagem');
  });
});
