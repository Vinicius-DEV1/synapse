import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BackupAndWipeSection } from './BackupAndWipeSection';
import { VisitorsManagementSection } from './VisitorsManagementSection';
import { MasterPasswordSection } from './MasterPasswordSection';
import { I18nProvider } from '../../../../i18n';

describe('Security Sections', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('BackupAndWipeSection', () => {
    it('renders backup and wipe buttons', () => {
      render(
        <I18nProvider initialLanguage="pt-BR">
          <BackupAndWipeSection />
        </I18nProvider>
      );

      expect(screen.getByText(/Exportar DB Local/i)).toBeInTheDocument();
      expect(screen.getByText(/APAGAR DADOS LOCAIS/i)).toBeInTheDocument();
    });

    it('opens ConfirmDialog in web environment when wipe button is clicked', () => {
      // Ensure window.api.app.showConfirm is not set
      const originalApi = window.api;
      (window as unknown as { api?: unknown }).api = undefined;

      render(
        <I18nProvider initialLanguage="pt-BR">
          <BackupAndWipeSection />
        </I18nProvider>
      );

      fireEvent.click(screen.getByText(/APAGAR DADOS LOCAIS/i));
      expect(screen.getByRole('heading', { name: /Apagar Dados Locais/i })).toBeInTheDocument();
      expect(screen.getByText(/ATENÇÃO: Deseja realmente apagar TODOS os dados locais/i)).toBeInTheDocument();

      // Cancel button dismisses
      fireEvent.click(screen.getByText('Cancelar'));
      expect(screen.queryByText(/ATENÇÃO: Deseja realmente apagar TODOS os dados locais/i)).not.toBeInTheDocument();

      (window as unknown as { api?: unknown }).api = originalApi;
    });
  });

  describe('VisitorsManagementSection', () => {
    it('renders visitors header and add button', () => {
      render(
        <I18nProvider initialLanguage="pt-BR">
          <VisitorsManagementSection />
        </I18nProvider>
      );

      expect(screen.getByText(/Senhas Modulares \(Visitantes\)/i)).toBeInTheDocument();
      expect(screen.getByText(/\+ Adicionar/i)).toBeInTheDocument();
    });

    it('toggles add visitor form and closes on Escape', () => {
      render(
        <I18nProvider initialLanguage="pt-BR">
          <VisitorsManagementSection />
        </I18nProvider>
      );

      fireEvent.click(screen.getByText(/\+ Adicionar/i));
      expect(screen.getByPlaceholderText(/Senha que destrancará os módulos/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByPlaceholderText(/Senha que destrancará os módulos/i)).not.toBeInTheDocument();
    });
  });

  describe('MasterPasswordSection', () => {
    it('renders password input fields', () => {
      render(
        <I18nProvider initialLanguage="pt-BR">
          <MasterPasswordSection onCancel={vi.fn()} />
        </I18nProvider>
      );

      expect(screen.getByPlaceholderText(/Digite a nova senha/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Digite a senha novamente/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirmar Alteração/i)).toBeInTheDocument();
    });

    it('triggers onCancel when Escape or back button is pressed', () => {
      const handleCancel = vi.fn();
      render(
        <I18nProvider initialLanguage="pt-BR">
          <MasterPasswordSection onCancel={handleCancel} />
        </I18nProvider>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new CustomEvent('caderno-back-press'));
      expect(handleCancel).toHaveBeenCalledTimes(2);
    });
  });
});
