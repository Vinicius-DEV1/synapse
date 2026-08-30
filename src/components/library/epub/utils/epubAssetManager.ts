export const normalizeRelativePath = (baseFile: string, relativePath: string): string => {
  const stack = baseFile.split('/').filter(Boolean);
  if (!baseFile.endsWith('/')) {
    stack.pop(); // remove file to get directory
  }
  const parts = relativePath.split('/').filter(Boolean);
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
};

export const getZipEntry = (epubBook: any, cleanPath: string, basePath?: string) => {
  const archive = epubBook?.archive;
  const zip = archive?.zip;
  if (!zip) return null;

  let zipEntry: any = null;
  const filename = cleanPath.split('/').pop() || cleanPath;

  if (basePath) {
    const canonical = normalizeRelativePath(basePath, cleanPath);
    zipEntry = zip.file(canonical);
    if (!zipEntry && zip.files) {
      const lowerCanonical = canonical.toLowerCase();
      const matchedFile = Object.keys(zip.files).find(f => f.toLowerCase() === lowerCanonical);
      if (matchedFile) zipEntry = zip.file(matchedFile);
    }
  }

  if (!zipEntry) {
    const normalized = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    zipEntry = zip.file(normalized);
    if (!zipEntry && zip.files) {
      const lowerNorm = normalized.toLowerCase();
      const matchedFile = Object.keys(zip.files).find(f => f.toLowerCase() === lowerNorm);
      if (matchedFile) zipEntry = zip.file(matchedFile);
    }
  }

  if (!zipEntry && zip.files) {
    const lowerFilename = filename.toLowerCase();
    const match = Object.keys(zip.files).find(
      f => f.toLowerCase() === lowerFilename || f.toLowerCase().endsWith('/' + lowerFilename)
    );
    if (match) zipEntry = zip.file(match);
  }

  return zipEntry;
};

export const getMimeType = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'svg': return 'image/svg+xml';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'ttf': return 'font/ttf';
    case 'otf': return 'font/otf';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'css': return 'text/css';
    default: return 'application/octet-stream';
  }
};

export const processCssText = async (epubBook: any, cssText: string, cssBasePath: string): Promise<string> => {
  const cssUrlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
  const matches = Array.from(cssText.matchAll(cssUrlRegex));
  
  for (const match of matches) {
    const url = match[1];
    if (url.startsWith('data:') || url.startsWith('http')) continue;
    
    const cleanPath = url.split('?')[0].split('#')[0];
    const zipEntry = getZipEntry(epubBook, cleanPath, cssBasePath);
    if (zipEntry) {
      try {
        const base64Data = await zipEntry.async('base64');
        const mime = getMimeType(cleanPath);
        const dataUrl = `data:${mime};base64,${base64Data}`;
        cssText = cssText.replace(match[0], `url("${dataUrl}")`);
      } catch (e) {
        console.warn('[EpubLoader] Failed to embed CSS asset:', url, e);
      }
    }
  }
  return cssText;
};

export const createAssetEmbedder = (epubBook: any) => {
  const assetBase64Cache = new Map<string, string>();

  const embedAssetsAsDataUrls = async (doc: Document, sectionUrl?: string) => {
    if (!doc) return;

    // 1. Process inline <style> blocks
    const styleTags = doc.querySelectorAll('style');
    for (const style of Array.from(styleTags)) {
      if (style.textContent) {
        style.textContent = await processCssText(epubBook, style.textContent, sectionUrl || '');
      }
    }

    // 2. Process <link rel="stylesheet">
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('data:')) continue;

      const cleanPath = href.split('?')[0].split('#')[0];
      const zipEntry = getZipEntry(epubBook, cleanPath, sectionUrl);
      if (zipEntry) {
        try {
          let cssText = await zipEntry.async('text');
          const cssCanonicalBase = normalizeRelativePath(sectionUrl || '', cleanPath);
          cssText = await processCssText(epubBook, cssText, cssCanonicalBase);
          
          const styleEl = doc.createElement('style');
          styleEl.textContent = cssText;
          if (link.id) styleEl.id = link.id;
          if (link.className) styleEl.className = link.className;
          
          link.parentNode?.replaceChild(styleEl, link);
        } catch (e) {
          console.warn('[EpubLoader] Failed to embed stylesheet:', href, e);
        }
      }
    }

    // 3. Process <img> and <image>
    const images = doc.querySelectorAll('img, image');
    for (const img of Array.from(images)) {
      const isSvgImage = img.tagName.toLowerCase() === 'image';
      const rawSrc = isSvgImage
        ? (img.getAttribute('xlink:href') || img.getAttribute('href'))
        : (img.getAttribute('src') || (img as HTMLImageElement).src);

      if (!rawSrc || rawSrc.startsWith('data:')) continue;
      const originalPath = (img as HTMLImageElement).dataset?.src || img.getAttribute('src') || rawSrc;

      if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
        try {
          const parsed = new URL(originalPath);
          if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.localhost')) continue;
        } catch {}
      }

      if (assetBase64Cache.has(originalPath)) {
        const cachedData = assetBase64Cache.get(originalPath)!;
        if (isSvgImage) {
          img.setAttribute('href', cachedData);
          img.setAttribute('xlink:href', cachedData);
        } else {
          const newImg = doc.createElement('img');
          Array.from(img.attributes).forEach(attr => newImg.setAttribute(attr.name, attr.value));
          newImg.src = cachedData;
          img.parentNode?.replaceChild(newImg, img);
        }
        continue;
      }

      try {
        let cleanPath = originalPath.split('?')[0].split('#')[0];
        if (cleanPath.startsWith('http')) {
          try {
            cleanPath = new URL(cleanPath).pathname;
            if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
          } catch {}
        }

        const zipEntry = getZipEntry(epubBook, cleanPath, sectionUrl);
        if (zipEntry) {
          const base64Data = await zipEntry.async('base64');
          const mime = getMimeType(cleanPath);
          const dataUrl = `data:${mime};base64,${base64Data}`;
          assetBase64Cache.set(originalPath, dataUrl);

          if (isSvgImage) {
            img.setAttribute('href', dataUrl);
            img.setAttribute('xlink:href', dataUrl);
          } else {
            const newImg = doc.createElement('img');
            Array.from(img.attributes).forEach(attr => newImg.setAttribute(attr.name, attr.value));
            newImg.src = dataUrl;
            img.parentNode?.replaceChild(newImg, img);
          }
        }
      } catch (err) {
        console.warn('[EpubLoader] Failed to embed image:', originalPath, err);
      }
    }
  };

  return { embedAssetsAsDataUrls };
};
