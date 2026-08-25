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
import { colors } from '../../theme/colors';

const POPULAR_EMOJIS = [
  '📄', '📝', '📓', '📚', '📖', '💡', '✨', '⭐', '🔥', '🚀',
  '🎯', '📌', '🎨', '💻', '🧠', '⚙️', '📊', '💼', '🏆', '🎉',
  '💰', '🌱', '☀️', '🌙', '🔒', '🔑', '🌍', '🏠', '✈️', '⚡'
];

interface EmojiPickerModalProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPickerModal: React.FC<EmojiPickerModalProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
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
              <Text style={styles.modalTitle}>Escolha um Ícone</Text>
              <ScrollView contentContainerStyle={styles.emojiGrid}>
                {POPULAR_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiItem}
                    onPress={() => {
                      onSelect(emoji);
                      onClose();
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
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
    maxHeight: 320,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  emojiItem: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
