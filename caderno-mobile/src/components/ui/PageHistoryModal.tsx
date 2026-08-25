import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Clock, History, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { getDb } from '../../services/db';
import type { PageHistoryEntry } from '../../types/notes';

interface PageHistoryModalProps {
  visible: boolean;
  pageId: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export const PageHistoryModal: React.FC<PageHistoryModalProps> = ({
  visible,
  pageId,
  onRestore,
  onClose,
}) => {
  const [history, setHistory] = useState<PageHistoryEntry[]>([]);

  useEffect(() => {
    if (visible && pageId) {
      getDb().then((db) => {
        db.getAllAsync<PageHistoryEntry>(
          'SELECT * FROM page_history WHERE page_id = ? ORDER BY created_at DESC',
          [pageId]
        ).then(setHistory);
      });
    }
  }, [visible, pageId]);

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
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <History size={20} color={colors.brand400} />
                  <Text style={styles.modalTitle}>Histórico de Versões</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={18} color={colors.darkSubtext} />
                </TouchableOpacity>
              </View>

              {history.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nenhuma versão anterior registrada.</Text>
                </View>
              ) : (
                <ScrollView style={styles.list}>
                  {history.map((entry) => (
                    <View key={entry.id} style={styles.entryItem}>
                      <View style={styles.entryInfo}>
                        <Clock size={14} color={colors.darkSubtext} />
                        <Text style={styles.entryDate}>
                          {new Date(entry.created_at).toLocaleString('pt-BR')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={() => {
                          onRestore(entry.content);
                          onClose();
                        }}
                      >
                        <Text style={styles.restoreText}>Restaurar</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
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
    maxHeight: 450,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
  },
  closeButton: {
    padding: 4,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.darkSubtext,
    fontSize: 14,
  },
  list: {
    maxHeight: 320,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 8,
  },
  entryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryDate: {
    color: colors.darkText,
    fontSize: 13,
  },
  restoreButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  restoreText: {
    color: colors.brand400,
    fontSize: 12,
    fontWeight: '600',
  },
});
