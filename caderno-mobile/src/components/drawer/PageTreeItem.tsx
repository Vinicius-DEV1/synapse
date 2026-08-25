import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import type { Page } from '../../types/notes';

interface PageTreeItemProps {
  page: Page;
  depth?: number;
  childrenMap: Map<string, Page[]>;
  expandedNodes: string[];
  activePageId: string | null;
  onToggleNode: (id: string) => void;
  onSelectPage: (id: string) => void;
  onLongPressPage: (page: Page) => void;
}

export const PageTreeItem: React.FC<PageTreeItemProps> = ({
  page,
  depth = 0,
  childrenMap,
  expandedNodes,
  activePageId,
  onToggleNode,
  onSelectPage,
  onLongPressPage,
}) => {
  const childPages = childrenMap.get(page.id) || [];
  const hasChildren = childPages.length > 0;
  const isExpanded = expandedNodes.includes(page.id);
  const isActive = activePageId === page.id;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.itemRow,
          { paddingLeft: 12 + depth * 16 },
          isActive ? styles.activeRow : null,
        ]}
        onPress={() => onSelectPage(page.id)}
        onLongPress={() => onLongPressPage(page)}
        activeOpacity={0.7}
      >
        {hasChildren ? (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => onToggleNode(page.id)}
          >
            {isExpanded ? (
              <ChevronDown size={14} color={colors.darkSubtext} />
            ) : (
              <ChevronRight size={14} color={colors.darkSubtext} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.expandSpacer} />
        )}

        <Text style={styles.icon}>{page.icon || '📄'}</Text>
        <Text
          numberOfLines={1}
          style={[styles.title, isActive ? styles.activeTitle : null]}
        >
          {page.title || 'Sem Título'}
        </Text>
      </TouchableOpacity>

      {hasChildren && isExpanded && (
        <View>
          {childPages.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              expandedNodes={expandedNodes}
              activePageId={activePageId}
              onToggleNode={onToggleNode}
              onSelectPage={onSelectPage}
              onLongPressPage={onLongPressPage}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  activeRow: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  expandButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandSpacer: {
    width: 20,
  },
  icon: {
    fontSize: 15,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    color: colors.darkText,
    flex: 1,
  },
  activeTitle: {
    color: colors.brand400,
    fontWeight: '600',
  },
});
