import { describe, it, expect } from 'vitest';
import { distillHtmlContent } from './linkContentDistiller';

describe('linkContentDistiller', () => {
  it('strips scripts, styles, cookie banners and ads while preserving article content', () => {
    const rawHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guia Completo de TypeScript</title>
          <meta property="og:title" content="Guia Completo de TypeScript - 2026" />
          <meta property="og:image" content="https://example.com/cover.png" />
          <style>body { font-size: 16px; }</style>
          <script>console.log('tracker');</script>
        </head>
        <body>
          <div class="cookie-banner">Aceite os cookies para continuar</div>
          <header><nav><a href="/">Home</a></nav></header>
          <div class="advert-sidebar">Compre agora nosso produto!</div>
          
          <article>
            <h1>Introdução aos Tipos Avançados</h1>
            <p>O TypeScript oferece um sistema de tipos estrutural poderoso com uniões discriminadas.</p>
            <figure>
              <img src="https://example.com/diagram.png" alt="Fluxo de Tipos" />
              <figcaption>Diagrama de Narrowing de Tipos</figcaption>
            </figure>
            <p>Com type guards, o compilador refina tipos automaticamente.</p>
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560"></iframe>
            <a href="https://github.com/microsoft/TypeScript">Repositório Oficial no GitHub</a>
          </article>

          <footer>Copyright 2026</footer>
        </body>
      </html>
    `;

    const result = distillHtmlContent(rawHtml, 'https://example.com/article');

    expect(result.title).toBe('Guia Completo de TypeScript - 2026');
    expect(result.cleanText).toContain('Introdução aos Tipos Avançados');
    expect(result.cleanText).toContain('O TypeScript oferece um sistema de tipos estrutural poderoso');
    expect(result.cleanText).not.toContain('Aceite os cookies');
    expect(result.cleanText).not.toContain('Compre agora nosso produto');
    expect(result.cleanText).not.toContain('console.log');

    // Video detection
    expect(result.embeddedYouTubeVideoIds).toContain('dQw4w9WgXcQ');

    // Key image detection
    expect(result.keyImages.some((img) => img.src === 'https://example.com/cover.png')).toBe(true);
    expect(result.keyImages.some((img) => img.src === 'https://example.com/diagram.png')).toBe(true);

    // Outbound link detection
    expect(result.keyOutboundLinks.some((l) => l.href === 'https://github.com/microsoft/TypeScript')).toBe(true);
  });

  it('handles empty or malformed HTML gracefully', () => {
    const result = distillHtmlContent('');
    expect(result.title).toBe('');
    expect(result.cleanText).toBe('');
    expect(result.embeddedYouTubeVideoIds).toEqual([]);
    expect(result.wordCount).toBe(0);
  });
});
