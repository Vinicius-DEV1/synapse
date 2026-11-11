import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EpubTypography from './EpubTypography';

const mockSetFontSize = vi.fn();
const mockSetFontFamily = vi.fn();
const mockSetTextAlign = vi.fn();
const mockSetLineHeight = vi.fn();
const mockSetParagraphSpacing = vi.fn();
const mockSetReadingMode = vi.fn();
const mockSetTextWidth = vi.fn();
const mockSetScrollMode = vi.fn();

let mockShowSettings = true;
let mockTextAlign = 'justify';
let mockLineHeight = 'normal';
let mockParagraphSpacing = 'compact';
let mockFontFamily = 'original';

vi.mock('./EpubContext', () => ({
  useEpub: () => ({
    showSettings: mockShowSettings,
    readingMode: 'dark',
    setReadingMode: mockSetReadingMode,
    fontSize: 100,
    setFontSize: mockSetFontSize,
    fontFamily: mockFontFamily,
    setFontFamily: mockSetFontFamily,
    originalFontName: 'Times New Roman',
    detectedFontSizePx: '16px',
    scrollMode: false,
    setScrollMode: mockSetScrollMode,
    textWidth: 'medium',
    setTextWidth: mockSetTextWidth,
    lineHeight: mockLineHeight,
    setLineHeight: mockSetLineHeight,
    textAlign: mockTextAlign,
    setTextAlign: mockSetTextAlign,
    paragraphSpacing: mockParagraphSpacing,
    setParagraphSpacing: mockSetParagraphSpacing,
  }),
}));

describe('EpubTypography Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShowSettings = true;
    mockTextAlign = 'justify';
    mockLineHeight = 'normal';
    mockParagraphSpacing = 'compact';
    mockFontFamily = 'original';
  });

  it('renders nothing when showSettings is false', () => {
    mockShowSettings = false;
    const { container } = render(<EpubTypography />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all typography sections and controls when visible', () => {
    const { getByText, getByTitle } = render(<EpubTypography />);
    expect(getByText('Tamanho da Fonte')).toBeDefined();
    expect(getByText('Estilo da Fonte')).toBeDefined();
    expect(getByText('Alinhamento')).toBeDefined();
    expect(getByText('Espaçamento de Linha')).toBeDefined();
    expect(getByText('Parágrafos')).toBeDefined();
    expect(getByText('Tema de Leitura')).toBeDefined();
    expect(getByText('Largura do Texto')).toBeDefined();
    expect(getByText('Leitura Contínua')).toBeDefined();

    expect(getByTitle('Justificado (Livro impresso)')).toBeDefined();
    expect(getByTitle('Alinhado à esquerda')).toBeDefined();
  });

  it('handles text alignment toggling between justified and left', () => {
    const { getByTitle } = render(<EpubTypography />);
    const leftBtn = getByTitle('Alinhado à esquerda');
    fireEvent.click(leftBtn);
    expect(mockSetTextAlign).toHaveBeenCalledWith('left');

    const justifyBtn = getByTitle('Justificado (Livro impresso)');
    fireEvent.click(justifyBtn);
    expect(mockSetTextAlign).toHaveBeenCalledWith('justify');
  });

  it('handles line-height presets (compact, normal, relaxed)', () => {
    const { getByText } = render(<EpubTypography />);
    const compactBtn = getByText('Compacto');
    fireEvent.click(compactBtn);
    expect(mockSetLineHeight).toHaveBeenCalledWith('compact');

    const relaxedBtn = getByText('Amplo');
    fireEvent.click(relaxedBtn);
    expect(mockSetLineHeight).toHaveBeenCalledWith('relaxed');
  });

  it('handles paragraph spacing presets (com recuo vs espaçados)', () => {
    const { getByText } = render(<EpubTypography />);
    const spacedBtn = getByText('Espaçados');
    fireEvent.click(spacedBtn);
    expect(mockSetParagraphSpacing).toHaveBeenCalledWith('spaced');

    const compactBtn = getByText('Com Recuo');
    fireEvent.click(compactBtn);
    expect(mockSetParagraphSpacing).toHaveBeenCalledWith('compact');
  });

  it('allows selecting OpenDyslexic accessible font', () => {
    const { getByText } = render(<EpubTypography />);
    const dyslexicBtn = getByText('OpenDyslexic (Acessível)');
    fireEvent.click(dyslexicBtn);
    expect(mockSetFontFamily).toHaveBeenCalledWith('opendyslexic');
  });
});
