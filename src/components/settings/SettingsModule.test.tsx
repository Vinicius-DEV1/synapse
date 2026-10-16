import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsModule from './SettingsModule';
import { I18nProvider } from '../../i18n';
import type { Tab } from '../../types';

describe('SettingsModule component', () => {
  it('renders General settings tab by default in English', () => {
    render(<SettingsModule />);

    expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument();
    expect(screen.getByText(/Manage your general preferences/i)).toBeInTheDocument();
  });

  it('renders General settings tab in Portuguese when language is pt-BR', () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <SettingsModule />
      </I18nProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Geral' })).toBeInTheDocument();
    expect(screen.getByText(/Gerencie suas preferências de geral/i)).toBeInTheDocument();
  });

  it('renders Editor settings tab when tab pageId is editor', () => {
    const editorTab: Tab = {
      id: 'tab-1',
      module: 'settings',
      pageId: 'editor',
      title: 'Editor Settings',
      icon: 'Layout',
      isPinned: false,
    };
    render(<SettingsModule tab={editorTab} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Editor' })).toBeInTheDocument();
  });
});
