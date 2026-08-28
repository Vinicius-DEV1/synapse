import { DOMSerializer } from 'prosemirror-model';
import { getStoreState, getStoreDispatch } from '../../../store/useStore';
import { getEditorBackupMap } from '../../editor/hooks/editorBackupStore';

export async function convertToggleNodeToPage(editor: any, node: any, getPos: () => number | undefined) {
  if (typeof getPos !== 'function' || !editor) return;

  const rawTitle = node.attrs?.title;
  const title = typeof rawTitle === 'string' ? rawTitle.trim() || 'Sem Título' : (rawTitle ? String(rawTitle).trim() : 'Sem Título');

  let bodyHtml = '';
  try {
    const serializer = DOMSerializer.fromSchema(editor.schema);
    const tempDiv = document.createElement('div');
    const domFragment = serializer.serializeFragment(node.content);
    tempDiv.appendChild(domFragment);
    bodyHtml = tempDiv.innerHTML || '<p></p>';
    console.log('[Caderno:Toggle] Serialized toggle content HTML successfully (length: ' + bodyHtml.length + ')');
  } catch (err) {
    console.error('[Caderno:Toggle] Erro ao serializar conteúdo do toggle:', err);
    bodyHtml = '<p></p>';
  }

  try {
    const storeState = getStoreState();
    const dispatch = getStoreDispatch();
    const activeTab = storeState.tabs.find((t) => t.id === storeState.activeTabId);
    const parentId = activeTab?.pageId || null;

    let newPage: any = null;
    if (window.api) {
      newPage = await window.api.createPage({ parentId, title });
      if (newPage && newPage.id) {
        console.log('[Caderno:Toggle] Created new page:', newPage.id, 'with title:', title);
        
        // Save content to the page without CRDT (let the page initialize CRDT on its own)
        await window.api.updatePage({ id: newPage.id, content: bodyHtml, title, crdt_state: null });
        
        // We do NOT set crdt: '' in getEditorBackupMap, to force the new page to load from HTML
        getEditorBackupMap().set(newPage.id, { html: bodyHtml, crdt: '' }); // We must set something, but we'll handle it in Editor
        console.log('[Caderno:Toggle] Saved content to new page');
        dispatch({ type: 'ADD_PAGE', page: { ...newPage, content: bodyHtml, title } });
        if (parentId) {
          dispatch({ type: 'EXPAND_NODE', nodeId: parentId });
        }
      }
    }

    if (newPage?.id) {
      const pos = getPos();
      if (typeof pos === 'number') {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .insertContentAt(pos, {
            type: 'paragraph',
            content: [
              {
                type: 'pageReference',
                attrs: { pageId: newPage.id, title },
              },
            ],
          })
          .run();
      }
    }
  } catch (err) {
    console.error('[Caderno:Toggle] Erro ao converter toggle em página:', err);
  }
}
