import { describe, it, expect, vi } from 'vitest';
import { normalizeRelativePath, getMimeType, createAssetEmbedder } from './epubAssetManager';

describe('epubAssetManager', () => {
  it('normalizes relative paths correctly', () => {
    expect(normalizeRelativePath('OEBPS/Text/ch1.xhtml', '../Styles/main.css')).toBe('OEBPS/Styles/main.css');
    expect(normalizeRelativePath('OEBPS/Text/ch1.xhtml', './img.png')).toBe('OEBPS/Text/img.png');
    expect(normalizeRelativePath('root.xhtml', 'sub/ch1.xhtml')).toBe('sub/ch1.xhtml');
  });

  it('maps file extensions to correct mime types', () => {
    expect(getMimeType('image.png')).toBe('image/png');
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('vector.svg')).toBe('image/svg+xml');
    expect(getMimeType('style.css')).toBe('text/css');
    expect(getMimeType('font.woff2')).toBe('font/woff2');
  });

  it('removes embedded Content-Security-Policy meta tags from document', async () => {
    const fakeBook = {
      archive: {
        zip: {
          file: vi.fn().mockReturnValue(null),
          files: {},
        },
      },
    };
    const embedder = createAssetEmbedder(fakeBook);

    const doc = document.implementation.createHTMLDocument('Test Document');
    const cspMeta = doc.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    cspMeta.setAttribute('content', "default-src 'self'");
    doc.head.appendChild(cspMeta);

    const webkitCspMeta = doc.createElement('meta');
    webkitCspMeta.setAttribute('http-equiv', 'X-WebKit-CSP');
    webkitCspMeta.setAttribute('content', "style-src 'none'");
    doc.head.appendChild(webkitCspMeta);

    const normalMeta = doc.createElement('meta');
    normalMeta.setAttribute('name', 'author');
    normalMeta.setAttribute('content', 'Author Name');
    doc.head.appendChild(normalMeta);

    expect(doc.querySelectorAll('meta').length).toBe(3);

    await embedder.embedAssetsAsDataUrls(doc, 'OEBPS/Text/chapter.xhtml');

    // CSP meta tags should be stripped, author meta preserved
    expect(doc.querySelectorAll('meta[http-equiv*="content-security-policy" i]').length).toBe(0);
    expect(doc.querySelectorAll('meta[http-equiv*="x-webkit-csp" i]').length).toBe(0);
    expect(doc.querySelectorAll('meta').length).toBe(1);
    expect(doc.querySelector('meta[name="author"]')).not.toBeNull();
  });
});
