import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Search, ArrowLeft, BookOpen, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';
import { BookCard } from '../components/library/BookCard';
import { FilterChips } from '../components/library/FilterChips';
import { deleteBookLocal, upsertBook } from '../services/db';
import { parseEpubBuffer, isPdfBuffer } from '../services/epubParser';
import type { LibraryBook, ReadingStatus } from '../types/library';

interface LibraryScreenProps {
  onBack: () => void;
  onNavigateToBook: (bookId: string) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  onBack,
  onNavigateToBook,
}) => {
  const { state, dispatch } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');

  const filteredBooks = useMemo(() => {
    return (state.books || []).filter((b) => {
      const matchQuery =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'all' || b.reading_status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [state.books, searchQuery, statusFilter]);

  const handleImportNewBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      // 1. PDF File
      if (isPdfBuffer(arrayBuffer) || asset.name.toLowerCase().endsWith('.pdf')) {
        const cleanTitle = asset.name.replace(/\.pdf$/i, '') || 'Documento PDF';
        const newBook: LibraryBook = {
          id: 'book_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          title: cleanTitle,
          author: 'Documento PDF',
          cover_image: '',
          file_path: asset.uri,
          original_name: asset.name,
          total_pages: 1,
          last_read_page: 1,
          reading_status: 'reading',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_read_at: new Date().toISOString(),
        };

        await upsertBook(newBook);
        dispatch({ type: 'ADD_BOOK', book: newBook });
        onNavigateToBook(newBook.id);
        return;
      }

      // 2. EPUB File
      const parsed = parseEpubBuffer(arrayBuffer);

      const newBook: LibraryBook = {
        id: 'book_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        title: parsed.title || asset.name.replace(/\.epub$/i, ''),
        author: parsed.creator || 'Autor Desconhecido',
        cover_image: parsed.coverBase64 || '',
        file_path: asset.uri,
        original_name: asset.name,
        total_pages: parsed.chapters.length,
        last_read_page: 1,
        reading_status: 'reading',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_read_at: new Date().toISOString(),
      };

      await upsertBook(newBook);
      dispatch({ type: 'ADD_BOOK', book: newBook });
      onNavigateToBook(newBook.id);
    } catch (err: any) {
      console.error('Erro ao importar livro:', err);
      Alert.alert('Erro ao importar livro', err?.message || 'Arquivo inválido.');
    }
  };

  const handleLongPressBook = (book: LibraryBook) => {
    Alert.alert(
      book.title || 'Livro',
      'Escolha uma ação:',
      [
        {
          text: 'Marcar como Lendo',
          onPress: async () => {
            const updates = { reading_status: 'reading' as ReadingStatus };
            await upsertBook({ id: book.id, ...updates });
            dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
          },
        },
        {
          text: 'Marcar como Concluído',
          onPress: async () => {
            const updates = { reading_status: 'finished' as ReadingStatus };
            await upsertBook({ id: book.id, ...updates });
            dispatch({ type: 'UPDATE_BOOK', id: book.id, updates });
          },
        },
        {
          text: 'Excluir do Dispositivo',
          style: 'destructive',
          onPress: async () => {
            await deleteBookLocal(book.id);
            dispatch({ type: 'DELETE_BOOK', id: book.id });
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biblioteca</Text>
        <TouchableOpacity
          style={styles.importBtn}
          onPress={handleImportNewBook}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Plus size={20} color={colors.brand400} />
          <Text style={styles.importBtnText}>Importar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color={colors.darkSubtext} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar livros por título ou autor..."
            placeholderTextColor={colors.darkSubtext}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter Chips */}
        <FilterChips
          selectedStatus={statusFilter}
          onSelectStatus={setStatusFilter}
        />

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <BookOpen size={36} color={colors.darkSubtext} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum livro encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Tente buscar com outro termo.'
                : 'Seus livros sincronizados do Caderno aparecerão aqui.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyImportBtn}
              onPress={handleImportNewBook}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.emptyImportBtnText}>Importar Arquivo .epub</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredBooks.map((book) => (
              <View key={book.id} style={styles.gridItem}>
                <BookCard
                  book={book}
                  onPress={() => onNavigateToBook(book.id)}
                  onLongPress={() => handleLongPressBook(book)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  importBtnText: {
    color: colors.brand400,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.darkText,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  gridItem: {
    width: '48%',
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.darkSubtext,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: 20,
  },
  emptyImportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand500,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyImportBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
