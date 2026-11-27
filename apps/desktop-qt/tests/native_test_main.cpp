#include <QtGui/QGuiApplication>
#include <cstring>

int runNativeNotesTest(int argc, char **argv);
int runNativeNotesOpenAnswerControllerTest(int argc, char **argv);
int runNativeNotesShortcutsTest(int argc, char **argv);
int runNativeNotesAssistantActionsTest(int argc, char **argv);
int runNativeNotesAiSessionTest(int argc, char **argv);
int runNativeNotesAiMarkdownTest(int argc, char **argv);
int runNativeNotesAiToggleTargetTest(int argc, char **argv);
int runNativeNotesPageSwitchTest(int argc, char **argv);
int runNativeNotesPageSwitchCoreTest(int argc, char **argv);
int runNativeNotesTableFilterPersistenceTest(int argc, char **argv);
int runNativeNotesDroppedFileTest(int argc, char **argv);
int runNativeNotesCursorSplitTest(int argc, char **argv);
int runNativeNotesPageHistoryTest(int argc, char **argv);
int runNativeNotesPageHistoryKeyboardTest(int argc, char **argv);
int runNativeNotesPageHeaderActionTest(int argc, char **argv);
int runNativeNotesLinkVaultTest(int argc, char **argv);
int runNativeNotesRichImagesTest(int argc, char **argv);
int runNativeNotesRichImageClipboardTest(int argc, char **argv);
int runNativeNotesReferenceSearchTest(int argc, char **argv);
int runNativeNotesRichTablesTest(int argc, char **argv);
int runNativeNotesTableMergeTest(int argc, char **argv);
int runNativeNotesTableBackgroundSelectionTest(int argc, char **argv);
int runNativeNotesTableClearFormattingTest(int argc, char **argv);
int runNativeNotesTableCellSelectionTest(int argc, char **argv);
int runNativeNotesTableStructureTest(int argc, char **argv);
int runNativeNotesCalloutTest(int argc, char **argv);
int runNativeNotesCodeLanguageTest(int argc, char **argv);
int runNativeNotesDividerDragTest(int argc, char **argv);
int runNativeFinanceTest(int argc, char **argv);
int runNativeQuestionsTest(int argc, char **argv);
int runNativeCalendarTest(int argc, char **argv);
int runNativeVideoTest(int argc, char **argv);
int runNativeVideoSubtitleTest(int argc, char **argv);
int runNativeLibraryTest(int argc, char **argv);
int runNativeLibraryCoverTest(int argc, char **argv);
int runNativeFilesTest(int argc, char **argv);
int runNativeVaultCryptoTest(int argc, char **argv);
int runNativeAnkiTest(int argc, char **argv);
int runNativeHabitsTest(int argc, char **argv);
int runNativeCultureTest(int argc, char **argv);
int runNativeFocusTest(int argc, char **argv);
int runNativeNotificationsTest(int argc, char **argv);
int runNativeTrashTest(int argc, char **argv);
int runNativeSettingsTest(int argc, char **argv);
int runNativeHomeTest(int argc, char **argv);
int runNativeLayoutTest(int argc, char **argv);
int runNativeDiagramsTest(int argc, char **argv);
int runNativePracticeTest(int argc, char **argv);

