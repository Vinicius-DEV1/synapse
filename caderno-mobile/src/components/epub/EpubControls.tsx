import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  ArrowLeft,
  List,
  Bookmark,
  Type,
  Search,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface EpubTopBarProps {
  title: string;
  author: string;
  isBookmarked: boolean;
  onBack: () => void;
  onToggleToc: () => void;
  onToggleBookmark: () => void;
  onToggleTypography: () => void;
}

export const EpubTopBar: React.FC<EpubTopBarProps> = ({
  title,
  author,
  isBookmarked,
  onBack,
  onToggleToc,
  onToggleBookmark,
  onToggleTypography,
}) => {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
        <ArrowLeft size={20} color={colors.darkText} />
      </TouchableOpacity>

      <View style={styles.titleWrapper}>
        <Text numberOfLines={1} style={styles.title}>
          {title || 'Sem Título'}
        </Text>
        <Text numberOfLines={1} style={styles.author}>
          {author || 'Autor Desconhecido'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onToggleToc} style={styles.iconBtn}>
          <List size={18} color={colors.darkText} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleBookmark} style={styles.iconBtn}>
          <Bookmark
            size={18}
            color={isBookmarked ? colors.brand400 : colors.darkText}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleTypography} style={styles.iconBtn}>
          <Type size={18} color={colors.darkText} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface EpubBottomBarProps {
  currentChapterTitle: string;
  currentPageIndex: number;
  totalChapters: number;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export const EpubBottomBar: React.FC<EpubBottomBarProps> = ({
  currentChapterTitle,
  currentPageIndex,
  totalChapters,
  onPrevChapter,
  onNextChapter,
}) => {
  const progress =
    totalChapters > 0 ? Math.round(((currentPageIndex + 1) / totalChapters) * 100) : 0;

  return (
    <View style={styles.bottomBar}>
      <View style={styles.bottomInfo}>
        <Text numberOfLines={1} style={styles.chapterTitle}>
          {currentChapterTitle}
        </Text>
        <Text style={styles.progressText}>
          {currentPageIndex + 1} de {totalChapters} ({progress}%)
        </Text>
      </View>

      {/* Progress Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    zIndex: 50,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  author: {
    fontSize: 11,
    color: colors.darkSubtext,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomBar: {
    backgroundColor: 'rgba(15, 14, 23, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 8,
    zIndex: 50,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterTitle: {
    fontSize: 12,
    color: colors.darkSubtext,
    flex: 1,
  },
  progressText: {
    fontSize: 12,
    color: colors.brand400,
    fontWeight: '600',
    marginLeft: 8,
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.brand500,
  },
});
