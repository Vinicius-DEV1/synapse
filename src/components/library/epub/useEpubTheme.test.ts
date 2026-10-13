import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEpubTheme } from './useEpubTheme';

const mockRegisterCss = vi.fn();
const mockRegister = vi.fn();
const mockSelect = vi.fn();
const mockFontSize = vi.fn();
const mockHookRegister = vi.fn();
const mockHookDeregister = vi.fn();

let mockReadingMode = 'dark';
let mockFontFamily = 'inter';
let mockFontSizeVal = 100;
let mockLineHeight = 'normal';
let mockTextAlign = 'left';
let mockParagraphSpacing = 'normal';

const mockDoc = document.implementation.createHTMLDocument('Chapter 1');

const mockContents = {
  document: mockDoc,
  window: window,
};

const mockRendition = {
  themes: {
    registerCss: mockRegisterCss,
    register: mockRegister,
    select: mockSelect,
    fontSize: mockFontSize,
  },
  getContents: vi.fn().mockReturnValue([mockContents]),
  hooks: {
    content: {
      register: mockHookRegister,
      deregister: mockHookDeregister,
    },
  },
  annotations: {
    remove: vi.fn(),
    clear: vi.fn(),
    highlight: vi.fn(),
  },
};

vi.mock('./EpubContext', () => ({
  useEpub: () => ({
    rendition: mockRendition,
    fontSize: mockFontSizeVal,
    fontFamily: mockFontFamily,
    readingMode: mockReadingMode,
    scrollMode: false,
    lineHeight: mockLineHeight,
    textAlign: mockTextAlign,
    paragraphSpacing: mockParagraphSpacing,
    highlights: [],
    setSelection: vi.fn(),
    setNoteMode: vi.fn(),
    setNoteText: vi.fn(),
  }),
}));

describe('useEpubTheme', () => {
  const globalLastHighlightClickRef = { current: 0 };
  const clearSelectionTimerRef = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.head.innerHTML = '';
    mockDoc.body.innerHTML = '<p>Test paragraph</p>';
    mockReadingMode = 'dark';
  });

  it('applies dark theme background and serialized CSS to document element and body', () => {
    renderHook(() => useEpubTheme(globalLastHighlightClickRef, clearSelectionTimerRef));

    // Should call registerCss with serialized CSS string
    expect(mockRegisterCss).toHaveBeenCalled();
    const [themeName, cssString] = mockRegisterCss.mock.calls[0];
    expect(themeName).toContain('custom-dark');
    expect(typeof cssString).toBe('string');
    expect(cssString).toContain('background: #1a1a2e !important');

    // Should call themes.select
    expect(mockSelect).toHaveBeenCalledWith(themeName);

    // Should apply background color directly to documentElement and body
    expect(mockDoc.documentElement.style.backgroundColor).toBe('rgb(26, 26, 46)');
    expect(mockDoc.body.style.backgroundColor).toBe('rgb(26, 26, 46)');

    // Should create or update #caderno-epub-theme style tag
    const themeStyle = mockDoc.getElementById('caderno-epub-theme');
    expect(themeStyle).not.toBeNull();
    expect(themeStyle?.textContent).toContain('background: #1a1a2e !important');

    // Should register content hook for newly loaded chapters
    expect(mockHookRegister).toHaveBeenCalled();
  });

  it('deregisters content hook safely on unmount', () => {
    const { unmount } = renderHook(() => useEpubTheme(globalLastHighlightClickRef, clearSelectionTimerRef));
    unmount();
    expect(mockHookDeregister).toHaveBeenCalled();
  });
});