int main(int argc, char **argv) {
    QGuiApplication application(argc, argv);
    if (argc > 1 && std::strcmp(argv[1], "--suite=questions") == 0) {
        return runNativeQuestionsTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-open-answer") == 0) {
        return runNativeNotesOpenAnswerControllerTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-shortcuts") == 0) {
        return runNativeNotesShortcutsTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-assistant-actions") == 0) {
        return runNativeNotesAssistantActionsTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-page-switch") == 0) {
        int result = runNativeNotesPageSwitchTest(argc - 1, argv + 1);
        result |= runNativeNotesPageSwitchCoreTest(argc - 1, argv + 1);
        return result;
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-table-filter") == 0) {
        return runNativeNotesTableFilterPersistenceTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-dropped-files") == 0) {
        return runNativeNotesDroppedFileTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-cursor-split") == 0) {
        return runNativeNotesCursorSplitTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-history") == 0) {
        int result = runNativeNotesPageHistoryTest(argc - 1, argv + 1);
        result |= runNativeNotesPageHistoryKeyboardTest(argc - 1, argv + 1);
        return result;
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-page-header-actions") == 0) {
        return runNativeNotesPageHeaderActionTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-ai-block-apply") == 0) {
        char testName[] = "pageViewEditsFlushAndStateParity";
        char *testArguments[] = {argv[0], testName};
        return runNativeNotesTest(2, testArguments);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-ai-session") == 0) {
        return runNativeNotesAiSessionTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-ai-markdown") == 0) {
        return runNativeNotesAiMarkdownTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=notes-ai-toggle-targets") == 0) {
        return runNativeNotesAiToggleTargetTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=files") == 0) {
        return runNativeFilesTest(argc - 1, argv + 1);
    }
    if (argc > 1 && std::strcmp(argv[1], "--suite=library") == 0) {
        return runNativeLibraryTest(argc - 1, argv + 1);
    }

    int result = 0;
    result |= runNativeNotesTest(argc, argv);
    result |= runNativeNotesOpenAnswerControllerTest(argc, argv);
    result |= runNativeNotesShortcutsTest(argc, argv);
    result |= runNativeNotesAssistantActionsTest(argc, argv);
    result |= runNativeNotesAiMarkdownTest(argc, argv);
    result |= runNativeNotesPageSwitchTest(argc, argv);
    result |= runNativeNotesPageSwitchCoreTest(argc, argv);
    result |= runNativeNotesPageHistoryTest(argc, argv);
    result |= runNativeNotesPageHistoryKeyboardTest(argc, argv);
    result |= runNativeNotesPageHeaderActionTest(argc, argv);
    result |= runNativeNotesLinkVaultTest(argc, argv);
    result |= runNativeNotesRichImagesTest(argc, argv);
    result |= runNativeNotesRichImageClipboardTest(argc, argv);
    result |= runNativeNotesReferenceSearchTest(argc, argv);
    result |= runNativeNotesRichTablesTest(argc, argv);
    result |= runNativeNotesTableMergeTest(argc, argv);
    result |= runNativeNotesTableBackgroundSelectionTest(argc, argv);
    result |= runNativeNotesTableClearFormattingTest(argc, argv);
    result |= runNativeNotesTableCellSelectionTest(argc, argv);
    result |= runNativeNotesTableStructureTest(argc, argv);
    result |= runNativeNotesCalloutTest(argc, argv);
    result |= runNativeNotesCodeLanguageTest(argc, argv);
    result |= runNativeNotesDividerDragTest(argc, argv);
    result |= runNativeFinanceTest(argc, argv);
    result |= runNativeQuestionsTest(argc, argv);
    result |= runNativeCalendarTest(argc, argv);
    result |= runNativeVideoTest(argc, argv);
    result |= runNativeVideoSubtitleTest(argc, argv);
    result |= runNativeLibraryTest(argc, argv);
    result |= runNativeLibraryCoverTest(argc, argv);
    result |= runNativeFilesTest(argc, argv);
    result |= runNativeVaultCryptoTest(argc, argv);
    result |= runNativeAnkiTest(argc, argv);
    result |= runNativeHabitsTest(argc, argv);
    result |= runNativeCultureTest(argc, argv);
    result |= runNativeFocusTest(argc, argv);
    result |= runNativeNotificationsTest(argc, argv);
    result |= runNativeTrashTest(argc, argv);
    result |= runNativeSettingsTest(argc, argv);
    result |= runNativeHomeTest(argc, argv);
    result |= runNativeLayoutTest(argc, argv);
    result |= runNativeDiagramsTest(argc, argv);
    result |= runNativePracticeTest(argc, argv);
    return result;
}
