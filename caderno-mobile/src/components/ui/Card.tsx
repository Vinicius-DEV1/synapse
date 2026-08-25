import React from 'react';
import { View, StyleSheet, TouchableOpacity, type ViewStyle, type StyleProp } from 'react-native';
import { colors } from '../../theme/colors';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'surface' | 'highlight';
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, variant = 'default' }) => {
  const bgStyle =
    variant === 'surface'
      ? styles.surface
      : variant === 'highlight'
      ? styles.highlight
      : styles.default;

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.card, bgStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, bgStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: colors.darkCard,
  },
  surface: {
    backgroundColor: colors.darkSurface,
  },
  highlight: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: colors.borderHighlight,
  },
});
