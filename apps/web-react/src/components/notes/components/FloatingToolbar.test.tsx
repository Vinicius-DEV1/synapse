import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FloatingToolbar from './FloatingToolbar';
import { I18nProvider } from '../../../i18n';
import type { Editor } from '@tiptap/react';

describe('FloatingToolbar Component', () => {
  let mockEditor: unknown;
  let chainObj: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    chainObj = {
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleUnderline: vi.fn().mockReturnThis(),
      toggleStrike: vi.fn().mockReturnThis(),
      toggleCode: vi.fn().mockReturnThis(),
      setLink: vi.fn().mockReturnThis(),
      unsetLink: vi.fn().mockReturnThis(),
      toggleHighlight: vi.fn().mockReturnThis(),
      unsetHighlight: vi.fn().mockReturnThis(),
      toggleSpoiler: vi.fn().mockReturnThis(),
      setColor: vi.fn().mockReturnThis(),
      unsetColor: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue(true),
    };

    mockEditor = {
      chain: vi.fn(() => chainObj),
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({ href: '' })),
    };
  });

  const renderWithI18n = (ui: React.ReactElement) => {
    return render(
      <I18nProvider initialLanguage="pt-BR">
        {ui}
      </I18nProvider>
    );
  };

  it('triggers bold command when bold button is clicked', () => {
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} />
    );

    const boldBtn = getByTitle(/Negrito/i);
    fireEvent.click(boldBtn);

    expect((mockEditor as { chain: () => unknown }).chain).toHaveBeenCalled();
    expect(chainObj.toggleBold).toHaveBeenCalled();
    expect(chainObj.run).toHaveBeenCalled();
  });

  it('calls onAiClick when AI sparkles button is clicked', () => {
    const onAiClick = vi.fn();
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} onAiClick={onAiClick} />
    );

    const aiBtn = getByTitle(/Assistente IA/i);
    fireEvent.click(aiBtn);

    expect(onAiClick).toHaveBeenCalled();
  });

  it('triggers spoiler command when spoiler button is clicked', () => {
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} />
    );

    const spoilerBtn = getByTitle(/Fumaça \/ Spoiler|Spoiler/i);
    fireEvent.click(spoilerBtn);

    expect((mockEditor as { chain: () => unknown }).chain).toHaveBeenCalled();
    expect(chainObj.toggleSpoiler).toHaveBeenCalled();
    expect(chainObj.run).toHaveBeenCalled();
  });

  it('opens color menu and applies text color', () => {
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} />
    );

    const paletteBtn = getByTitle(/Cores e Destaque/i);
    fireEvent.click(paletteBtn);

    const blueColorBtn = getByTitle('Azul');
    fireEvent.click(blueColorBtn);

    expect((mockEditor as { chain: () => unknown }).chain).toHaveBeenCalled();
    expect(chainObj.setColor).toHaveBeenCalledWith('#3B82F6');
    expect(chainObj.run).toHaveBeenCalled();
  });

  it('unsets text color when Padrão is selected', () => {
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} />
    );

    const paletteBtn = getByTitle(/Cores e Destaque/i);
    fireEvent.click(paletteBtn);

    const defaultColorBtn = getByTitle('Cor padrão');
    fireEvent.click(defaultColorBtn);

    expect((mockEditor as { chain: () => unknown }).chain).toHaveBeenCalled();
    expect(chainObj.unsetColor).toHaveBeenCalled();
    expect(chainObj.run).toHaveBeenCalled();
  });

  it('opens color menu and applies highlight color', () => {
    const { getByTitle } = renderWithI18n(
      <FloatingToolbar editor={mockEditor as unknown as Editor} />
    );

    const paletteBtn = getByTitle(/Cores e Destaque/i);
    fireEvent.click(paletteBtn);

    const blueBgBtn = getByTitle('Fundo Azul');
    fireEvent.click(blueBgBtn);

    expect((mockEditor as { chain: () => unknown }).chain).toHaveBeenCalled();
    expect(chainObj.toggleHighlight).toHaveBeenCalledWith({ color: '#3B82F6' });
    expect(chainObj.run).toHaveBeenCalled();
  });
});
