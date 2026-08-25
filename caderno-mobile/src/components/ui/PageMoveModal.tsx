import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { FolderRoot, Folder } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { Page } from '../../types/notes';

interface PageMoveModalProps {
  visible: boolean;
  pages: Page[];
  currentPageId: string;
  onMove: (newParentId: string | null) => void;
  onClose: () => void;
}

export const PageMoveModal: React.FC<PageMoveModalProps> = ({
  visible,
  pages,
  currentPageId,
  onMove,
  onClose,
}) => {
  const eligibleParents = pages.filter((p) => p.id !== currentPageId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Mover Página Para...</Text>
              <ScrollView style={styles.list}>
                {/* Raiz */}
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    onMove(null);
                    onClose();
                  }}
                >
                  <FolderRoot size={18} color={colors.brand400} />
                  <Text style={styles.itemText}>Raiz (Sem Página Pai)</Text>
                </TouchableOpacity>

                {eligibleParents.map((page) => (
                  <TouchableOpacity
                    key={page.id}
                    style={styles.item}
                    onPress={() => {
                      onMove(page.id);
                      onClose();
                    }}
                  >
                    <Folder size={18} color={colors.darkSubtext} />
                    <Text style={styles.itemText}>
                      {page.icon} {page.title || 'Sem Título'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.darkCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    width: '100%',
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: colors.darkText,
    flex: 1,
  },
});
