import React, { useState, useEffect } from 'react';

export const ImageRenderer = React.memo(({ cacheItem }: { cacheItem: any }) => {
  const [url, setUrl] = useState<string>('');
  
  useEffect(() => {
    if (!cacheItem) return;
    const blob = new Blob([cacheItem.data], { type: cacheItem.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [cacheItem]);
  
  if (!url) return null;
  return (
    <img
      src={url}
      loading="lazy"
      decoding="async"
      className="max-w-full rounded-lg my-2 max-h-64 object-contain shadow-lg border border-white/10"
      alt="Anexo"
    />
  );
});
ImageRenderer.displayName = 'ImageRenderer';

export const DescriptionRenderer = React.memo(({ text }: { text: string }) => {
  const [elements, setElements] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    
    const parse = async () => {
      if (!text) {
        setElements([]);
        return;
      }
      
      const parts = text.split(/(\!\[image\]\([a-zA-Z0-9_]+\))/g);
      const newEls = await Promise.all(parts.map(async (part, i) => {
        const match = part.match(/\!\[image\]\(([a-zA-Z0-9_]+)\)/);
        if (match && window.api?.imageCache) {
          try {
            const cacheItem = await window.api.imageCache.get(match[1]);
            if (cacheItem) {
              return <ImageRenderer key={`img-${i}`} cacheItem={cacheItem} />;
            }
          } catch(e) {
            console.error('Failed to load image from cache', e);
          }
        }
        return <span key={`text-${i}`} className="whitespace-pre-wrap">{part}</span>;
      }));
      
      if (isMounted) setElements(newEls);
    };
    
    parse();
    return () => { isMounted = false; };
  }, [text]);
  
  return <div className="text-sm text-dark-subtext mt-4 leading-relaxed">{elements}</div>;
});
DescriptionRenderer.displayName = 'DescriptionRenderer';
