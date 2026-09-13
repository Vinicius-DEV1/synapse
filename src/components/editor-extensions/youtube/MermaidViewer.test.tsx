import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MermaidViewer from './MermaidViewer';

// Mock dynamic import('mermaid')
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg data-testid="mock-mermaid-svg"><g>Test Node</g></svg>',
    }),
  },
}));

vi.mock('../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('MermaidViewer', () => {
  const sampleChart = `graph TD
    A[Início] --> B[Processo]
    B --> C[Fim]`;

  it('renders loading state initially and then renders SVG diagram', async () => {
    const { container } = render(<MermaidViewer chart={sampleChart} />);

    expect(screen.getByText(/renderizando diagrama/i)).toBeInTheDocument();

    await waitFor(() => {
      const svg = container.querySelector('[data-testid="mock-mermaid-svg"]');
      expect(svg).toBeInTheDocument();
    });

    expect(screen.getByText(/diagrama conceitual \(mermaid\)/i)).toBeInTheDocument();
  });

  it('toggles to source code view when clicking Código button', async () => {
    render(<MermaidViewer chart={sampleChart} />);

    await waitFor(() => {
      expect(screen.getByText('Código')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Código'));

    expect(screen.getByText(/A\[Início\] --> B\[Processo\]/)).toBeInTheDocument();
    expect(screen.getByText('Ver Diagrama')).toBeInTheDocument();

    // Toggle back
    fireEvent.click(screen.getByText('Ver Diagrama'));
    expect(screen.getByText('Código')).toBeInTheDocument();
  });

  it('handles zoom controls and opens fullscreen modal', async () => {
    render(<MermaidViewer chart={sampleChart} />);

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    const zoomInBtn = screen.getByTitle(/Aumentar Zoom/i);
    const zoomOutBtn = screen.getByTitle(/Diminuir Zoom/i);
    const resetZoomBtn = screen.getByTitle(/Resetar Zoom/i);

    fireEvent.click(zoomInBtn);
    expect(screen.getByText('115%')).toBeInTheDocument();

    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(resetZoomBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Click Expand to open fullscreen modal
    const expandBtn = screen.getByTitle(/Expandir diagrama em tela cheia/i);
    fireEvent.click(expandBtn);

    expect(screen.getByText('Diagrama Conceitual em Tela Cheia')).toBeInTheDocument();
    expect(screen.getByText(/Arraste para mover/i)).toBeInTheDocument();

    // Close fullscreen modal via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Diagrama Conceitual em Tela Cheia')).toBeNull();
  });
});
