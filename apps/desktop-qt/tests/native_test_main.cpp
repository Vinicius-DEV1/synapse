#include <QtGui/QGuiApplication>

int runNativeNotesTest(int argc, char **argv);
int runNativeNotesRichTablesTest(int argc, char **argv);
int runNativeNotesCalloutTest(int argc, char **argv);
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

int main(int argc, char **argv) {
    QGuiApplication application(argc, argv);
    int result = 0;
    result |= runNativeNotesTest(argc, argv);
    result |= runNativeNotesRichTablesTest(argc, argv);
    result |= runNativeNotesCalloutTest(argc, argv);
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
    return result;
}
