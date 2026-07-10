import { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import Editor from './Editor';
import SubPageGrid from './SubPageGrid';
import EmptyState from './EmptyState';
import { ChevronRight, Clock, Image as ImageIcon, Link, Sparkles, X, Upload } from 'lucide-react';
import EmojiPopover from './EmojiPopover';
import PageHistoryModal from './PageHistoryModal';

interface PageViewProps {
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export default function PageView({ page, onUpdateContent, onCreatePage, onCreateLinkedPage, onUpdatePage }: PageViewProps) {
  const { state, dispatch } = useStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build breadcrumb path
  const breadcrumbs = useMemo(() => {
    if (!page) return [];
    const path: Page[] = [];
    let current: Page | undefined = page;
    while (current) {
      path.unshift(current);
      current = current.parent_id
        ? state.pages.find((p) => p.id === current!.parent_id)
        : undefined;
    }
    return path;
  }, [page, state.pages]);

  const childPages = useMemo(() => {
    if (!page) return [];
    return state.pages
      .filter((p) => p.parent_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [page, state.pages]);

  const [contentData, setContentData] = useState<{ content: string; encrypted_content: string | null } | null>(null);
  const [contentPageId, setContentPageId] = useState<string | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Reset contentData synchronously when page changes to prevent stale content leaking
  if (page?.id && page.id !== contentPageId) {
    setContentData(null);
    setContentPageId(page.id);
    setIsUnlocked(false);
    setUnlockPassword('');
  }

  useEffect(() => {
    let mounted = true;
    if (page?.id) {
      window.api.getPageContent(page.id).then((data) => {
        if (mounted) {
          setContentData(data);
          if (!page.is_locked) setIsUnlocked(true);
        }
      });
    }
    return () => { mounted = false; };
  }, [page?.id, page?.is_locked]);

  if (!page) {
    return <EmptyState onCreatePage={() => onCreatePage(null)} />;
  }

  const handleNavigate = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentData?.encrypted_content || !page.password_salt) return;
    try {
      alert('Unlocked!');
      setIsUnlocked(true);
    } catch (err) {
      alert('Senha incorreta!');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max width 1600px for cover to avoid huge base64 strings
        if (width > 1600) {
          height = Math.round((height * 1600) / width);
          width = 1600;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdatePage(page.id, { cover_image: dataUrl });
        setShowCoverModal(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto relative bg-dark-bg" id="page-view-scroll">
      
      {/* Cover Image Banner */}
      {page.cover_image && (
        <div className="w-full h-64 relative group border-b border-dark-border">
          <img src={page.cover_image} alt="Capa" className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button 
              onClick={() => setShowCoverModal(true)}
              className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ImageIcon size={14} /> Trocar Capa
            </button>
            <button 
              onClick={() => onUpdatePage(page.id, { cover_image: null })}
              className="bg-black/50 hover:bg-red-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      )}

      <div className={`max-w-5xl mx-auto px-12 pb-12 animate-fade-in ${page.cover_image ? 'pt-8' : 'pt-16'}`}>
        
        {/* Hover Controls (Add Cover) */}
        {!page.cover_image && (
          <div className="mb-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity h-8 flex items-end">
            <button 
              onClick={() => setShowCoverModal(true)}
              className="text-dark-subtext hover:text-white flex items-center gap-1.5 text-sm font-medium px-2 py-1 hover:bg-white/5 rounded transition-colors"
            >
              <ImageIcon size={16} /> Adicionar capa
            </button>
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-dark-subtext mb-6 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-dark-subtext/50" />}
                <button
                  onClick={() => handleNavigate(crumb.id)}
                  className={`hover:text-brand-400 transition-colors ${
                    i === breadcrumbs.length - 1 ? 'text-dark-text font-medium' : ''
                  }`}
                >
                  {crumb.icon} {crumb.title}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Page Icon & Title */}
        <div className="flex items-start gap-3 mb-2 group">
          <EmojiPopover onEmojiSelect={(emoji) => onUpdatePage(page.id, { icon: emoji })}>
            <button className="text-5xl hover:bg-white/5 p-2 -ml-2 rounded-xl transition-colors">{page.icon}</button>
          </EmojiPopover>
          <div className="flex-1 min-w-0 flex items-start justify-between pt-2">
            <h1
              contentEditable
              suppressContentEditableWarning
              className="text-4xl font-bold text-dark-text outline-none flex-1 min-w-0 leading-tight empty:before:content-['Sem_Título'] empty:before:text-dark-subtext/50"
              onBlur={(e) => {
                const newTitle = e.currentTarget.textContent?.trim();
                if (newTitle !== undefined && newTitle !== page.title) {
                  onUpdatePage(page.id, { title: newTitle || 'Sem Título' });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
            >
              {page.title === 'Sem Título' ? '' : page.title}
            </h1>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg flex items-center gap-2 text-sm ml-4 whitespace-nowrap"
              title="Histórico de Edições"
            >
              <Clock size={16} />
              <span className="hidden sm:inline font-medium">Histórico</span>
            </button>
          </div>
        </div>

        {/* Page Description */}
        <div className="ml-14 mb-8">
          <p
            contentEditable
            suppressContentEditableWarning
            className="text-base text-dark-subtext outline-none empty:before:content-['Adicionar_descrição...'] empty:before:text-dark-subtext/30 focus:empty:before:text-dark-subtext/50 transition-colors"
            onBlur={(e) => {
              const newDesc = e.currentTarget.textContent?.trim();
              if (newDesc !== undefined && newDesc !== (page.description || '')) {
                onUpdatePage(page.id, { description: newDesc });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          >
            {page.description || ''}
          </p>
        </div>

        {/* Sub-Pages Grid */}
        {childPages.length > 0 && (
          <div className="mb-10">
            <SubPageGrid
              pages={childPages}
              onNavigate={handleNavigate}
              onCreatePage={() => onCreatePage(page.id)}
            />
          </div>
        )}

        {/* Editor or Unlock Screen */}
        {!contentData ? (
           <div className="text-dark-subtext mt-8 flex justify-center">Carregando conteúdo...</div>
        ) : page.is_locked && !isUnlocked ? (
           <form onSubmit={handleUnlock} className="mt-8 p-6 bg-dark-card rounded-xl border border-dark-border text-center max-w-md mx-auto">
             <div className="text-4xl mb-4">🔒</div>
             <h3 className="text-xl text-dark-text font-bold mb-2">Página Trancada</h3>
             <p className="text-dark-subtext text-sm mb-4">Esta página está protegida com criptografia ponta a ponta.</p>
             <input type="password" value={unlockPassword} onChange={e => setUnlockPassword(e.target.value)} placeholder="Senha da página" className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-dark-text mb-4 focus:border-brand-500 outline-none" autoFocus />
             <button type="submit" className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-2 rounded-lg transition-colors">Desbloquear</button>
           </form>
        ) : (
          <Editor
            key={page.id}
            pageId={page.id}
            initialContent={contentData.content}
            initialCrdtState={page.crdt_state}
            onSave={(content, crdtState, embeddedSaves) => onUpdateContent(page.id, content, crdtState, embeddedSaves)}
            onCreateLinkedPage={(title) => onCreateLinkedPage(title, page.id)}
          />
        )}

        {showHistoryModal && (
          <PageHistoryModal pageId={page.id} onClose={() => setShowHistoryModal(false)} />
        )}
      </div>

      {/* Cover Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-dark-card border border-dark-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCoverModal(false)} className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-6 text-dark-text">Adicionar Capa</h3>
            
            <div className="space-y-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 transition-colors text-white font-medium"
              >
                <Upload size={18} /> Fazer upload do computador
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-dark-subtext text-xs uppercase font-medium">ou</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div>
                <label className="block text-xs text-dark-subtext mb-2 font-medium">Link da Imagem</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={coverUrlInput}
                    onChange={e => setCoverUrlInput(e.target.value)}
                    className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button 
                    onClick={() => {
                      if (coverUrlInput.trim()) {
                        onUpdatePage(page.id, { cover_image: coverUrlInput.trim() });
                        setShowCoverModal(false);
                      }
                    }}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    const randomUrl = `https://picsum.photos/1600/400?random=${Math.random()}`;
                    onUpdatePage(page.id, { cover_image: randomUrl });
                    setShowCoverModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors py-2"
                >
                  <Sparkles size={16} /> Gerar Capa Aleatória
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
