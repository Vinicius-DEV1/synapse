import { useEffect } from 'react';
import { useEpub } from './EpubContext';

export function useEpubTheme(
  globalLastHighlightClickRef: React.MutableRefObject<number>,
  clearSelectionTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
) {
  const {
    rendition, fontSize, fontFamily, readingMode, highlights, setSelection, setNoteMode, setNoteText
  } = useEpub();

  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
      const font = fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : 'Inter, sans-serif';
      
      const getEpubThemeColors = (mode: string) => {
        switch (mode) {
          case 'dark': return { bg: '#1a1a2e', text: '#d1d5db' };
          case 'midnight': return { bg: '#0f172a', text: '#94a3b8' };
          case 'dim': return { bg: '#2d2d30', text: '#e0e0e0' };
          case 'nord': return { bg: '#2e3440', text: '#d8dee9' };
          case 'high-contrast': return { bg: '#000000', text: '#ffffff' };
          case 'sepia': return { bg: '#f4ecd8', text: '#5b4636' };
          case 'mint': return { bg: '#e8f5e9', text: '#1b4332' };
          case 'light':
          default: return { bg: '#ffffff', text: '#333333' };
        }
      };

      const colors = getEpubThemeColors(readingMode);
      
      const themeName = `custom-${readingMode}-${fontFamily}`;
      
      const isMobileView = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const bottomPadding = isMobileView ? '60px' : '16px';

      const themeCss: any = {
        [`body.${themeName}`]: { 
          'background': `${colors.bg} !important`, 
          'color': `${colors.text} !important`,
          'padding-bottom': `${bottomPadding} !important`,
          'padding-left': `20px !important`,
          'padding-right': `20px !important`,
          'margin-bottom': `0px !important`
        },
        [`.${themeName} body`]: { 
          'background': `${colors.bg} !important`, 
          'color': `${colors.text} !important`,
          'padding-bottom': `${bottomPadding} !important`,
          'padding-left': `20px !important`,
          'padding-right': `20px !important`,
          'margin-bottom': `0px !important`
        }
      };

      if (fontFamily !== 'original') {
        themeCss[`body.${themeName}`]['font-family'] = `${font} !important`;
        themeCss[`.${themeName} body`]['font-family'] = `${font} !important`;
        themeCss[`body.${themeName} *`] = { 'font-family': `${font} !important` };
        themeCss[`.${themeName} body *`] = { 'font-family': `${font} !important` };
      }
          
      rendition.themes.register(themeName, themeCss);
      rendition.themes.select(themeName);
    }
    
      const timer = setTimeout(() => {
        if (rendition && highlights) {
          const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
          
          highlights.forEach(h => {
             if (h.rects) {
               try {
                  rendition.annotations.remove(h.rects, "highlight");
               } catch (e) {}
             }
          });

          try {
            rendition.annotations.clear();
          } catch (e) {
            // Ignore if there are no annotations to clear or view isn't ready
          }
          
          try {
            rendition.getContents().forEach((content: any) => {
              const doc = content.document;
              if (doc) {
                const orphanedHighlights = doc.querySelectorAll('svg[class*="epubjs-hl"], svg[class*="epubjs-annotation"]');
                orphanedHighlights.forEach((node: Element) => node.remove());
              }
            });
          } catch (e) {}
          
          highlights.forEach(h => {
            if (h.rects) {
              try {
                rendition.annotations.highlight(h.rects, {}, (e: any) => {
                  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                  if (e && typeof e.preventDefault === 'function') e.preventDefault();
                  globalLastHighlightClickRef.current = Date.now();
                  if (clearSelectionTimerRef.current) {
                    clearTimeout(clearSelectionTimerRef.current);
                    clearSelectionTimerRef.current = null;
                  }
                  const rawRect = e.target.getBoundingClientRect();
                  let offsetX = 0; let offsetY = 0;
                  const iframe = e.target.ownerDocument?.defaultView?.frameElement;
                  if (iframe) {
                      const iframeRect = iframe.getBoundingClientRect();
                      offsetX = iframeRect.left;
                      offsetY = iframeRect.top;
                  }
                  const rect = {
                      top: rawRect.top + offsetY, left: rawRect.left + offsetX,
                      bottom: rawRect.bottom + offsetY, right: rawRect.right + offsetX,
                      x: rawRect.x + offsetX, y: rawRect.y + offsetY,
                      width: rawRect.width, height: rawRect.height,
                      toJSON: rawRect.toJSON
                  } as DOMRect;
                  const contextText = e.target.parentNode?.textContent?.trim() || h.text_content;
                  setSelection({ cfiRange: h.rects, text: h.text_content, rect, existingHighlightId: h.id, context: contextText });
                  setNoteMode(h.color || 'yellow');
                  setNoteText(h.note || '');
                }, undefined, { fill: colorMap[h.color || 'yellow'], 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' });
              } catch (err) {
                console.warn("EpubJS highlight error for", h.rects, err);
              }
            }
          });
        }
      }, 800);

    return () => clearTimeout(timer);
  }, [fontSize, fontFamily, readingMode, rendition, highlights, setSelection, setNoteMode, setNoteText, globalLastHighlightClickRef, clearSelectionTimerRef]);
}
