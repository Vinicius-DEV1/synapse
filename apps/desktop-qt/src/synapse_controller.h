#ifndef SYNAPSE_CONTROLLER_H
#define SYNAPSE_CONTROLLER_H

#include <QtCore/QObject>
#include <QtCore/QString>
#include <QtCore/QVariantList>
#include <QtCore/QVariantMap>
#include <QtCore/QStringList>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonObject>
#include <QtCore/QUuid>
#include <QtCore/QDateTime>
#include <QtCore/QDate>
#include <QtCore/QUrl>
#include <QtCore/QFutureWatcher>
#include <QtCore/QRandomGenerator>
#include <QtCore/QHash>
#include <QtCore/QVector>
#include <QtCore/QTimer>
#include <QtCore/QMap>
#include <QtCore/QTemporaryFile>
#include <atomic>
#include <functional>
#include <memory>
#include "synapse_bridge.h"

class QNetworkReply;

struct PasswordRemovalFileMigration {
    QString id;
    QString localPath;
    QString driveFileId;
    QString sourcePath;
    QString temporaryPath;
    QString backupPath;
    bool backupMoved = false;
    bool plaintextInstalled = false;
};

struct PasswordRemovalAssetMigration {
    QString id;
    QString sourcePath;
    QString temporaryPath;
    QString backupPath;
    bool backupMoved = false;
    bool plaintextInstalled = false;
};

struct VaultSetupAssetMigration {
    QString id;
    QString targetPath;
    QString stagedPath;
};

class SynapseDataController : public QObject {
    Q_OBJECT
    Q_PROPERTY(QString dbPath READ dbPath NOTIFY dbPathChanged)
    Q_PROPERTY(int pageCount READ pageCount NOTIFY countsChanged)
    Q_PROPERTY(int videoCount READ videoCount NOTIFY countsChanged)
    Q_PROPERTY(int deckCount READ deckCount NOTIFY countsChanged)
    Q_PROPERTY(int bookCount READ bookCount NOTIFY countsChanged)
    Q_PROPERTY(int cultureCount READ cultureCount NOTIFY countsChanged)
    Q_PROPERTY(int vaultItemCount READ vaultItemCount NOTIFY countsChanged)
    Q_PROPERTY(int transactionCount READ transactionCount NOTIFY countsChanged)
    Q_PROPERTY(int eventCount READ eventCount NOTIFY countsChanged)
    Q_PROPERTY(int habitCount READ habitCount NOTIFY countsChanged)
    Q_PROPERTY(int quizBatteryCount READ quizBatteryCount NOTIFY countsChanged)
    Q_PROPERTY(int focusSessionCount READ focusSessionCount NOTIFY countsChanged)
    Q_PROPERTY(int unreadNotificationCount READ unreadNotificationCount NOTIFY countsChanged)
    Q_PROPERTY(bool fileOperationRunning READ fileOperationRunning NOTIFY fileOperationStateChanged)
    Q_PROPERTY(bool librarySearchRunning READ librarySearchRunning NOTIFY librarySearchStateChanged)
    Q_PROPERTY(int vaultUnlockRemainingSeconds READ vaultUnlockRemainingSeconds NOTIFY vaultLockoutChanged)
    Q_PROPERTY(bool isVaultConfigured READ isVaultConfigured NOTIFY vaultStateChanged)
    Q_PROPERTY(bool isVaultUnlocked READ isVaultUnlocked NOTIFY vaultStateChanged)
    Q_PROPERTY(int autoLockMinutes READ autoLockMinutes WRITE setAutoLockMinutes NOTIFY autoLockMinutesChanged)
    Q_PROPERTY(QString vaultLockError READ vaultLockError NOTIFY vaultLockErrorChanged)

public:
    explicit SynapseDataController(QObject *parent = nullptr, bool initializeDefaultDatabase = true);
    ~SynapseDataController() override;

