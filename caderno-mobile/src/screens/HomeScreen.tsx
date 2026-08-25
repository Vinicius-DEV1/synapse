import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Plus,
  Calendar,
  BrainCircuit,
  Pin,
  Clock,
  BookOpen,
  ChevronRight,
  Menu,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import { IconBadge } from '../components/ui/IconBadge';
import { BookCard } from '../components/library/BookCard';
import { upsertPage } from '../services/db';
import type { Page } from '../types/notes';

interface HomeScreenProps {
  onOpenDrawer: () => void;
  onNavigateToPage: (pageId: string) => void;
  onNavigateToLibrary: () => void;
  onNavigateToBook: (bookId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenDrawer,
  onNavigateToPage,
  onNavigateToLibrary,
  onNavigateToBook,
}) => {
  const { state, dispatch } = useAppStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const pinnedPages = (state.pages || [])
    .filter((p) => Boolean(p.is_pinned))
    .sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const pinnedIds = new Set(pinnedPages.map((p) => p.id));
  const recentPages = (state.pages || [])
    .filter((p) => !pinnedIds.has(p.id))
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
    )
    .slice(0, 6);

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'recentemente';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'recentemente';
    const diff = Date.now() - time;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const handleCreateNewPage = async () => {
    const newPage: Page = {
      id: 'p_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      parent_id: null,
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
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onOpenDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={22} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caderno</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>{getGreeting()}! 👋</Text>
          <Text style={styles.dateText}>Hoje é {formattedDate}</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <Card
            style={styles.quickCard}
            onPress={handleCreateNewPage}
            variant="highlight"
          >
            <IconBadge bg="rgba(139, 92, 246, 0.2)" size={38}>
              <Plus size={20} color={colors.brand400} />
            </IconBadge>
            <Text style={styles.quickLabel}>Nova Página</Text>
          </Card>

          <Card
            style={styles.quickCard}
            onPress={onNavigateToLibrary}
          >
            <IconBadge bg="rgba(16, 185, 129, 0.15)" size={38}>
              <BookOpen size={20} color={colors.success} />
            </IconBadge>
            <Text style={styles.quickLabel}>Biblioteca</Text>
          </Card>

          <Card
            style={styles.quickCard}
            onPress={() => Alert.alert('Agenda', 'O módulo completo de Agenda / Calendário será integrado na próxima atualização mobile.')}
          >
            <IconBadge bg="rgba(245, 158, 11, 0.15)" size={38}>
              <Calendar size={20} color={colors.warning} />
            </IconBadge>
            <Text style={styles.quickLabel}>Agenda</Text>
          </Card>

          <Card
            style={styles.quickCard}
            onPress={() => Alert.alert('Flashcards', 'O módulo de Flashcards / Anki FSRS será integrado na próxima atualização mobile.')}
          >
            <IconBadge bg="rgba(59, 130, 246, 0.15)" size={38}>
              <BrainCircuit size={20} color={colors.info} />
            </IconBadge>
            <Text style={styles.quickLabel}>Flashcards</Text>
          </Card>
        </View>

        {/* Library Carousel Section */}
        {state.books && state.books.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Biblioteca de Livros</Text>
              <TouchableOpacity
                onPress={onNavigateToLibrary}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.seeAllText}>Ver todos →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.booksScrollContent}
            >
              {state.books.slice(0, 6).map((book) => (
                <View key={book.id} style={styles.carouselBookItem}>
                  <BookCard
                    book={book}
                    onPress={() => onNavigateToBook(book.id)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Pinned Pages Section */}
        {pinnedPages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconRow}>
                <Pin size={16} color={colors.brand400} />
                <Text style={styles.sectionTitle}>Fixadas</Text>
              </View>
            </View>
            <View style={styles.pagesList}>
              {pinnedPages.map((page) => (
                <TouchableOpacity
                  key={page.id}
                  style={styles.pageItem}
                  onPress={() => onNavigateToPage(page.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pageIcon}>{page.icon || '📄'}</Text>
                  <Text numberOfLines={1} style={styles.pageTitle}>
                    {page.title || 'Sem Título'}
                  </Text>
                  <ChevronRight size={16} color={colors.darkSubtext} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Pages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconRow}>
              <Clock size={16} color={colors.info} />
              <Text style={styles.sectionTitle}>Recentes</Text>
            </View>
          </View>
          {recentPages.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma página recente.</Text>
          ) : (
            <View style={styles.pagesList}>
              {recentPages.map((page) => (
                <TouchableOpacity
                  key={page.id}
                  style={styles.pageItem}
                  onPress={() => onNavigateToPage(page.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pageIcon}>{page.icon || '📄'}</Text>
                  <View style={styles.pageTitleWrapper}>
                    <Text numberOfLines={1} style={styles.pageTitle}>
                      {page.title || 'Sem Título'}
                    </Text>
                    <Text style={styles.pageRelativeTime}>
                      {formatRelativeTime(page.updated_at)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.darkSubtext} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNewPage}
        activeOpacity={0.8}
      >
        <Plus size={26} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
  },
  menuButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  headerSpacer: {
    width: 34,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: colors.darkSubtext,
    textTransform: 'capitalize',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  quickCard: {
    width: '48%',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkText,
    flex: 1,
  },
  section: {
    marginBottom: 26,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  seeAllText: {
    fontSize: 12,
    color: colors.brand400,
    fontWeight: '600',
  },
  booksScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  carouselBookItem: {
    width: 150,
  },
  pagesList: {
    gap: 8,
  },
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pageIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  pageTitleWrapper: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 14,
    color: colors.darkText,
    fontWeight: '500',
  },
  pageRelativeTime: {
    fontSize: 11,
    color: colors.darkSubtext,
    marginTop: 2,
  },
  emptyText: {
    color: colors.darkSubtext,
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand500,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.brand500,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
});
