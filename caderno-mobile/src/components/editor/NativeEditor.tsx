import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { colors } from '../../theme/colors';
import { EditorToolbar } from './EditorToolbar';

interface NativeEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
}

export const NativeEditor: React.FC<NativeEditorProps> = ({
  initialContent = '',
  onSave,
}) => {
  const [content, setContent] = useState(initialContent);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChangeText = (text: string) => {
    setContent(text);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(text);
    }, 1500);
  };

  const handleSelectionChange = (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>
  ) => {
    setSelection(e.nativeEvent.selection);
  };

  const handleInsertSyntax = (prefix: string, suffix = '', defaultText = '') => {
    const { start, end } = selection;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    onSave(newContent);

    // Reposition cursor
    const newCursorPos = start + prefix.length + selectedText.length;
    setTimeout(() => {
      inputRef.current?.setNativeProps?.({
        selection: { start: newCursorPos, end: newCursorPos },
      });
    }, 50);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          ref={inputRef}
          multiline
          scrollEnabled={false}
          value={content}
          onChangeText={handleChangeText}
          onSelectionChange={handleSelectionChange}
          placeholder="Comece a escrever ou use a barra de ferramentas..."
          placeholderTextColor={colors.darkSubtext}
          style={styles.input}
          textAlignVertical="top"
        />
      </ScrollView>
      <EditorToolbar onInsertSyntax={handleInsertSyntax} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    minHeight: 250,
  },
  input: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.darkText,
    minHeight: 200,
  },
});