    bool openDatabase(const QString &customPath = "");
    QString dbPath() const { return m_dbPath; }
    int pageCount() const { return m_pageCount; }
    int videoCount() const { return m_videoCount; }
    int deckCount() const { return m_deckCount; }
    int bookCount() const { return m_bookCount; }
    int cultureCount() const { return m_cultureCount; }
    int vaultItemCount() const { return m_vaultItemCount; }
    int transactionCount() const { return m_transactionCount; }
    int eventCount() const { return m_eventCount; }
    int habitCount() const { return m_habitCount; }
    int quizBatteryCount() const { return m_quizBatteryCount; }
    int focusSessionCount() const { return m_focusSessionCount; }
    int unreadNotificationCount() const { return m_unreadNotificationCount; }
    bool fileOperationRunning() const { return m_fileOperationRunning; }
    bool librarySearchRunning() const { return m_librarySearchRunning; }
    int vaultUnlockRemainingSeconds() const;
    bool isVaultConfigured() const { return m_isVaultConfigured; }
    bool isVaultUnlocked() const { return m_isVaultUnlocked; }
    int autoLockMinutes() const { return m_autoLockMinutes; }
    void setAutoLockMinutes(int minutes);
    QString vaultLockError() const { return m_vaultLockError; }

    Q_INVOKABLE void refreshStats();
    Q_INVOKABLE bool executeSql(const QString &sql);

    // 1. Pages / Editor (Hierarchical & Pinned Support)
    Q_INVOKABLE QVariantList getPages(const QString &filter = "");
    Q_INVOKABLE QVariantList getPinnedPages();
    Q_INVOKABLE QVariantList getPageTree(const QString &filter = "");
    Q_INVOKABLE void searchPageReferences(const QString &query, int requestId);
    Q_INVOKABLE void cancelPageReferenceSearch(int requestId);
    Q_INVOKABLE QVariantMap getPage(const QString &pageId);
    Q_INVOKABLE bool savePage(const QString &pageId, const QString &title, const QString &content, const QString &icon = "📄");
    Q_INVOKABLE QVariantList getPageHistory(const QString &pageId);
    Q_INVOKABLE bool restorePageRevision(const QString &pageId, const QString &revisionId);
    Q_INVOKABLE QString createSubPage(const QString &parentId, const QString &title = "Nova Sub-página", const QString &icon = "📄");
    Q_INVOKABLE bool deletePage(const QString &pageId);
    Q_INVOKABLE bool reorderSubPages(const QString &parentId, const QVariantList &orderedPageIds);
    Q_INVOKABLE bool togglePinPage(const QString &pageId);
    Q_INVOKABLE bool movePage(const QString &pageId, const QString &newParentId);
    Q_INVOKABLE bool renamePage(const QString &pageId, const QString &newTitle);
    Q_INVOKABLE bool updatePageIcon(const QString &pageId, const QString &newIcon);
    Q_INVOKABLE bool updatePageDescription(const QString &pageId, const QString &description);
    Q_INVOKABLE bool updatePageCover(const QString &pageId, const QString &coverImage);
    Q_INVOKABLE QString createRandomPageCoverUrl() const;
    Q_INVOKABLE void processNotesPageCover(const QUrl &sourceUrl);
    Q_INVOKABLE void processRandomNotesPageCover();
    Q_INVOKABLE void processNotesRichImage(const QUrl &sourceUrl);
    Q_INVOKABLE void processNotesRichImages(const QVariantList &sourceUrls);
    Q_INVOKABLE bool hasClipboardNotesRichImage() const;
    Q_INVOKABLE void processClipboardNotesRichImage();
    Q_INVOKABLE QVariantMap getLinkMetadata(const QString &url);
    Q_INVOKABLE bool saveLinkMetadata(const QVariantMap &entry);
    Q_INVOKABLE QVariantMap getLinkEntity(const QString &url);
    Q_INVOKABLE QVariantMap setLinkEntityStatus(const QString &url, bool watched, bool watching);
    Q_INVOKABLE bool copyLinkUrlToClipboard(const QString &url);
    Q_INVOKABLE void copyNotesRichImage(const QString &imageDataUrl);
    Q_INVOKABLE void saveNotesRichImage(const QString &imageDataUrl, const QUrl &destinationUrl);
    Q_INVOKABLE QUrl suggestedNotesRichImageSaveUrl(const QString &imageDataUrl,
                                                     const QString &caption) const;
    Q_INVOKABLE void cropNotesRichImage(const QString &imageDataUrl, int x, int y,
                                        int width, int height, const QString &requestId);

