/**
 * Manages visual drop indicator for block grouping zones.
 */

let indicator: HTMLDivElement | null = null;
const DROP_CURSOR_SUPPRESSOR = 'group-drop-active';

/**
 * Exibe a barra vertical de feedback visual na lateral esquerda ou direita do bloco alvo.
 */
export function showIndicator(rect: DOMRect, side: 'left' | 'right'): void {
  if (typeof document === 'undefined') return;

  if (!indicator) {
    indicator = document.createElement('div');
    Object.assign(indicator.style, {
      position: 'fixed',
      width: '5px',
      borderRadius: '3px',
      background: '#8b5cf6',
      boxShadow: '0 0 14px 3px rgba(139, 92, 246, 0.95)',
      zIndex: '9999',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(indicator);
  }

  document.body.classList.add(DROP_CURSOR_SUPPRESSOR);
  indicator.style.left = `${side === 'left' ? Math.max(0, rect.left - 4) : Math.max(0, rect.right - 1)}px`;
  indicator.style.top = `${rect.top}px`;
  indicator.style.height = `${Math.max(rect.height, 32)}px`;
}

/**
 * Hides and removes grouping indicator from DOM.
 */
export function hideIndicator(): void {
  if (typeof document === 'undefined') return;
  indicator?.remove();
  indicator = null;
  document.body.classList.remove(DROP_CURSOR_SUPPRESSOR);
}
