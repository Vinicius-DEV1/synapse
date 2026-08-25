import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { Page } from '../../types/notes';

interface BreadcrumbsProps {
  pages: Page[];
  currentPageId: string;
  onNavigate: (pageId: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  pages,
  currentPageId,
  onNavigate,
}) => {
  const getPath = (pageId: string): Page[] => {
    const path: Page[] = [];
    let current = pages.find((p) => p.id === pageId);
    while (current) {
      path.unshift(current);
      current = current.parent_id ? pages.find((p) => p.id === current?.parent_id) : undefined;
    }
    return path;
  };

  const path = getPath(currentPageId);
  if (path.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {path.map((item, index) => {
        const isLast = index === path.length - 1;
        return (
          <View key={item.id} style={styles.crumbItem}>
            {index > 0 && (
              <ChevronRight size={14} color={colors.darkSubtext} style={styles.separator} />
            )}
            <TouchableOpacity
              onPress={() => onNavigate(item.id)}
              disabled={isLast}
              style={styles.touchable}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.crumbText,
                  isLast ? styles.activeCrumb : styles.inactiveCrumb,
                ]}
              >
                {item.icon} {item.title || 'Sem Título'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    marginHorizontal: 4,
    opacity: 0.5,
  },
  touchable: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  crumbText: {
    fontSize: 13,
  },
  inactiveCrumb: {
    color: colors.darkSubtext,
  },
  activeCrumb: {
    color: colors.brand400,
    fontWeight: '600',
  },
});
