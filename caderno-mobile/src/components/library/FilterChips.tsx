import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import type { ReadingStatus } from '../../types/library';

interface FilterChipsProps {
  selectedStatus: ReadingStatus | 'all';
  onSelectStatus: (status: ReadingStatus | 'all') => void;
}

const CHIPS: { id: ReadingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'reading', label: 'Lendo' },
  { id: 'not_started', label: 'Não Iniciados' },
  { id: 'finished', label: 'Concluídos' },
];

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedStatus,
  onSelectStatus,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CHIPS.map((chip) => {
        const isSelected = selectedStatus === chip.id;
        return (
          <TouchableOpacity
            key={chip.id}
            style={[styles.chip, isSelected ? styles.activeChip : null]}
            onPress={() => onSelectStatus(chip.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.chipText, isSelected ? styles.activeChipText : null]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  activeChip: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: colors.brand500,
  },
  chipText: {
    fontSize: 13,
    color: colors.darkSubtext,
    fontWeight: '500',
  },
  activeChipText: {
    color: colors.brand400,
    fontWeight: '600',
  },
});