    // 2. Videos / Media Center
    Q_INVOKABLE QVariantList getVideos(const QString &collectionFilter = "");
    Q_INVOKABLE QVariantMap getVideoStorageStats(const QString &videoId);
    Q_INVOKABLE bool openVideoInFolder(const QString &videoId);
    Q_INVOKABLE QVariantList getVideoCollections();
    Q_INVOKABLE QVariantList getVideoFolders();
    Q_INVOKABLE QVariantMap createVideoFolder(const QString &name);
    Q_INVOKABLE bool renameVideoFolder(const QString &folderId, const QString &name);
    Q_INVOKABLE bool deleteVideoFolder(const QString &folderId);
    Q_INVOKABLE bool moveVideoToFolder(const QString &videoId, const QString &folderId);
    Q_INVOKABLE void importVideo(const QString &sourcePath, const QString &collectionName = "",
                                 const QString &collectionId = "");
    Q_INVOKABLE void importVideoSubtitle(QObject *player, const QString &videoId,
                                         const QUrl &sourceUrl);
    Q_INVOKABLE bool loadVideoSubtitles(QObject *player, const QString &videoId);
    Q_INVOKABLE bool renameVideoSubtitle(const QString &videoId, const QString &trackId,
                                          const QString &label);
    Q_INVOKABLE bool removeVideoSubtitle(const QString &videoId, const QString &trackId);
    Q_INVOKABLE QString getVideoGalleryViewMode() const;
    Q_INVOKABLE bool setVideoGalleryViewMode(const QString &mode);
    Q_INVOKABLE QVariantMap configureVideoPlayback(QObject *player, const QString &videoId);
    Q_INVOKABLE bool updateVideoProgress(const QString &videoId, double progress);
    Q_INVOKABLE bool updateVideoDuration(const QString &videoId, double duration);
    Q_INVOKABLE bool deleteVideo(const QString &videoId);
    Q_INVOKABLE QVariantList getVideoWords(const QString &videoId);
    Q_INVOKABLE bool addVideoWord(const QString &videoId, const QString &word, const QString &context, double timestamp);
    Q_INVOKABLE bool deleteVideoWord(const QString &wordId);

    // 3. Anki & Flashcards (Hierarchical Tree & FSRS v5)
    Q_INVOKABLE QVariantList getDecks();
    Q_INVOKABLE QVariantList getHierarchicalDecks();
    Q_INVOKABLE QVariantMap getDeckStats(const QString &deckId);
    Q_INVOKABLE QVariantMap getGlobalAnkiStats();
    Q_INVOKABLE bool createDeck(const QString &name, const QString &description = "", const QString &color = "#6366f1", const QString &parentId = "");
    Q_INVOKABLE bool updateDeck(const QString &deckId, const QString &name, const QString &description, const QString &color);
    Q_INVOKABLE bool deleteDeck(const QString &deckId);
    Q_INVOKABLE bool resetDeckProgress(const QString &deckId);
    Q_INVOKABLE QVariantList getDeckCards(const QString &deckId);
    Q_INVOKABLE QVariantList getDueCards(const QString &deckId);
    Q_INVOKABLE bool createCard(const QString &deckId, const QString &front, const QString &back, const QString &tags = "");
    Q_INVOKABLE bool updateCard(const QString &cardId, const QString &front, const QString &back, const QString &tags = "");
    Q_INVOKABLE bool deleteCard(const QString &cardId);
    Q_INVOKABLE bool recordCardReview(const QString &cardId, int rating);

    // 4. Baterias de Questões & Simulado Zen
    Q_INVOKABLE QVariantList getQuizBatteries();
    Q_INVOKABLE QVariantList getBatteryQuestions(const QString &batteryId);
    Q_INVOKABLE QVariantList getAllQuizQuestions();
    Q_INVOKABLE QVariantList getAllQuizTags();
    Q_INVOKABLE QVariantMap getQuizStats();
    Q_INVOKABLE QVariantList getErrorNotebookQuestions();
    Q_INVOKABLE QVariantList getRandomSimulationQuestions(int limit = 10);
    Q_INVOKABLE QVariantList getFilteredQuizQuestions(const QVariantList &tags, const QString &status, int limit, bool shuffle);
    Q_INVOKABLE bool createQuizBattery(const QString &title, const QString &description);
    Q_INVOKABLE bool deleteQuizBattery(const QString &batteryId);
    Q_INVOKABLE bool createQuizQuestion(const QString &batteryId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation = "", const QString &tagsJson = "[]");
    Q_INVOKABLE bool recordQuizAttempt(const QString &batteryId, const QString &questionId, int selectedIndex, bool isCorrect);

