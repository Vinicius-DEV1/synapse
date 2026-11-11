import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import CodeBlockComponent from './CodeBlockComponent';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="code-block-wrapper" className={className}>
      {children}
    </div>
  ),
  NodeViewContent: ({ as: Tag = 'div', className }: { as?: string; className?: string }) => (
    <Tag data-testid="code-block-content" className={className} />
  ),
}));

describe('CodeBlockComponent', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: { language: 'typescript' },
        textContent: 'console.log("hello world");',
        nodeSize: 20,
      },
      updateAttributes: vi.fn(),
      extension: {
        options: {
          lowlight: {
            listLanguages: () => ['javascript', 'typescript', 'python'],
          },
        },
      },
      editor: {
        view: {},
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            insertContentAt: vi.fn(() => ({
              run: vi.fn(),
            })),
          })),
        })),
      },
      getPos: vi.fn(() => 10),
      deleteNode: vi.fn(),
    };
  });

  it('renders language selector and copy button', () => {
    const { getByText, getByRole } = render(<CodeBlockComponent {...mockProps} />);

    expect(getByText('Copiar')).toBeDefined();
    const select = getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('typescript');
  });

  it('forwards vertical wheel scroll directly to parent scroll container', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'page-view-scroll';
    scrollContainer.className = 'overflow-y-auto';
    scrollContainer.scrollTop = 50;
    document.body.appendChild(scrollContainer);

    const { container } = render(<CodeBlockComponent {...mockProps} />, {
      container: scrollContainer,
    });

    const pre = container.querySelector('pre');
    expect(pre).toBeDefined();

    if (pre) {
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        deltaX: 0,
        bubbles: true,
        cancelable: true,
      });

      pre.dispatchEvent(wheelEvent);

      // Parent container scrollTop should have advanced by deltaY
      expect(scrollContainer.scrollTop).toBe(150);
      expect(wheelEvent.defaultPrevented).toBe(true);
    }

    document.body.removeChild(scrollContainer);
  });

  it('handles Shift + wheel as horizontal scrolling on pre element', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'page-view-scroll';
    document.body.appendChild(scrollContainer);

    const { container } = render(<CodeBlockComponent {...mockProps} />, {
      container: scrollContainer,
    });

    const pre = container.querySelector('pre');
    expect(pre).toBeDefined();

    if (pre) {
      // Mock scrollWidth > clientWidth
      Object.defineProperty(pre, 'scrollWidth', { value: 500, configurable: true });
      Object.defineProperty(pre, 'clientWidth', { value: 200, configurable: true });
      pre.scrollLeft = 0;

      const shiftWheelEvent = new WheelEvent('wheel', {
        deltaY: 50,
        deltaX: 0,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });

      pre.dispatchEvent(shiftWheelEvent);

      // Should scroll horizontally instead of affecting parent vertical scrollTop
      expect(pre.scrollLeft).toBe(50);
      expect(scrollContainer.scrollTop).toBe(0);
    }

    document.body.removeChild(scrollContainer);
  });
});
