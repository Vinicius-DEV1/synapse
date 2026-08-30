import type { Page } from '../types';
import { triggerToast } from '../components/ui/ToastContext';

export async function exportPageFile(id: string) {
  if (!window.api) return;
  try {
    const pages = await window.api.sync.getTable('pages');
    const page = pages.find((p: Page) => p.id === id);
    if (!page) {
      triggerToast('Página não encontrada para exportação.', 'error');
      return;
    }

    // Remove non-exportable fields
    const exportData = {
      title: page.title,
      content: page.content,
      crdt_state: page.crdt_state,
      icon: page.icon,
      is_pinned: page.is_pinned,
      _type: 'caderno_page_export',
      _version: 1
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (page.title || 'Nova Pagina').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeTitle}.caderno`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('Página exportada com sucesso!', 'success');
  } catch (err: unknown) {
    console.error('Erro ao exportar página:', err);
    triggerToast(err instanceof Error ? err.message : 'Falha ao exportar página.', 'error');
  }
}

export function importPageFile(
  parentId: string | null,
  onImportSuccess: (page: Page, newPageId: string) => void
) {
  if (!window.api) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.caderno,.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data._type !== 'caderno_page_export' && !data.crdt_state && !data.content) {
        triggerToast('Formato de arquivo inválido para importação de página.', 'error');
        return;
      }

      const newPage = await window.api!.createPage({ parentId });
      
      const updates: Partial<Page> = {
        title: data.title || 'Página Importada',
        content: data.content || '',
        crdt_state: data.crdt_state || null,
        icon: data.icon || '📄',
      };

      await window.api!.updatePage({ id: newPage.id, ...updates });
      
      const completePage = { ...newPage, ...updates } as Page;
      onImportSuccess(completePage, newPage.id);

      triggerToast(`Página "${updates.title}" importada com sucesso!`, 'success');
    } catch (err: unknown) {
      console.error('Erro ao importar página:', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao importar página: Arquivo inválido ou corrompido.', 'error');
    }
  };
  input.click();
}
