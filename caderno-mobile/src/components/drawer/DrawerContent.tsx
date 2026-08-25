import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Search,
  Plus,
  Pin,
  BookOpen,
  Library,
  RefreshCw,
  Lock,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/AppContext';
import { PageTreeItem } from './PageTreeItem';
import { upsertPage, deletePageLocal } from '../../services/db';
import type { Page } from '../../types/notes';

interface DrawerContentProps {
  onNavigateToPage: (pageId: string) => void;
  onNavigateToLibrary: () => void;
  onNavigateToHome: () => void;
  onCloseDrawer: () => void;
}

export const DrawerContent: React.FC<DrawerContentProps> = ({
  onNavigateToPage,
  onNavigateToLibrary,
  onNavigateToHome,
  onCloseDrawer,
}) => {
  const { state, dispatch, syncNow } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { pinnedPages, rootPages, childrenMap } = useMemo(() => {
    const pinned: Page[] = [];
    const roots: Page[] = [];
    const map = new Map<string, Page[]>();

    const query = searchQuery.trim().toLowerCase();

    for (const p of state.pages || []) {
      if (query && !p.title.toLowerCase().includes(query)) {
        continue;
      }

      if (p.is_pinned) {
        pinned.push(p);
      } else if (p.parent_id === null) {
        roots.push(p);
      }

      if (p.parent_id) {
        const list = map.get(p.parent_id) || [];
        list.push(p);
        map.set(p.parent_id, list);
      }
    }

    pinned.sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));
    roots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    return { pinnedPages: pinned, rootPages: roots, childrenMap: map };
  }, [state.pages, searchQuery]);

  const handleCreatePage = async (parentId: string | null = null) => {
    const newPage: Page = {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      parent_id: parentId,
      title: 'Nova Página',
      icon: '📄',
      content: '',
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await upsertPage(newPage);
    dispatch({ type: 'ADD_PAGE', page: newPage });
    onNavigateToPage(newPage.id);
    onCloseDrawer();
  };

  const handleLongPressPage = (page: Page) => {
    Alert.alert(
      page.title || 'Página',
      'Escolha uma ação:',
      [
        {
          text: page.is_pinned ? 'Desafixar' : 'Fixar no Topo',
          onPress: async () => {
            const updates = { is_pinned: page.is_pinned ? 0 : 1 };
            await upsertPage({ id: page.id, ...updates });
            dispatch({ type: 'UPDATE_PAGE', id: page.id, updates });
          },
        },
        {
          text: 'Criar Subpágina',
          onPress: () => handleCreatePage(page.id),
        },
        {
          text: 'Excluir Página',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirmar Exclusão', 'Deseja excluir esta página?', [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                  await deletePageLocal(page.id);
                  dispatch({ type: 'DELETE_PAGE', id: page.id });
                },
              },
            ]);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Bloquear Ambiente', 'Deseja bloquear o Caderno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'LOGOUT' });
          onCloseDrawer();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.moduleHeader}
          onPress={() => {
            onNavigateToHome();
            onCloseDrawer();
          }}
        >
          <BookOpen size={20} color={colors.brand400} />
          <Text style={styles.moduleTitle}>Caderno</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={syncNow}
          disabled={state.syncStatus === 'syncing'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <RefreshCw
            size={16}
            color={state.syncStatus === 'syncing' ? colors.brand400 : colors.darkSubtext}
          />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={14} color={colors.darkSubtext} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar páginas..."
          placeholderTextColor={colors.darkSubtext}
          style={styles.searchInput}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => handleCreatePage(null)}
        >
          <Plus size={16} color={colors.brand400} />
          <Text style={styles.newBtnText}>Nova Página</Text>
        </TouchableOpacity>
      </View>

      {/* Tree Scroll */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Pinned Section */}
        {pinnedPages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pin size={12} color={colors.darkSubtext} />
              <Text style={styles.sectionTitle}>Fixados</Text>
            </View>
            {pinnedPages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={[
                  styles.pinnedItem,
                  state.activePageId === page.id ? styles.activePinned : null,
                ]}
                onPress={() => {
                  onNavigateToPage(page.id);
                  onCloseDrawer();
                }}
                onLongPress={() => handleLongPressPage(page)}
              >
                <Text style={styles.pinnedIcon}>{page.icon || '📄'}</Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.pinnedTitle,
                    state.activePageId === page.id ? styles.activeTitle : null,
                  ]}
                >
                  {page.title || 'Sem Título'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Pages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Páginas</Text>
          {rootPages.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma página encontrada.</Text>
          ) : (
            rootPages.map((page) => (
              <PageTreeItem
                key={page.id}
                page={page}
                childrenMap={childrenMap}
                expandedNodes={state.expandedNodes}
                activePageId={state.activePageId}
                onToggleNode={(id) => dispatch({ type: 'TOGGLE_NODE', nodeId: id })}
                onSelectPage={(id) => {
                  onNavigateToPage(id);
                  onCloseDrawer();
                }}
                onLongPressPage={handleLongPressPage}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.moduleItem}
          onPress={() => {
            onNavigateToLibrary();
            onCloseDrawer();
          }}
        >
          <Library size={18} color={colors.brand400} />
          <Text style={styles.moduleItemText}>Biblioteca de Livros</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
        >
          <Lock size={16} color={colors.darkSubtext} />
          <Text style={styles.logoutText}>Bloquear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    paddingTop: 12,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  syncBtn: {
    padding: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.darkText,
    fontSize: 13,
  },
  actionRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  newBtnText: {
    color: colors.brand400,
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.darkSubtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  activePinned: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  pinnedIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  pinnedTitle: {
    fontSize: 13,
    color: colors.darkText,
    flex: 1,
  },
  activeTitle: {
    color: colors.brand400,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 12,
    color: colors.darkSubtext,
    fontStyle: 'italic',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  moduleItemText: {
    fontSize: 13,
    color: colors.darkText,
    fontWeight: '600',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  logoutText: {
    fontSize: 12,
    color: colors.darkSubtext,
    fontWeight: '500',
  },
});
