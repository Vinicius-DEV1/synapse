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
        [`body.${themeName} pre, body.${themeName} code, body.${themeName} kbd, body.${themeName} samp, body.${themeName} .courprogramlisting, body.${themeName} .pre, body.${themeName} .pre-ex, body.${themeName} .pre1, body.${themeName} .pre_w, body.${themeName} p.pre`]: {
          'background-color': `${colors.codeBg} !important`,
          'background': `${colors.codeBg} !important`,
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
        // Tables & Table Banners (Topic / Recipe / Tip)
        [`body.${themeName} table, body.${themeName} table.arr-recipe, body.${themeName} table.arr-tip, body.${themeName} tbody, body.${themeName} tr`]: {
          'background-color': 'transparent !important',
          'background': 'transparent !important',
          'border-color': `${colors.border} !important`
        },
        [`body.${themeName} table.arr-recipe td.arr-recipe-name, body.${themeName} table.arr-tip td.arr-tip-name`]: {
          'color': `${colors.heading} !important`,
          'background-color': 'transparent !important',
          'background': 'transparent !important'
        },
        [`body.${themeName} table.arr-recipe td.arr-recipe-number, body.${themeName} table.arr-tip td.arr-tip-number`]: {
          'color': '#ffffff !important'
        },
        [`body.${themeName} table.arr-recipe td.arr-recipe-number .topic-label`]: {
          'color': '#ffffff !important'
        },
        [`body.${themeName} thead`]: {
          'background-color': `${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'} !important`,
          'background': `${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'} !important`,
          'border-color': `${colors.border} !important`
        },
        [`body.${themeName} tbody tr:nth-child(even)`]: {
          'background-color': `${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'} !important`
        },
        [`body.${themeName} th`]: {
          'border': `1px solid ${colors.border} !important`,
          'color': `${colors.heading} !important`,
          'background-color': 'transparent !important'
        },
        [`body.${themeName} td`]: {
          'border': `1px solid ${colors.border} !important`,
          'color': `${colors.text} !important`,
          'background-color': 'transparent !important'
        },
        // Epigraphs & Opening Quotes
        [`body.${themeName} .epigraph, body.${themeName} div.epigraph`]: {
          'background-color': `${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'} !important`,
          'background': `${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'} !important`,
          'border': `1px solid ${colors.border} !important`,
          'color': `${colors.text} !important`,
          'border-radius': '8px !important'
        },
        [`body.${themeName} .epigraph p, body.${themeName} .epigraph span, body.${themeName} .epigraph .episignname`]: {
          'color': `${colors.text} !important`,
          'background-color': 'transparent !important'
        },
        // Callout boxes, Notes, Tips, Warnings, Sidebars
        [`body.${themeName} .note, body.${themeName} .note1, body.${themeName} .tip, body.${themeName} .warning, body.${themeName} .sidebar, body.${themeName} .sidebar1, body.${themeName} .boxg, body.${themeName} .authorq, body.${themeName} div.note, body.${themeName} div.sidebar, body.${themeName} div.tip, body.${themeName} div.warning, body.${themeName} div[class*="note"], body.${themeName} div[class*="sidebar"], body.${themeName} div[class*="tip"], body.${themeName} div[class*="warning"], body.${themeName} div[class*="box"]`]: {
          'background-color': `${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'} !important`,
          'background': `${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'} !important`,
          'border': `1px solid ${colors.border} !important`,
          'box-shadow': 'none !important',
          'color': `${colors.text} !important`,
          'border-radius': '6px !important'
        },
        [`body.${themeName} .note .title, body.${themeName} .note h3, body.${themeName} .tip .title, body.${themeName} .tip h3, body.${themeName} .warning .title, body.${themeName} .warning h3, body.${themeName} .boxg .title, body.${themeName} .sidebar1 .title, body.${themeName} div.authorq .the-author-asks`]: {
          'color': `${colors.heading} !important`,
          'text-shadow': 'none !important',
          'background-color': 'transparent !important'
        },
        // Captions
        [`body.${themeName} .FigCapt, body.${themeName} .TabCapt, body.${themeName} .caption, body.${themeName} .fig-caption, body.${themeName} .fig-title, body.${themeName} figcaption`]: {
          'color': `${colors.text} !important`,
          'opacity': '0.85 !important',
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
          'background-color': 'transparent !important',
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
            } catch (e: unknown) {
              console.debug('[useEpubTheme] Failed to remove annotation:', h.rects, e);
            }
          }
        });

        try {
          (rendition.annotations as unknown as { clear: () => void }).clear();
        } catch (e: unknown) {
          console.debug('[useEpubTheme] rendition.annotations.clear() not available or threw:', e);
        }
        
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
        } catch (e: unknown) {
          console.debug('[useEpubTheme] Failed to query or remove orphaned SVG highlights:', e);
        }
        
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
