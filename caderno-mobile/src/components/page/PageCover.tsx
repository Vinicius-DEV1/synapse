import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface PageCoverProps {
  coverImage?: string | null;
  onUpdateCover: (url: string | null) => void;
}

export const PageCover: React.FC<PageCoverProps> = ({
  coverImage,
  onUpdateCover,
}) => {
  if (!coverImage) return null;

  return (
    <View style={styles.container}>
      <Image source={{ uri: coverImage }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onUpdateCover(null)}
        >
          <Trash2 size={16} color="#ffffff" />
          <Text style={styles.buttonText}>Remover Capa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.darkSurface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});
