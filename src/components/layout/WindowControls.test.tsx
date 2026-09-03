import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WindowControls from './WindowControls';
import * as platformModule from '../../services/platform';

const mockMinimize = vi.fn();
const mockToggleMaximize = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn();
const mockIsMaximized = vi.fn().mockResolvedValue(false);
const mockOnResized = vi.fn().mockReturnValue(Promise.resolve(() => {}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    minimize: mockMinimize,
    toggleMaximize: mockToggleMaximize,
    close: mockClose,
    isMaximized: mockIsMaximized,
    onResized: mockOnResized,
  }),
}));

describe('WindowControls component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not running on desktop (web mode)', () => {
    vi.spyOn(platformModule, 'isDesktopApp').mockReturnValue(false);

    const { container } = render(<WindowControls />);
    expect(container.firstChild).toBeNull();
  });

  it('renders window control buttons when running on desktop', async () => {
    vi.spyOn(platformModule, 'isDesktopApp').mockReturnValue(true);

    render(<WindowControls />);

    const minimizeBtn = await screen.findByTitle('Minimizar');
    const maximizeBtn = await screen.findByTitle('Maximizar');
    const closeBtn = await screen.findByTitle('Fechar');

    expect(minimizeBtn).toBeInTheDocument();
    expect(maximizeBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();
  });

  it('triggers minimize, toggleMaximize, and close when clicked', async () => {
    vi.spyOn(platformModule, 'isDesktopApp').mockReturnValue(true);

    render(<WindowControls />);

    const minimizeBtn = await screen.findByTitle('Minimizar');
    const maximizeBtn = await screen.findByTitle('Maximizar');
    const closeBtn = await screen.findByTitle('Fechar');

    fireEvent.click(minimizeBtn);
    expect(mockMinimize).toHaveBeenCalledTimes(1);

    fireEvent.click(maximizeBtn);
    expect(mockToggleMaximize).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
