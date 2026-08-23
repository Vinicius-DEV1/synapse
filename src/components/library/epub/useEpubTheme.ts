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
      
      const isDark = ['dark', 'midnight', 'nord', 'dim', 'high-contrast'].includes(readingMode);

      const getEpubThemeColors = (mode: string) => {
        switch (mode) {
          case 'dark':
            return {
              bg: '#1a1a2e',
              text: '#e5e7eb',
              heading: '#ffffff',
              link: '#60a5fa',
              border: 'rgba(255, 255, 255, 0.15)',
              codeBg: 'rgba(255, 255, 255, 0.08)',
              codeBorder: 'rgba(255, 255, 255, 0.12)',
              codeText: '#f8fafc',
            };
          case 'midnight':
            return {
              bg: '#0f172a',
              text: '#e2e8f0',
              heading: '#ffffff',
              link: '#60a5fa',
              border: 'rgba(255, 255, 255, 0.15)',
              codeBg: 'rgba(255, 255, 255, 0.08)',
              codeBorder: 'rgba(255, 255, 255, 0.12)',
              codeText: '#f8fafc',
            };
          case 'dim':
            return {
              bg: '#2d2d30',
              text: '#e8e8e8',
              heading: '#ffffff',
              link: '#64b5f6',
              border: 'rgba(255, 255, 255, 0.15)',
              codeBg: 'rgba(255, 255, 255, 0.08)',
              codeBorder: 'rgba(255, 255, 255, 0.12)',
              codeText: '#f8fafc',
            };
          case 'nord':
            return {
              bg: '#2e3440',
              text: '#eceff4',
              heading: '#ffffff',
              link: '#88c0d0',
              border: 'rgba(255, 255, 255, 0.15)',
              codeBg: 'rgba(255, 255, 255, 0.08)',
              codeBorder: 'rgba(255, 255, 255, 0.12)',
              codeText: '#f8fafc',
            };
          case 'high-contrast':
            return {
              bg: '#000000',
              text: '#ffffff',
              heading: '#ffffff',
              link: '#93c5fd',
              border: 'rgba(255, 255, 255, 0.3)',
              codeBg: 'rgba(255, 255, 255, 0.12)',
              codeBorder: 'rgba(255, 255, 255, 0.3)',
              codeText: '#ffffff',
            };
          case 'sepia':
            return {
              bg: '#f4ecd8',
              text: '#5b4636',
              heading: '#2d1f14',
              link: '#8b4513',
              border: 'rgba(91, 70, 54, 0.2)',
              codeBg: 'rgba(0, 0, 0, 0.05)',
              codeBorder: 'rgba(91, 70, 54, 0.15)',
              codeText: '#3d2e24',
            };
          case 'mint':
            return {
              bg: '#e8f5e9',
              text: '#1b4332',
              heading: '#0f2e22',
              link: '#2d6a4f',
              border: 'rgba(27, 67, 50, 0.2)',
              codeBg: 'rgba(0, 0, 0, 0.05)',
              codeBorder: 'rgba(27, 67, 50, 0.15)',
              codeText: '#133526',
            };
          case 'light':
          default:
            return {
              bg: '#ffffff',
              text: '#222222',
              heading: '#000000',
              link: '#2563eb',
              border: 'rgba(0, 0, 0, 0.12)',
              codeBg: 'rgba(0, 0, 0, 0.05)',
              codeBorder: 'rgba(0, 0, 0, 0.1)',
              codeText: '#111827',
            };
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
        },
        // Paragraphs & Structural Text
        [`body.${themeName} p, body.${themeName} div:not([class*="epubjs"]), body.${themeName} li, body.${themeName} dt, body.${themeName} dd, body.${themeName} section, body.${themeName} article`]: {
          'color': `${colors.text} !important`,
          'background-color': 'transparent !important'
        },
        // Headings
        [`body.${themeName} h1, body.${themeName} h2, body.${themeName} h3, body.${themeName} h4, body.${themeName} h5, body.${themeName} h6`]: {
          'color': `${colors.heading} !important`,
          'background-color': 'transparent !important'
        },
        // Links
        [`body.${themeName} a, body.${themeName} a:link, body.${themeName} a:visited`]: {
          'color': `${colors.link} !important`,
          'text-decoration': 'underline !important'
        },
        // Code Blocks & Inline Code
        [`body.${themeName} pre, body.${themeName} code, body.${themeName} kbd, body.${themeName} samp`]: {
          'background-color': `${colors.codeBg} !important`,
          'color': `${colors.codeText} !important`,
          'border': `1px solid ${colors.codeBorder} !important`,
          'border-radius': '4px !important',
          'font-family': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important'
        },
        [`body.${themeName} code, body.${themeName} kbd, body.${themeName} samp`]: {
          'padding': '0.15em 0.35em !important'
        },
        [`body.${themeName} pre`]: {
          'padding': '0.85em 1em !important',
          'overflow-x': 'auto !important'
        },
        // Blockquotes
        [`body.${themeName} blockquote`]: {
          'border-left': `3px solid ${colors.border} !important`,
          'padding-left': '1em !important',
          'margin-left': '0px !important',
          'color': `${colors.text} !important`,
          'opacity': '0.92 !important',
          'background-color': 'transparent !important'
        },
        // Tables
        [`body.${themeName} table`]: {
          'border-collapse': 'collapse !important',
          'border-color': `${colors.border} !important`,
          'color': `${colors.text} !important`
        },
        [`body.${themeName} th, body.${themeName} td`]: {
          'border': `1px solid ${colors.border} !important`,
          'color': `${colors.text} !important`,
          'background-color': 'transparent !important'
        },
        // Horizontal Rules
        [`body.${themeName} hr`]: {
          'border': 'none !important',
          'border-top': `1px solid ${colors.border} !important`,
          'margin': '1.5em 0 !important'
        },
        // Images & SVGs
        [`body.${themeName} img, body.${themeName} svg:not([class*="epubjs"])`]: {
          'max-width': '100% !important',
          'height': 'auto !important',
          'filter': isDark ? 'brightness(0.92)' : 'none'
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
        const isDark = ['dark', 'midnight', 'nord', 'dim', 'high-contrast'].includes(readingMode);
        
        highlights.forEach(h => {
          if (h.rects) {
            try {
              rendition.annotations.remove(h.rects, "highlight");
            } catch (e) {}
          }
        });

        try {
          (rendition.annotations as unknown as { clear: () => void }).clear();
        } catch (e) {}
        
        try {
          const contents = rendition.getContents();
          const contentsArray = Array.isArray(contents) ? contents : [contents];
          contentsArray.forEach((content: any) => {
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
              rendition.annotations.highlight(
                h.rects,
                {},
                (e: any) => {
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
                },
                undefined,
                {
                  fill: colorMap[h.color || 'yellow'],
                  'fill-opacity': isDark ? '0.38' : '0.3',
                  'mix-blend-mode': isDark ? 'normal' : 'multiply'
                }
              );
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
