import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './editorMarkdownHelper';

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

  it('converts blockquotes when present in markdown', () => {
    const input = '> Uma citação relevante ou nota importante.';
    const result = markdownToHtml(input);
    expect(result).toContain('<blockquote>');
    expect(result).toContain('Uma citação relevante ou nota importante.');
    expect(result).toContain('</blockquote>');
  });

  it('sanitizes dangerous scripts and iframes', () => {
    const dangerous = 'Texto <script>alert("xss")</script><iframe src="evil.com"></iframe>';
    const result = markdownToHtml(dangerous);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('<iframe');
    expect(result).toContain('Texto');
  });
});

