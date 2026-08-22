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
});
