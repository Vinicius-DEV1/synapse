import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { PenTool, Plus, Trash2, X, Loader2, AlertTriangle } from 'lucide-react';
import type { DiagramMeta } from '../../types';
import { triggerToast } from '../ui/ToastContext';
import { Portal } from '../ui/Portal';
import { useTranslation } from '../../i18n';

const DiagramEditor = lazy(() => import('./DiagramEditor'));

export default function DiagramsModule() {
  const { t } = useTranslation();
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([]);
  const [activeDiagram, setActiveDiagram] = useState<DiagramMeta | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [diagramToDelete, setDiagramToDelete] = useState<DiagramMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadDiagrams();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (diagramToDelete && !isDeleting) {
          e.stopPropagation();
          setDiagramToDelete(null);
        } else if (showCreateModal) {
          e.stopPropagation();
          setShowCreateModal(false);
        }
      }
    };

    const handleBackPress = (e: Event) => {
      if (diagramToDelete && !isDeleting) {
        e.preventDefault();
        e.stopPropagation();
        setDiagramToDelete(null);
      } else if (showCreateModal) {
        e.preventDefault();
        e.stopPropagation();
        setShowCreateModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [diagramToDelete, isDeleting, showCreateModal]);

  const loadDiagrams = async () => {
    if (window.api?.diagrams) {
      try {
        const res = await window.api.diagrams.getAll();
        setDiagrams(res || []);
      } catch (e: unknown) {
        console.error(e);
        triggerToast(e instanceof Error ? e.message : t('diagrams.loadError'), 'error');
      }
    }
  };

  const handleCreate = async () => {
    if (window.api?.diagrams) {
      try {
        const newDiagram = await window.api.diagrams.create({
          title: newTitle.trim() || t('diagrams.defaultTitle'),
          icon: '🎨'
        });
        setShowCreateModal(false);
        setNewTitle('');
        await loadDiagrams();
        setActiveDiagram(newDiagram);
        triggerToast(t('diagrams.createdSuccess'), 'success');
      } catch (e: unknown) {
        console.error(e);
        triggerToast(e instanceof Error ? e.message : t('diagrams.createError'), 'error');
      }
    }
  };

  const confirmDelete = async () => {
    if (!diagramToDelete || !window.api?.diagrams) return;
    setIsDeleting(true);
    try {
      await window.api.diagrams.delete(diagramToDelete.id);
      if (activeDiagram?.id === diagramToDelete.id) setActiveDiagram(null);
      setDiagramToDelete(null);
      await loadDiagrams();
      triggerToast(t('diagrams.deletedSuccess'), 'info');
    } catch (e: unknown) {
      console.error(e);
      triggerToast(e instanceof Error ? e.message : t('diagrams.deleteError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = useCallback(() => {
    setActiveDiagram(null);
  }, []);

  if (activeDiagram) {
    return (
      <Suspense fallback={
        <div className="flex-1 h-full flex items-center justify-center bg-dark-bg text-dark-subtext gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>{t('diagrams.loadingEditor')}</span>
        </div>
      }>
        <DiagramEditor key={activeDiagram.id} diagram={activeDiagram} onBack={handleBack} />
      </Suspense>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto" style={{ height: '100dvh' }}>
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <header className="flex justify-between items-center pb-8 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <PenTool className="w-8 h-8 text-indigo-500" />
              {t('diagrams.title')}
            </h1>
            <p className="text-dark-subtext mt-2">{t('diagrams.subtitle')}</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('diagrams.newDiagram')}
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {diagrams.map(diag => (
            <div 
              key={diag.id}
              onClick={() => setActiveDiagram(diag)}
              className="bg-dark-card border border-white/5 hover:border-indigo-500/50 hover:bg-white/5 p-6 rounded-2xl cursor-pointer transition-all group flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="text-4xl">{diag.icon}</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDiagramToDelete(diag);
                  }}
                  className="p-2 rounded-lg text-dark-subtext hover:bg-red-500/20 hover:text-red-400 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                  title={t('diagrams.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white/90 group-hover:text-white truncate">{diag.title}</h3>
                <p className="text-sm text-dark-subtext mt-1">{t('diagrams.updatedAt')} {diag.updated_at ? new Date(diag.updated_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          ))}

          {diagrams.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-dark-subtext bg-dark-card border border-white/5 rounded-2xl">
              <PenTool className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">{t('diagrams.noDiagrams')}</p>
              <p className="text-sm mt-1">{t('diagrams.noDiagramsHint')}</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6">{t('diagrams.newDiagram')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-subtext mb-2">{t('diagrams.diagramTitle')}</label>
                  <input
                    type="text"
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    className="w-full bg-dark-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder={t('diagrams.placeholderTitle')}
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
                  >
                    {t('diagrams.cancel')}
                  </button>
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
                  >
                    {t('diagrams.create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {diagramToDelete && (
        <Portal>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-dark-card border border-red-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{t('diagrams.deleteConfirmTitle')}</h3>
                <p className="text-dark-subtext text-sm">
                  {t('diagrams.deleteConfirmPrompt', { title: diagramToDelete.title })}
                </p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setDiagramToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  {t('diagrams.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  {isDeleting ? t('diagrams.deleting') : t('diagrams.deleteConfirmBtn')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
