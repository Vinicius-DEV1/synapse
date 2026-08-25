import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { LibraryBook, ReadingStatus } from '../../types/library';

interface BookCardProps {
  book: LibraryBook;
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const STATUS_COLORS: Record<ReadingStatus, string> = {
  not_started: '#6b7280',
  reading: '#10b981',
  finished: '#8b5cf6',
};

export const BookCard: React.FC<BookCardProps> = ({ book, onPress, onLongPress, style }) => {
  const isEpub =
    book.file_path?.toLowerCase().includes('.epub') ||
    book.title?.toLowerCase().endsWith('.epub') ||
    book.original_name?.toLowerCase().endsWith('.epub');

  const currentPage =
    typeof book.last_read_page === 'number'
      ? book.last_read_page
      : Number(book.last_read_page || 1);

  const totalPages = book.total_pages || 0;
  const progress = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  // Clean title: remove .epub or .pdf or OceanofPDF prefixes
  const cleanTitle = (book.title || 'Sem Título')
    .replace(/^(_OceanofPDF\.com_|_OceanofPDF_)/i, '')
    .replace(/\.(epub|pdf)$/i, '');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, style]}
    >
      {/* Cover image / placeholder */}
      <View style={styles.coverContainer}>
        {book.cover_image ? (
          <Image
            source={{ uri: book.cover_image }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <View style={styles.iconCircle}>
              <BookOpen size={28} color={colors.brand400} />
            </View>
          </View>
        )}

        {/* Format Badge */}
        <View style={styles.formatBadge}>
          <Text style={styles.formatText}>{isEpub ? 'EPUB' : 'PDF'}</Text>
        </View>
      </View>

      {/* Book Metadata */}
      <View style={styles.metaContainer}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: STATUS_COLORS[book.reading_status as ReadingStatus] || '#6b7280' },
            ]}
          />
          <Text numberOfLines={2} style={styles.title}>
            {cleanTitle}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.author}>
          {book.author && book.author !== 'Desconhecido' ? book.author : 'Autor Desconhecido'}
        </Text>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.darkCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: '#1b1928',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  formatText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  metaContainer: {
    padding: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
    minHeight: 34,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.darkText,
    lineHeight: 16,
  },
  author: {
    fontSize: 11,
    color: colors.darkSubtext,
    marginBottom: 8,
    paddingLeft: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand400,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.darkSubtext,
    fontWeight: '600',
    minWidth: 26,
    textAlign: 'right',
  },
});
