import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';
import { PageHeader } from '../components/page/PageHeader';
import { PageCover } from '../components/page/PageCover';
import { SubPageGrid } from '../components/page/SubPageGrid';
import { TipTapEditor } from '../components/editor/TipTapEditor';
import { PageMoveModal } from '../components/ui/PageMoveModal';
import { PageHistoryModal } from '../components/ui/PageHistoryModal';
import { upsertPage } from '../services/db';
import type { Page } from '../types/notes';

interface PageScreenProps {
  pageId: string;
  onBack: () => void;
  onNavigateToPage: (id: string) => void;
}

export const PageScreen: React.FC<PageScreenProps> = ({
  pageId,
  onBack,
  onNavigateToPage,
}) => {
  const { state, dispatch } = useAppStore();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const page = state.pages.find((p) => p.id === pageId);

  useEffect(() => {
    if (page) {
      console.log(`[PageScreen] 📖 Abrindo página: "${page.title}" (ID: ${page.id}) | CRDT len: ${(page.crdt_state || '').length} | Content len: ${(page.content || '').length}`);
    }
  }, [page?.id]);

  const subPages = useMemo(() => {
    return state.pages.filter((p) => p.parent_id === pageId);
  }, [state.pages, pageId]);

  if (!page) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Página não encontrada.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleUpdatePage = async (updates: Partial<Page>) => {
    const updatedPage = { ...page, ...updates, updated_at: new Date().toISOString() };
    await upsertPage(updatedPage);
    dispatch({ type: 'UPDATE_PAGE', id: page.id, updates });
  };

  const handleCreateSubPage = async () => {
    const newSubPage: Page = {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      parent_id: page.id,
      title: 'Nova Subpágina',
      icon: '📄',
      content: '',
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await upsertPage(newSubPage);
    dispatch({ type: 'ADD_PAGE', page: newSubPage });
    onNavigateToPage(newSubPage.id);
  };

  const handleMovePage = async (targetParentId: string | null) => {
    await handleUpdatePage({ parent_id: targetParentId });
    setShowMoveModal(false);
  };

  const handleSaveEditor = async (data: { crdtState: string; content: string }) => {
    await handleUpdatePage({
      crdt_state: data.crdtState,
      content: data.content,
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Nav Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.darkText} />
        </TouchableOpacity>
        <Text numberOfLines={1} style={styles.topNavTitle}>
          {page.title || 'Sem Título'}
        </Text>
        <View style={styles.topNavSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page Cover Image */}
        <PageCover
          coverImage={page.cover_image}
          onUpdateCover={(url) => handleUpdatePage({ cover_image: url })}
        />

        {/* Page Header */}
        <PageHeader
          page={page}
          pages={state.pages}
          onUpdatePage={handleUpdatePage}
          onNavigate={onNavigateToPage}
          onOpenMoveModal={() => setShowMoveModal(true)}
          onOpenHistoryModal={() => setShowHistoryModal(true)}
        />

        {/* Subpages Grid */}
        {subPages.length > 0 && (
          <SubPageGrid
            subPages={subPages}
            onNavigate={onNavigateToPage}
            onCreateSubPage={handleCreateSubPage}
          />
        )}

        {/* TipTap WYSIWYG & Yjs CRDT Editor */}
        <TipTapEditor
          key={page.id}
          initialCrdtState={page.crdt_state}
          initialContent={page.content}
          onSave={handleSaveEditor}
        />
      </ScrollView>

      {/* Move Page Modal */}
      <PageMoveModal
        visible={showMoveModal}
        pages={state.pages}
        currentPageId={page.id}
        onMove={handleMovePage}
        onClose={() => setShowMoveModal(false)}
      />

      {/* History Snapshot Modal */}
      <PageHistoryModal
        visible={showHistoryModal}
        pageId={page.id}
        onRestore={(content) => handleUpdatePage({ content })}
        onClose={() => setShowHistoryModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  topNav: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
  },
  backButton: {
    padding: 8,
  },
  topNavTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.darkText,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  topNavSpacer: {
    width: 38,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    color: colors.darkSubtext,
    fontSize: 16,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: colors.brand500,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
