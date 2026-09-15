import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import LinkInfoModal from './LinkInfoModal';
import * as linkInfoService from '../../../../services/link-info/linkInfoService';

// Mock Portal
vi.mock('../../../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="portal-root">{children}</div>,
}));

// Mock MermaidViewer
vi.mock('../../youtube/MermaidViewer', () => ({
  default: ({ chart }: any) => <div data-testid="mermaid-mock">{chart}</div>,
}));

// Mock ToastContext
vi.mock('../../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

// Mock uiSounds
vi.mock('../../../../utils/uiSounds', () => ({
  playUiClickSound: vi.fn(),
  playUiActionSound: vi.fn(),
}));

// Mock linkInfoService
vi.mock('../../../../services/link-info/linkInfoService', () => ({
  getOrGenerateLinkInfo: vi.fn(),
}));

describe('LinkInfoModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows AI summary', async () => {
    (linkInfoService.getOrGenerateLinkInfo as any).mockResolvedValue({
      url: 'https://vite.dev',
      title: 'Vite Documentação',
      domain: 'vite.dev',
      summary: '# Vite Resumo\n\n> Ferramenta de build moderna e rápida.',
      distilled: { title: 'Vite', cleanText: 'texto' },
      hasVideoTranscript: false,
      isCached: false,
      createdAt: '2026-09-15T00:00:00Z',
    });

    const onClose = vi.fn();
    const { getByText, findByText } = render(
      <LinkInfoModal
        isOpen={true}
        onClose={onClose}
        url="https://vite.dev"
        title="Vite"
      />
    );

    // Initial loading indicator
    expect(getByText(/Analisando recurso web.../i)).toBeDefined();

    // Summary resolved
    const summaryHeading = await findByText('Vite Resumo');
    expect(summaryHeading).toBeDefined();
    expect(getByText('Ferramenta de build moderna e rápida.')).toBeDefined();
  });

  it('handles copying summary to clipboard', async () => {
    (linkInfoService.getOrGenerateLinkInfo as any).mockResolvedValue({
      url: 'https://vite.dev',
      title: 'Vite',
      domain: 'vite.dev',
      summary: 'Resumo para copiar',
      distilled: {},
      hasVideoTranscript: false,
      isCached: true,
      createdAt: '2026-09-15T00:00:00Z',
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const { findByText, getByTitle } = render(
      <LinkInfoModal
        isOpen={true}
        onClose={vi.fn()}
        url="https://vite.dev"
      />
    );

    await findByText('Resumo para copiar');

    const copyBtn = getByTitle(/Copiar texto do resumo em Markdown/i);
    expect(copyBtn).toBeDefined();
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('Resumo para copiar');
  });

  it('handles inserting summary directly into card notes', async () => {
    (linkInfoService.getOrGenerateLinkInfo as any).mockResolvedValue({
      url: 'https://vite.dev',
      title: 'Vite',
      domain: 'vite.dev',
      summary: 'Resumo para as notas',
      distilled: {},
      hasVideoTranscript: false,
      isCached: true,
      createdAt: '2026-09-15T00:00:00Z',
    });

    const onInsertIntoNotes = vi.fn();

    const { findByText, getByTitle } = render(
      <LinkInfoModal
        isOpen={true}
        onClose={vi.fn()}
        url="https://vite.dev"
        onInsertIntoNotes={onInsertIntoNotes}
      />
    );

    await findByText('Resumo para as notas');

    const insertBtn = getByTitle(/Inserir resumo gerado na gaveta de anotações deste card/i);
    expect(insertBtn).toBeDefined();
    fireEvent.click(insertBtn);

    expect(onInsertIntoNotes).toHaveBeenCalledWith('Resumo para as notas');
  });

  it('displays error state when generation fails and allows retry', async () => {
    (linkInfoService.getOrGenerateLinkInfo as any).mockRejectedValueOnce(
      new Error('Erro de conexão ou cota esgotada')
    );

    const { findByText, getByText } = render(
      <LinkInfoModal
        isOpen={true}
        onClose={vi.fn()}
        url="https://vite.dev"
      />
    );

    const errorMsg = await findByText('Erro de conexão ou cota esgotada');
    expect(errorMsg).toBeDefined();

    const retryBtn = getByText('Tentar Novamente');
    expect(retryBtn).toBeDefined();

    (linkInfoService.getOrGenerateLinkInfo as any).mockResolvedValueOnce({
      url: 'https://vite.dev',
      title: 'Vite Recuperado',
      domain: 'vite.dev',
      summary: 'Resumo pós-retry',
      distilled: {},
      hasVideoTranscript: false,
      isCached: false,
      createdAt: '2026-09-15T00:00:00Z',
    });

    fireEvent.click(retryBtn);

    const recovered = await findByText('Resumo pós-retry');
    expect(recovered).toBeDefined();
  });
});