    // 5. Finanças & Wishlist
    Q_INVOKABLE QVariantList getTransactions(const QString &typeFilter = "");
    Q_INVOKABLE QVariantList getAccounts();
    Q_INVOKABLE QVariantMap getFinancialSummary();
    Q_INVOKABLE bool addTransaction(const QString &description, double amount, const QString &type, const QString &category, const QString &date, const QString &accountId = "");
    Q_INVOKABLE bool updateTransaction(const QString &txId, const QString &description, double amount, const QString &type, const QString &category);
    Q_INVOKABLE bool deleteTransaction(const QString &txId);
    Q_INVOKABLE QVariantList getWishlist();
    Q_INVOKABLE bool addWishlistItem(const QString &title, double price, const QString &priority, const QString &category, const QString &link = "");
    Q_INVOKABLE bool deleteWishlistItem(const QString &itemId);

    // 6. Hábitos & Rotina Diária
    Q_INVOKABLE QVariantList getHabits();
    Q_INVOKABLE bool createHabit(const QString &title, const QString &color = "#10b981", const QString &icon = "⭐", int targetDays = 7);
    Q_INVOKABLE QVariantList getHabitLogs(const QString &dateStr);
    Q_INVOKABLE QVariantList getHabitLogsRange(const QString &startDate, const QString &endDate);
    Q_INVOKABLE bool toggleHabitCheckin(const QString &habitId, const QString &dateStr);
    Q_INVOKABLE bool deleteHabit(const QString &habitId);

    // 7. Calendário & Agenda
    Q_INVOKABLE QVariantList getCalendarEvents();
    Q_INVOKABLE bool createCalendarEvent(const QString &title, const QString &description, const QString &startDate, const QString &endDate, const QString &type = "event", const QString &color = "#3b82f6");
    Q_INVOKABLE bool updateCalendarEvent(const QString &eventId, const QString &title, const QString &description, const QString &startDate, const QString &endDate, const QString &color);
    Q_INVOKABLE bool toggleEventStatus(const QString &eventId);
    Q_INVOKABLE bool deleteCalendarEvent(const QString &eventId);

    // 8. Biblioteca & E-Reader
    Q_INVOKABLE QVariantList getLibraryBooks(const QString &filter = "");
    Q_INVOKABLE QVariantList getLibraryCollections();
    Q_INVOKABLE QString createLibraryCollection(const QString &name, const QString &color);
    Q_INVOKABLE bool updateLibraryCollection(const QString &collectionId, const QString &name,
                                              const QString &color);
    Q_INVOKABLE bool deleteLibraryCollection(const QString &collectionId);
    Q_INVOKABLE bool setBookCollections(const QString &bookId, const QVariantList &collectionIds);
    Q_INVOKABLE bool updateLibraryBookStatus(const QString &bookId, const QString &status);
    Q_INVOKABLE bool setLibraryBookArchived(const QString &bookId, bool archived);
    Q_INVOKABLE bool updateLibraryBookMetadata(const QString &bookId, const QString &title,
                                                const QString &author, const QString &publisher,
                                                const QVariant &publishedYear, const QString &language,
                                                const QString &description, const QString &status,
                                                const QString &coverImage);
    Q_INVOKABLE void searchLibraryBookMetadata(const QString &bookId, const QString &query);
    Q_INVOKABLE void processLibraryBookCover(const QUrl &sourceUrl);
    Q_INVOKABLE bool updateBookProgress(const QString &bookId, int currentPage, int totalPages);
    Q_INVOKABLE bool createLibraryBook(const QString &title, const QString &author, int totalPages, const QString &coverColor = "#7c3aed");
    Q_INVOKABLE void importLibraryBook(const QString &sourcePath);
    Q_INVOKABLE void openLibraryBook(const QString &bookId);
    Q_INVOKABLE void closeLibraryBook(const QString &temporaryPath);
    Q_INVOKABLE QString startLibraryReadingSession(const QString &bookId, int startPage);
    Q_INVOKABLE bool endLibraryReadingSession(const QString &sessionId, int endPage);
    Q_INVOKABLE QVariantMap getLibraryReadingStats();
    Q_INVOKABLE void searchLibraryBookText(const QString &temporaryPath, const QString &format,
                                            const QString &query, int requestId);
    Q_INVOKABLE bool cancelLibraryBookSearch(int requestId);
    Q_INVOKABLE void renderLibraryPdfPage(const QString &temporaryPath, int pageNumber, int targetWidth);
    Q_INVOKABLE QVariantList getLibraryBookmarks(const QString &bookId);
    Q_INVOKABLE bool createLibraryBookmark(const QString &bookId, int pageNumber, const QString &label);
    Q_INVOKABLE bool updateLibraryBookmark(const QString &bookmarkId, const QString &label);
    Q_INVOKABLE bool deleteLibraryBookmark(const QString &bookmarkId);
    Q_INVOKABLE QVariantList getLibraryHighlights(const QString &bookId);
    Q_INVOKABLE bool createLibraryHighlight(const QString &bookId, int pageNumber, const QString &text,
                                            const QString &color, const QString &note);
    Q_INVOKABLE bool updateLibraryHighlight(const QString &highlightId, const QString &note, const QString &color);
    Q_INVOKABLE bool deleteLibraryHighlight(const QString &highlightId);
    Q_INVOKABLE bool deleteLibraryHighlightsForBook(const QString &bookId);
    Q_INVOKABLE bool deleteLibraryBook(const QString &bookId);

