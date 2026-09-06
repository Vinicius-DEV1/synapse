import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  stripMarkdownBlockquotes,
  unwrapBlockquoteTags,
} from './editorMarkdownHelper';

describe('editorMarkdownHelper', () => {
  it('returns empty string for empty or whitespace-only inputs', () => {
    expect(markdownToHtml('')).toBe('');
    expect(markdownToHtml('   ')).toBe('');
  });

  it('converts bold and italic markdown to strong and em tags', () => {
    const input = 'O **conceito** de *POO* é importante.';
    const result = markdownToHtml(input);
    expect(result).toContain('<strong>conceito</strong>');
    expect(result).toContain('<em>POO</em>');
  });

  it('converts ordered and unordered lists properly', () => {
    const ordered = '1. Classes\n2. Objetos';
    const orderedHtml = markdownToHtml(ordered);
    expect(orderedHtml).toContain('<ol>');
    expect(orderedHtml).toContain('<li>Classes</li>');
    expect(orderedHtml).toContain('<li>Objetos</li>');

    const unordered = '- Encapsulamento\n- Herança';
    const unorderedHtml = markdownToHtml(unordered);
    expect(unorderedHtml).toContain('<ul>');
    expect(unorderedHtml).toContain('<li>Encapsulamento</li>');
  });

  it('converts code blocks and inline code', () => {
    const input = 'Use `Carro` para criar instâncias:\n```python\nclass Carro:\n  pass\n```';
    const result = markdownToHtml(input);
    expect(result).toContain('<code>Carro</code>');
    expect(result).toContain('<pre><code class="language-python">class Carro:');
  });

  it('sanitizes dangerous scripts and iframes', () => {
    const dangerous = 'Texto <script>alert("xss")</script><iframe src="evil.com"></iframe>';
    const result = markdownToHtml(dangerous);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('Texto');
  });

  it('strips markdown blockquote indicators and callout banners', () => {
    const quoted = '> [!NOTE]\n> 🧩 O que é POO?\n> \n> A Programação Orientada a Objetos...\n> 1. Encapsulamento';
    const stripped = stripMarkdownBlockquotes(quoted);
    expect(stripped).not.toContain('> ');
    expect(stripped).not.toContain('[!NOTE]');
    expect(stripped).toContain('🧩 O que é POO?');
    expect(stripped).toContain('1. Encapsulamento');
  });

  it('unwraps blockquote and container tags from HTML to prevent nested blocks', () => {
    const htmlWithBq = '<blockquote><p>Conteúdo interno</p></blockquote>';
    const unwrapped = unwrapBlockquoteTags(htmlWithBq);
    expect(unwrapped).not.toContain('<blockquote>');
    expect(unwrapped).not.toContain('</blockquote>');
    expect(unwrapped).toContain('<p>Conteúdo interno</p>');

    const htmlWithToggle = '<div class="blockquote-toggle"><blockquote><p>Texto</p></blockquote></div>';
    const unwrappedToggle = unwrapBlockquoteTags(htmlWithToggle);
    expect(unwrappedToggle).not.toContain('blockquote-toggle');
    expect(unwrappedToggle).not.toContain('<blockquote>');
    expect(unwrappedToggle).toContain('<p>Texto</p>');
  });

  it('unwraps blockquotes automatically when unwrapBlockquotes option is enabled', () => {
    const input = '> 🧩 O que é POO?\n> \n> A Programação Orientada a Objetos...';
    const result = markdownToHtml(input, { unwrapBlockquotes: true });
    expect(result).not.toContain('<blockquote>');
    expect(result).not.toContain('</blockquote>');
    expect(result).toContain('<p>🧩 O que é POO?</p>');
  });
});

