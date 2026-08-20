import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsModule from './SettingsModule';

describe('SettingsModule component', () => {
  it('renders General settings tab by default', () => {
    render(<SettingsModule />);

    expect(screen.getByRole('heading', { level: 1, name: 'Geral' })).toBeInTheDocument();
    expect(screen.getByText(/Gerencie suas preferências/i)).toBeInTheDocument();
  });

  it('renders Editor settings tab when tab pageId is editor', () => {
    render(<SettingsModule tab={{ id: 'tab-1', module: 'settings', pageId: 'editor' } as any} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Editor' })).toBeInTheDocument();
  });
});
