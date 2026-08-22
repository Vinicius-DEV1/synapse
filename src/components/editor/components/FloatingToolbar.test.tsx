import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import FloatingToolbar from './FloatingToolbar';

describe('FloatingToolbar Component', () => {
  let mockEditor: any;
  let chainObj: any;

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
      run: vi.fn().mockReturnValue(true),
    };

    mockEditor = {
      chain: vi.fn(() => chainObj),
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({ href: '' })),
    };
  });

  it('triggers bold command when bold button is clicked', () => {
    const { getByTitle } = render(<FloatingToolbar editor={mockEditor} />);

    const boldBtn = getByTitle(/Negrito/i);
    fireEvent.click(boldBtn);

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(chainObj.toggleBold).toHaveBeenCalled();
    expect(chainObj.run).toHaveBeenCalled();
  });

  it('calls onAiClick when AI sparkles button is clicked', () => {
    const onAiClick = vi.fn();
    const { getByTitle } = render(
      <FloatingToolbar editor={mockEditor} onAiClick={onAiClick} />
    );

    const aiBtn = getByTitle(/Assistente IA/i);
    fireEvent.click(aiBtn);

    expect(onAiClick).toHaveBeenCalled();
  });
});
