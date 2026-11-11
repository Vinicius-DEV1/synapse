/**
 * @file AccountStatusSection.test.tsx
 * @description Unit tests for AccountStatusSection settings component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { AccountStatusSection } from './AccountStatusSection';
import * as authService from '../../../../services/auth/firebase-auth';

vi.mock('../../../../services/auth/firebase-auth', () => ({
  getCurrentAuthUser: vi.fn(),
  signOutFromFirebase: vi.fn(),
}));

describe('AccountStatusSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders local single-user mode and dispatches open-account-evolution event on click', () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue(null);

    const eventListener = vi.fn();
    window.addEventListener('open-account-evolution', eventListener);

    const { getByText } = render(<AccountStatusSection />);
    expect(getByText('Modo Local')).toBeDefined();
    expect(getByText(/Evoluir para Conta Multiusuário/i)).toBeDefined();

    fireEvent.click(getByText(/Evoluir para Conta Multiusuário/i));
    expect(eventListener).toHaveBeenCalled();

    window.removeEventListener('open-account-evolution', eventListener);
  });

  it('renders connected user info and triggers sign out when clicked', async () => {
    vi.mocked(authService.getCurrentAuthUser).mockReturnValue({
      uid: 'user_123',
      email: 'alice@example.com',
    } as any);

    vi.mocked(authService.signOutFromFirebase).mockResolvedValue(undefined);

    const { getByText } = render(<AccountStatusSection />);
    expect(getByText('Conectado')).toBeDefined();
    expect(getByText('alice@example.com')).toBeDefined();
    expect(getByText(/UID: user_123/i)).toBeDefined();

    const logoutBtn = getByText('Sair da Conta');
    fireEvent.click(logoutBtn);

    expect(authService.signOutFromFirebase).toHaveBeenCalled();
  });
});
