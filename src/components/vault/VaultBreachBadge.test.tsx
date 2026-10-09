import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VaultBreachBadge } from './VaultBreachBadge';
import type { ICadernoAPI } from '../../api/types';

describe('VaultBreachBadge component', () => {
  const mockCheckBreach = vi.fn();

  beforeEach(() => {
    mockCheckBreach.mockReset();
    window.api = {
      vault: {
        checkBreach: mockCheckBreach,
      },
    } as unknown as ICadernoAPI;
  });

  it('renders nothing when password is empty or null', () => {
    const { container } = render(<VaultBreachBadge password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows safe badge when password has no breaches', async () => {
    mockCheckBreach.mockResolvedValue({
      breached: false,
      count: 0,
    });

    render(<VaultBreachBadge password="SuperUniqueSecurePassword2026!" />);

    await waitFor(
      () => {
        expect(screen.getByText('Nenhum vazamento detectado')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('shows breach warning when password was found in data breaches', async () => {
    mockCheckBreach.mockResolvedValue({
      breached: true,
      count: 145000,
    });

    render(<VaultBreachBadge password="123456" />);

    await waitFor(
      () => {
        expect(screen.getByText('Senha Comprometida!')).toBeInTheDocument();
        expect(screen.getByText(/145.000/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
