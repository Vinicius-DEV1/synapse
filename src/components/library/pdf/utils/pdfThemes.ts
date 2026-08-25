export type ReadingMode =
  | 'light'
  | 'sepia'
  | 'mint'
  | 'dim'
  | 'nord'
  | 'midnight'
  | 'dark'
  | 'high-contrast';

export const THEME_CLASSES: Record<ReadingMode, string> = {
  light: 'bg-[#f4f4f4] text-[#1a1a1a]',
  sepia: 'bg-[#f4ecd8] text-[#5b4636]',
  mint: 'bg-[#e2f0cb] text-[#2c4c3b]',
  dim: 'bg-[#2d2d2d] text-[#e0e0e0]',
  nord: 'bg-[#2e3440] text-[#eceff4]',
  midnight: 'bg-[#0f172a] text-[#e2e8f0]',
  dark: 'bg-[#121212] text-[#cccccc]',
  'high-contrast': 'bg-black text-white',
};

export const MODE_NAMES: Record<ReadingMode, string> = {
  light: 'Modo Claro',
  sepia: 'Sépia',
  mint: 'Menta Pastel',
  dim: 'Suave (Dim)',
  nord: 'Nord',
  midnight: 'Azul Meia-Noite',
  dark: 'Modo Escuro',
  'high-contrast': 'Alto Contraste',
};

export function getPdfCssFilter(mode: ReadingMode): string {
  switch (mode) {
    case 'sepia':
      return 'sepia(0.4) contrast(0.9)';
    case 'dim':
      return 'brightness(0.7) contrast(0.85)';
    case 'nord':
      return 'invert(0.85) hue-rotate(180deg) sepia(0.1) contrast(0.85) saturate(1.5) brightness(0.95)';
    case 'high-contrast':
      return 'invert(1) contrast(1.2) grayscale(1)';
    case 'midnight':
      return 'invert(0.95) hue-rotate(180deg) contrast(0.95) brightness(0.8) sepia(0.3) hue-rotate(-30deg)';
    case 'dark':
      return 'invert(0.9) hue-rotate(180deg)';
    default:
      return 'none';
  }
}