    // 9. Cultura & Entretenimento
    Q_INVOKABLE QVariantList getCultureItems(const QString &statusFilter = "");
    Q_INVOKABLE bool incrementCultureProgress(const QString &itemId);
    Q_INVOKABLE bool updateCultureProgress(const QString &itemId, int progress);
    Q_INVOKABLE bool updateCultureStatus(const QString &itemId, const QString &status);
    Q_INVOKABLE bool createCultureItem(const QString &title, const QString &type, const QString &synopsis, int totalEpisodes = 12, const QString &coverImage = "");
    Q_INVOKABLE bool deleteCultureItem(const QString &itemId);

    // 10. Foco Pomodoro & Lofi
    Q_INVOKABLE QVariantList getLofis();
    Q_INVOKABLE QVariantList getFocusSessions();
    Q_INVOKABLE bool recordFocusSession(const QString &tag, int targetMinutes, const QString &status, const QString &summary = "");
    Q_INVOKABLE bool deleteFocusSession(const QString &sessionId);

    // 11. Cofre E2EE & Credenciais
    Q_INVOKABLE QVariantList getVaultGroups();
    Q_INVOKABLE QVariantList getVaultItems(const QString &groupId = "");
    Q_INVOKABLE bool saveVaultItem(const QString &id, const QString &groupId, const QString &label, const QString &username, const QString &email, const QString &password, const QString &url, const QString &notes);
    Q_INVOKABLE bool deleteVaultItem(const QString &itemId);
    Q_INVOKABLE QString generateSecurePassword(int length = 20, bool uppercase = true, bool lowercase = true, bool numbers = true, bool symbols = true);
    Q_INVOKABLE bool checkVaultConfigured();
    Q_INVOKABLE bool unlockVault(const QString &password);
    Q_INVOKABLE void lockVault();
    Q_INVOKABLE bool setupMasterPassword(const QString &password);
    Q_INVOKABLE bool changeMasterPassword(const QString &oldPassword, const QString &newPassword);
    Q_INVOKABLE bool removeMasterPassword(const QString &password);
    Q_INVOKABLE void resetAutoLockTimer();
    Q_INVOKABLE void refreshVaultLockout();
    Q_INVOKABLE int checkPasswordStrength(const QString &password);
    Q_INVOKABLE QVariantMap checkPasswordBreach(const QString &password);

    // 12. Utilitários & Manutenção do Sistema
    Q_INVOKABLE void copyToClipboard(const QString &text);
    Q_INVOKABLE QString exportDatabaseBackup(const QString &destinationDir = "");
    Q_INVOKABLE bool optimizeDatabase();
    Q_INVOKABLE QVariantMap getSystemDiagnostics();

