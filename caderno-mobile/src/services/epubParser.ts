import { unzipSync } from 'fflate';

export interface EpubChapter {
  id: string;
  title: string;
  content: string; // Plain text or lightweight markdown parsed from chapter HTML
  href: string;
}

export interface ParsedEpub {
  title: string;
  creator: string;
  chapters: EpubChapter[];
  coverBase64?: string;
}

function cleanHtmlToText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Replace paragraph and break tags with newlines
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '• ');
  
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Normalize whitespace
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function isPdfBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

export function isEpubBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = new Uint8Array(buffer);
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04; // PK\x03\x04
}

export function parseEpubBuffer(buffer: ArrayBuffer): ParsedEpub {
  const bytes = new Uint8Array(buffer);
  
  if (isPdfBuffer(bytes)) {
    throw new Error('O arquivo selecionado é um PDF (não é um EPUB).');
  }

  const unzipped = unzipSync(bytes);

  let title = 'Livro Sem Título';
  let creator = 'Autor Desconhecido';
  const chapters: EpubChapter[] = [];

  // Find container.xml to locate OPF file
  const containerFile = unzipped['META-INF/container.xml'];
  let opfPath = '';

  if (containerFile) {
    const containerStr = new TextDecoder('utf-8').decode(containerFile);
    const fullPathMatch = containerStr.match(/full-path="([^"]+)"/);
    if (fullPathMatch) {
      opfPath = fullPathMatch[1];
    }
  }

  // Fallback: search for any .opf file
  if (!opfPath) {
    const opfKey = Object.keys(unzipped).find((k) => k.endsWith('.opf'));
    if (opfKey) opfPath = opfKey;
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  if (opfPath && unzipped[opfPath]) {
    const opfStr = new TextDecoder('utf-8').decode(unzipped[opfPath]);
    
    // Extract metadata
    const titleMatch = opfStr.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const creatorMatch = opfStr.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
    if (creatorMatch) creator = creatorMatch[1].trim();

    // Extract manifest items
    const manifestMap = new Map<string, string>();
    const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/gi;
    let match;
    while ((match = itemRegex.exec(opfStr)) !== null) {
      manifestMap.set(match[1], match[2]);
    }

    // Extract spine order
    const spineRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*>/gi;
    let spineIndex = 0;
    while ((match = spineRegex.exec(opfStr)) !== null) {
      const idref = match[1];
      const href = manifestMap.get(idref);
      if (href && (href.endsWith('.html') || href.endsWith('.xhtml') || href.endsWith('.htm'))) {
        const fullHref = opfDir + href;
        const fileData = unzipped[fullHref] || unzipped[href];
        if (fileData) {
          const htmlContent = new TextDecoder('utf-8').decode(fileData);
          const cleanText = cleanHtmlToText(htmlContent);
          
          if (cleanText.length > 0) {
            // Extract chapter title from <h1> or <title>
            const chapterTitleMatch = htmlContent.match(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/i) ||
                                      htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
            const chapterTitle = chapterTitleMatch ? chapterTitleMatch[1].trim() : `Capítulo ${spineIndex + 1}`;

            chapters.push({
              id: idref,
              title: chapterTitle,
              content: cleanText,
              href: fullHref,
            });
            spineIndex++;
          }
        }
      }
    }
  }

  // If spine parsing produced nothing, fallback to listing any html/xhtml files
  if (chapters.length === 0) {
    let index = 1;
    for (const [path, data] of Object.entries(unzipped)) {
      if (path.endsWith('.html') || path.endsWith('.xhtml') || path.endsWith('.htm')) {
        const html = new TextDecoder('utf-8').decode(data);
        const text = cleanHtmlToText(html);
        if (text.length > 20) {
          chapters.push({
            id: `ch_${index}`,
            title: `Capítulo ${index}`,
            content: text,
            href: path,
          });
          index++;
        }
      }
    }
  }

  return {
    title,
    creator,
    chapters,
  };
}
