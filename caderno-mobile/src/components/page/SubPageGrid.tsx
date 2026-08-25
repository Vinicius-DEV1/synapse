import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { Card } from '../ui/Card';
import type { Page } from '../../types/notes';

interface SubPageGridProps {
  subPages: Page[];
  onNavigate: (pageId: string) => void;
  onCreateSubPage: () => void;
}

export const SubPageGrid: React.FC<SubPageGridProps> = ({
  subPages,
  onNavigate,
  onCreateSubPage,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Subpáginas ({subPages.length})</Text>
      <View style={styles.grid}>
        {subPages.map((page) => (
          <Card
            key={page.id}
            style={styles.card}
            onPress={() => onNavigate(page.id)}
          >
            <Text style={styles.icon}>{page.icon || '📄'}</Text>
            <Text numberOfLines={2} style={styles.title}>
              {page.title || 'Sem Título'}
            </Text>
          </Card>
        ))}

        <TouchableOpacity
          style={styles.addCard}
          onPress={onCreateSubPage}
          activeOpacity={0.7}
        >
          <Plus size={20} color={colors.brand400} />
          <Text style={styles.addText}>Nova Subpágina</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkSubtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    padding: 14,
    minHeight: 80,
    justifyContent: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.darkText,
  },
  addCard: {
    width: '48%',
    padding: 14,
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addText: {
    fontSize: 12,
    color: colors.brand400,
    fontWeight: '500',
  },
});
