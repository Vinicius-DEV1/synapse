import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Text } from 'react-native';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface EditorToolbarProps {
  onInsertSyntax: (cmd: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onInsertSyntax }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
      >
        <TouchableOpacity
          onPress={() => onInsertSyntax('bold')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Bold size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('italic')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Italic size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('underline')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Underline size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('h1')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Heading1 size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('h2')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Heading2 size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('h3')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Heading3 size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('taskList')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <CheckSquare size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('bulletList')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <List size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('orderedList')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <ListOrdered size={18} color={colors.brand400} />
        </TouchableOpacity>

        {/* Table button */}
        <TouchableOpacity
          onPress={() => onInsertSyntax('table')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Text style={styles.tableIconText}>⊞</Text>
        </TouchableOpacity>

        {/* Toggle / Accordion button */}
        <TouchableOpacity
          onPress={() => onInsertSyntax('toggle')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <ChevronDown size={18} color={colors.brand400} />
        </TouchableOpacity>

        {/* Callout Tip */}
        <TouchableOpacity
          onPress={() => onInsertSyntax('calloutTip')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Text style={styles.emojiIcon}>💡</Text>
        </TouchableOpacity>

        {/* Callout Warning */}
        <TouchableOpacity
          onPress={() => onInsertSyntax('calloutWarn')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <ShieldAlert size={18} color={colors.warning} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('blockquote')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Quote size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('codeBlock')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Code size={18} color={colors.brand400} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onInsertSyntax('hr')}
          style={styles.toolButton}
          activeOpacity={0.6}
        >
          <Text style={styles.hrIconText}>—</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    backgroundColor: 'rgba(21, 19, 36, 0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  toolButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableIconText: {
    color: colors.brand400,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  emojiIcon: {
    fontSize: 16,
  },
  hrIconText: {
    color: colors.brand400,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
