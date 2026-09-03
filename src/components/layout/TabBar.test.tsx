import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TabBar from './TabBar';
import { StoreProvider } from '../../store/useStore';

describe('TabBar component', () => {
  beforeEach(() => {
    (window as any).api = {
      notifications: {
        getUnreadCount: vi.fn().mockResolvedValue(0),
        getNotifications: vi.fn().mockResolvedValue([]),
      },
    };
  });

  it('renders tab bar with add tab button and tabs list', () => {
    render(
      <StoreProvider>
        <TabBar />
      </StoreProvider>
    );

    const addTabButton = screen.getByTitle('Nova aba');
    expect(addTabButton).toBeInTheDocument();

    fireEvent.click(addTabButton);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('applies tab-scrollbar class with horizontal overflow and suppresses vertical scroll', () => {
    const { container } = render(
      <StoreProvider>
        <TabBar />
      </StoreProvider>
    );

    // Tab strip container
    const tabStrip = container.querySelector('.tab-scrollbar');
    expect(tabStrip).toBeInTheDocument();
    expect(tabStrip).toHaveClass('overflow-x-auto');
    expect(tabStrip).toHaveClass('overflow-y-hidden');
    expect(tabStrip).not.toHaveClass('scrollbar-none');

    // Outer bar container should remain overflow-hidden to prevent vertical leak
    const outerBar = container.firstChild as HTMLElement;
    expect(outerBar).toHaveClass('overflow-hidden');
  });

  it('translates vertical mouse wheel events into horizontal scrollLeft movement', () => {
    const { container } = render(
      <StoreProvider>
        <TabBar />
      </StoreProvider>
    );

    const tabStrip = container.querySelector('.tab-scrollbar') as HTMLElement;
    expect(tabStrip).toBeInTheDocument();

    // Mock initial scrollLeft
    tabStrip.scrollLeft = 50;

    fireEvent.wheel(tabStrip, { deltaY: 100 });
    expect(tabStrip.scrollLeft).toBe(150);

    fireEvent.wheel(tabStrip, { deltaY: -50 });
    expect(tabStrip.scrollLeft).toBe(100);
  });
});