    // 13. Lixeira / Trash
    Q_INVOKABLE QVariantList getTrashItems();
    Q_INVOKABLE bool restoreTrashItem(const QString &id, const QString &itemType);
    Q_INVOKABLE bool deleteTrashItemPermanently(const QString &id, const QString &itemType);
    Q_INVOKABLE bool emptyTrash();

    // 14. Home Dashboard
    Q_INVOKABLE QVariantMap getHomeDashboardData();

    // 15. Diagramas & Whiteboard
    Q_INVOKABLE QVariantList getDiagrams();
    Q_INVOKABLE QVariantMap getDiagram(const QString &diagramId);
    Q_INVOKABLE bool saveDiagram(const QString &diagramId, const QString &title, const QString &content, const QString &icon = "🎨");
    Q_INVOKABLE QString createDiagram(const QString &title, const QString &icon = "🎨");
    Q_INVOKABLE bool deleteDiagram(const QString &diagramId);

    // 16. Native notification center
    Q_INVOKABLE QVariantList getNotifications();
    Q_INVOKABLE bool markNotificationRead(const QString &notificationId = "");
    Q_INVOKABLE bool deleteNotification(const QString &notificationId);
    Q_INVOKABLE bool addNotification(const QString &title, const QString &message,
                                     const QString &type = "system",
                                     const QString &targetPageId = "",
                                     const QString &eventId = "",
                                     const QString &scheduledFor = "");

    // 17. Native local file manager
    Q_INVOKABLE QVariantList getFiles(const QString &folderId = "");
    Q_INVOKABLE QVariantList getFilesForSection(const QString &section, const QString &folderId = "");
    Q_INVOKABLE int getDriveFileCount();
    Q_INVOKABLE QVariantList getFileFolders(const QString &parentId = "");
    Q_INVOKABLE QVariantList getAllFileFolders();
    Q_INVOKABLE QString createFileFolder(const QString &name, const QString &parentId = "",
                                         const QString &color = "#8b5cf6");
    Q_INVOKABLE bool renameFileFolder(const QString &folderId, const QString &name);
    Q_INVOKABLE bool deleteFileFolder(const QString &folderId);
    Q_INVOKABLE bool moveFileFolder(const QString &folderId, const QString &parentId = "");
    Q_INVOKABLE bool moveFileItems(const QVariantList &items, const QString &folderId = "");
    Q_INVOKABLE bool trashFileItems(const QVariantList &items);
    Q_INVOKABLE bool renameFile(const QString &fileId, const QString &name);
    Q_INVOKABLE bool moveFile(const QString &fileId, const QString &folderId = "");
    Q_INVOKABLE QString duplicateFile(const QString &fileId, const QString &folderId = "");
    Q_INVOKABLE QVariantList duplicateFiles(const QVariantList &fileIds, const QString &folderId = "");
    Q_INVOKABLE bool deleteFile(const QString &fileId);
    Q_INVOKABLE QVariantList getFileLinksByFile(const QString &fileId);
    Q_INVOKABLE QVariantList getFileLinksByPage(const QString &pageId);
    Q_INVOKABLE QString createFilePageLink(const QString &fileId, const QString &pageId,
                                           const QString &linkType = "link",
                                           const QString &widgetId = "");
    Q_INVOKABLE bool deleteFilePageLink(const QString &linkId);
    Q_INVOKABLE void importLocalFile(const QString &sourcePath, const QString &folderId = "");
    Q_INVOKABLE void exportLocalFile(const QString &fileId, const QString &destinationPath);
    Q_INVOKABLE void previewLocalFile(const QString &fileId);
    Q_INVOKABLE QVariantMap readFilePreviewText(const QString &temporaryPath);
    Q_INVOKABLE void closeFilePreview(const QString &temporaryPath);
    Q_INVOKABLE void cancelFilePreview();

signals:
    void dbPathChanged();
    void countsChanged();
    void vaultStateChanged();
    void autoLockMinutesChanged();
    void vaultLockErrorChanged();
    void vaultLockoutChanged();
    void vaultUnlocked();
    void vaultLocked();
    void filesChanged();
    void fileOperationStateChanged();
    void librarySearchStateChanged();
    void fileOperationFinished(const QVariantMap &result);
    void filePreviewReady(const QVariantMap &result);
    void libraryBookReady(const QVariantMap &result);
    void libraryPdfPageReady(const QVariantMap &result);
    void libraryBookSearchReady(const QVariantMap &result);
    void pageReferenceSearchReady(const QVariantMap &result);
    void libraryBookMetadataSearchFinished(const QVariantMap &result);
    void filePreviewsInvalidated();

private:
    void startNotesRichImageOperation(std::function<QVariantMap()> operation,
                                      const QString &operationName);
    Database *m_db;
    QString m_dbPath;
    int m_pageCount;
    int m_videoCount;
    int m_deckCount;
    int m_bookCount;
    int m_cultureCount;
    int m_vaultItemCount;
    int m_transactionCount;
    int m_eventCount;
    int m_habitCount;
    int m_quizBatteryCount;
    int m_focusSessionCount;
    int m_unreadNotificationCount;
    bool m_fileOperationRunning;
    QFutureWatcher<QVariantMap> *m_fileOperationWatcher;
    bool m_librarySearchRunning = false;
    QFutureWatcher<QVariantMap> *m_librarySearchWatcher = nullptr;
    int m_librarySearchRequestId = 0;
    SynapseFileOperation *m_activeFileOperation;
    QTemporaryFile *m_pendingPreviewFile;
    bool m_cancelPreviewRequested;
    QHash<QString, QTemporaryFile*> m_filePreviewFiles;

