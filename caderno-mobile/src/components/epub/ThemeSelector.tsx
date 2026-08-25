import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import type { ReadingMode } from '../../types/library';

interface ThemeSelectorProps {
  currentTheme: ReadingMode;
  onSelectTheme: (theme: ReadingMode) => void;
  fontSize: number;
  onChangeFontSize: (delta: number) => void;
}

const THEMES: { id: ReadingMode; name: string; bg: string; text: string }[] = [
  { id: 'dark', name: 'Escuro', bg: '#1a1a2e', text: '#fffffe' },
  { id: 'sepia', name: 'Sépia', bg: '#f4ecd8', text: '#5b4636' },
  { id: 'mint', name: 'Menta', bg: '#e8f5e9', text: '#1b4332' },
  { id: 'dim', name: 'Cinza', bg: '#2d2d30', text: '#d4d4d4' },
  { id: 'nord', name: 'Nord', bg: '#2e3440', text: '#eceff4' },
  { id: 'midnight', name: 'Meia-noite', bg: '#0f172a', text: '#f8fafc' },
  { id: 'high-contrast', name: 'AMOLED', bg: '#000000', text: '#ffffff' },
  { id: 'light', name: 'Claro', bg: '#ffffff', text: '#111827' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
}) => {
  return (
    <View style={styles.container}>
      {/* Font Size controls */}
      <View style={styles.fontRow}>
        <Text style={styles.sectionLabel}>Tamanho do Texto ({fontSize}px)</Text>
        <View style={styles.fontButtons}>
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => onChangeFontSize(-2)}
          >
            <Text style={styles.fontBtnText}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fontBtn}
            onPress={() => onChangeFontSize(2)}
          >
            <Text style={styles.fontBtnText}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Themes Grid */}
      <Text style={styles.sectionLabel}>Tema Visual</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themesRow}
      >
        {THEMES.map((th) => {
          const isSelected = currentTheme === th.id;
          return (
            <TouchableOpacity
              key={th.id}
              style={[
                styles.themeBubble,
                { backgroundColor: th.bg },
                isSelected ? styles.selectedBubble : null,
              ]}
              onPress={() => onSelectTheme(th.id)}
            >
              <Text style={[styles.themeLabel, { color: th.text }]}>
                {th.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.darkSurface,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.darkSubtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fontButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fontBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  fontBtnText: {
    color: colors.darkText,
    fontWeight: 'bold',
    fontSize: 14,
  },
  themesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  themeBubble: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBubble: {
    borderColor: colors.brand500,
    borderWidth: 2,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
