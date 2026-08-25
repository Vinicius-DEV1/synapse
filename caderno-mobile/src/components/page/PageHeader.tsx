import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, FolderInput, Pin, Lock } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { EmojiPickerModal } from '../ui/EmojiPickerModal';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import type { Page } from '../../types/notes';

interface PageHeaderProps {
  page: Page;
  pages: Page[];
  onUpdatePage: (updates: Partial<Page>) => void;
  onNavigate: (pageId: string) => void;
  onOpenMoveModal: () => void;
  onOpenHistoryModal: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  page,
  pages,
  onUpdatePage,
  onNavigate,
  onOpenMoveModal,
  onOpenHistoryModal,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <View style={styles.container}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        pages={pages}
        currentPageId={page.id}
        onNavigate={onNavigate}
      />

      {/* Action Bar */}
      <View style={styles.topActions}>
        <TouchableOpacity
          style={[styles.actionBtn, page.is_pinned ? styles.actionBtnActive : null]}
          onPress={() => onUpdatePage({ is_pinned: page.is_pinned ? 0 : 1 })}
        >
          <Pin size={16} color={page.is_pinned ? colors.brand400 : colors.darkSubtext} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenMoveModal}>
          <FolderInput size={16} color={colors.darkSubtext} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onOpenHistoryModal}>
          <Clock size={16} color={colors.darkSubtext} />
        </TouchableOpacity>
      </View>

      {/* Emoji & Title */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={styles.emojiButton}
          onPress={() => setShowEmojiPicker(true)}
        >
          <Text style={styles.emojiText}>{page.icon || '📄'}</Text>
        </TouchableOpacity>

        <TextInput
          value={page.title === 'Sem Título' ? '' : page.title}
          placeholder="Sem Título"
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          onChangeText={(text) => onUpdatePage({ title: text || 'Sem Título' })}
          style={styles.titleInput}
          multiline
        />
      </View>

      {/* Description */}
      <TextInput
        value={page.description || ''}
        placeholder="Adicionar uma descrição..."
        placeholderTextColor="rgba(167, 169, 190, 0.4)"
        onChangeText={(text) => onUpdatePage({ description: text })}
        style={styles.descriptionInput}
        multiline
      />

      <EmojiPickerModal
        visible={showEmojiPicker}
        onSelect={(emoji) => onUpdatePage({ icon: emoji })}
        onClose={() => setShowEmojiPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
  },
  emojiButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emojiText: {
    fontSize: 32,
  },
  titleInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.darkText,
    paddingTop: 4,
    paddingBottom: 4,
  },
  descriptionInput: {
    fontSize: 14,
    color: colors.darkSubtext,
    marginTop: 8,
    paddingVertical: 4,
  },
});