    // Cryptography & Vault E2EE
    bool m_isVaultConfigured;
    bool m_isVaultUnlocked;
    int m_autoLockMinutes;
    QString m_vaultLockError;
    QTimer *m_autoLockTimer;
    QMap<QString, QString> m_unlockedKeys;
    QHash<QString, qint64> m_pageHistoryCooldown;
    QString m_activeLibraryReadingSessionId;
    QString m_activeLibraryReadingBookId;
    int m_activeLibraryReadingStartPage = 0;
    int m_activeLibraryReadingLastPage = 0;
    QString m_librarySearchPath;
    std::shared_ptr<std::atomic_bool> m_librarySearchCancellation;
    QSet<QNetworkReply *> m_libraryMetadataReplies;
    struct PageReferenceSearchTask {
        int requestId = 0;
        std::shared_ptr<std::atomic_bool> cancellation;
    };
    QHash<QFutureWatcher<QVariantMap> *, PageReferenceSearchTask> m_pageReferenceSearchTasks;
    int m_latestPageReferenceSearchRequestId = 0;

    void checkKeychainState();
    void clearUnlockedKeys();
    void clearStats();
    void recordFailedVaultUnlock();
    void clearFailedVaultUnlocks();
    bool finishActiveLibraryReadingSession();
    void cancelPageReferenceSearchTasks(bool waitForFinish);
    void cancelLibraryMetadataRequests();
    QString encryptContent(const QString &keyHex, const QString &plaintext);
    QString decryptContent(const QString &keyHex, const QString &ciphertext);
    bool saveVideoFolders(const QVariantList &folders);
    bool stageVideoSubtitleFiles(const QString &videoId, const QString &managedVideosDirectory,
                                 QVector<QPair<QString, QString>> &stagedFiles);
    void restoreStagedVideoSubtitleFiles(const QVector<QPair<QString, QString>> &stagedFiles);
    void removeStagedVideoSubtitleFiles(const QVector<QPair<QString, QString>> &stagedFiles);
    bool preparePasswordRemovalAssets(QVector<PasswordRemovalFileMigration> &fileMigrations,
                                      QVector<PasswordRemovalAssetMigration> &assetMigrations);
    bool stageVaultSetupAssets(const QString &filesKey, const QString &libraryKey,
                               const QString &cultureKey, QVector<VaultSetupAssetMigration> &migrations);
    bool finishVaultSetupAssetMigrations();

    QJsonArray executeQuery(const QString &sql);
    QJsonArray executeQueryPrepared(const QString &sql, const QVariantList &parameters);
    int executeSqlPrepared(const QString &sql, const QVariantList &parameters);
    QString escapeSql(const QString &str) const;
    QString generateUuid() const;
    QString currentTimestamp() const;
    QString fileTypeCategory(const QString &filename) const;
};

#endif // SYNAPSE_CONTROLLER_H
