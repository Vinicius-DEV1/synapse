import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React, { createRef } from 'react';
import { TextPreviewer } from './TextPreviewer';

describe('TextPreviewer Markdown Reader', () => {
  it('renders markdown code blocks and forwards vertical wheel scroll to parent scroll container', () => {
    const scrollContainerRef = createRef<HTMLDivElement>();

    const markdownWithCode = `
# Título do Documento

Parágrafo explicativo.

\`\`\`csharp
public class CalculadoraDeDesconto
{
    public decimal Calcular(string tipoCliente, decimal valor)
    {
        return valor;
    }
}
\`\`\`
    `.trim();

    const { container } = render(
      <TextPreviewer
        textContent={markdownWithCode}
        isMd={true}
        viewMode="rendered"
        darkMode={true}
        scrollContainerRef={scrollContainerRef}
        onScroll={vi.fn()}
      />
    );

    const scrollContainer = scrollContainerRef.current;
    expect(scrollContainer).toBeDefined();
    if (scrollContainer) {
      scrollContainer.scrollTop = 100;

      const pre = container.querySelector('pre');
      expect(pre).toBeDefined();

      if (pre) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 75,
          deltaX: 0,
          bubbles: true,
          cancelable: true,
        });

        pre.dispatchEvent(wheelEvent);

        // Vertical scroll should have been forwarded to scrollContainer
        expect(scrollContainer.scrollTop).toBe(175);
        expect(wheelEvent.defaultPrevented).toBe(true);
      }
    }
  });

  it('translates Shift + vertical wheel on wide code block to horizontal scroll', () => {
    const scrollContainerRef = createRef<HTMLDivElement>();

    const markdownWithCode = `
\`\`\`javascript
const veryLongLine = "This is a very long code line that exceeds normal viewport widths and requires horizontal scrolling to inspect";
\`\`\`
    `.trim();

    const { container } = render(
      <TextPreviewer
        textContent={markdownWithCode}
        isMd={true}
        viewMode="rendered"
        darkMode={true}
        scrollContainerRef={scrollContainerRef}
        onScroll={vi.fn()}
      />
    );

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = 50;

      const pre = container.querySelector('pre');
      expect(pre).toBeDefined();

      if (pre) {
        Object.defineProperty(pre, 'scrollWidth', { value: 800, configurable: true });
        Object.defineProperty(pre, 'clientWidth', { value: 300, configurable: true });
        pre.scrollLeft = 0;

        const shiftWheelEvent = new WheelEvent('wheel', {
          deltaY: 50,
          deltaX: 0,
          shiftKey: true,
          cancelable: true,
        });

        pre.dispatchEvent(shiftWheelEvent);

        expect(pre.scrollLeft).toBe(50);
        expect(shiftWheelEvent.defaultPrevented).toBe(true);
        // Vertical container should not have moved
        expect(scrollContainer.scrollTop).toBe(50);
      }
    }
  });

  it('forwards vertical wheel scroll over markdown tables', () => {
    const scrollContainerRef = createRef<HTMLDivElement>();

    const markdownWithTable = `
| Coluna A | Coluna B |
| -------- | -------- |
| Valor 1  | Valor 2  |
    `.trim();

    const { container } = render(
      <TextPreviewer
        textContent={markdownWithTable}
        isMd={true}
        viewMode="rendered"
        darkMode={true}
        scrollContainerRef={scrollContainerRef}
        onScroll={vi.fn()}
      />
    );

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop = 200;

      const tableWrapper = container.querySelector('table')?.closest('div');
      expect(tableWrapper).toBeDefined();

      if (tableWrapper) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 60,
          deltaX: 0,
          bubbles: true,
          cancelable: true,
        });

        tableWrapper.dispatchEvent(wheelEvent);

        expect(scrollContainer.scrollTop).toBe(260);
        expect(wheelEvent.defaultPrevented).toBe(true);
      }
    }
  });
});
