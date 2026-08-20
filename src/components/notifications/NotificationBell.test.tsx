import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationBell from './NotificationBell';
import { StoreProvider } from '../../store/useStore';

describe('NotificationBell component', () => {
  beforeEach(() => {
    (window as any).api = {
      notifications: {
        getNotifications: vi.fn().mockResolvedValue([
          {
            id: 'notif-1',
            title: 'Lembrete de Estudo',
            message: 'Revisar cartões de Matemática',
            is_read: false,
            created_at: new Date().toISOString(),
          },
        ]),
        markRead: vi.fn().mockResolvedValue(undefined),
        deleteNotification: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('displays bell button and badge with unread count', async () => {
    render(
      <StoreProvider>
        <NotificationBell />
      </StoreProvider>
    );

    const button = screen.getByTitle('Central de Notificações');
    expect(button).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('opens notification modal on button click', async () => {
    render(
      <StoreProvider>
        <NotificationBell />
      </StoreProvider>
    );

    const button = screen.getByTitle('Central de Notificações');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Notificações')).toBeInTheDocument();
    });
  });
});
