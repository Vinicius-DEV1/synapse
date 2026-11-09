#ifndef SYNAPSE_CONTROLLER_H
#define SYNAPSE_CONTROLLER_H

#include <QtCore/QObject>
#include <QtCore/QString>
#include <QtCore/QVariantList>
#include <QtCore/QVariantMap>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonObject>
#include <QtCore/QUuid>
#include <QtCore/QDateTime>
#include <QtCore/QRandomGenerator>
#include "synapse_bridge.h"

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

public:
    explicit SynapseDataController(QObject *parent = nullptr);
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

    Q_INVOKABLE void refreshStats();
    Q_INVOKABLE bool executeSql(const QString &sql);

    // 1. Pages / Editor (Hierarchical & Pinned Support)
    Q_INVOKABLE QVariantList getPages(const QString &filter = "");
    Q_INVOKABLE QVariantList getPinnedPages();
    Q_INVOKABLE QVariantList getPageTree(const QString &filter = "");
    Q_INVOKABLE QVariantMap getPage(const QString &pageId);
    Q_INVOKABLE bool savePage(const QString &pageId, const QString &title, const QString &content, const QString &icon = "📄");
    Q_INVOKABLE QString createSubPage(const QString &parentId, const QString &title = "Nova Sub-página", const QString &icon = "📄");
    Q_INVOKABLE bool deletePage(const QString &pageId);
    Q_INVOKABLE bool togglePinPage(const QString &pageId);
    Q_INVOKABLE bool movePage(const QString &pageId, const QString &newParentId);
    Q_INVOKABLE bool renamePage(const QString &pageId, const QString &newTitle);
    Q_INVOKABLE bool updatePageIcon(const QString &pageId, const QString &newIcon);

    // 2. Videos / Media Center
    Q_INVOKABLE QVariantList getVideos(const QString &collectionFilter = "");
    Q_INVOKABLE QVariantList getVideoCollections();
    Q_INVOKABLE bool updateVideoProgress(const QString &videoId, double progress);
    Q_INVOKABLE bool deleteVideo(const QString &videoId);

    // 3. Anki & Flashcards (Hierarchical Tree & FSRS v5)
    Q_INVOKABLE QVariantList getDecks();
    Q_INVOKABLE QVariantList getHierarchicalDecks();
    Q_INVOKABLE QVariantMap getDeckStats(const QString &deckId);
    Q_INVOKABLE QVariantMap getGlobalAnkiStats();
    Q_INVOKABLE bool createDeck(const QString &name, const QString &description = "", const QString &color = "#6366f1", const QString &parentId = "");
    Q_INVOKABLE bool updateDeck(const QString &deckId, const QString &name, const QString &description, const QString &color);
    Q_INVOKABLE bool deleteDeck(const QString &deckId);
    Q_INVOKABLE QVariantList getDeckCards(const QString &deckId);
    Q_INVOKABLE QVariantList getDueCards(const QString &deckId);
    Q_INVOKABLE bool createCard(const QString &deckId, const QString &front, const QString &back, const QString &tags = "");
    Q_INVOKABLE bool updateCard(const QString &cardId, const QString &front, const QString &back, const QString &tags = "");
    Q_INVOKABLE bool deleteCard(const QString &cardId);
    Q_INVOKABLE bool recordCardReview(const QString &cardId, int rating);

    // 4. Baterias de Questões & Simulado Zen
    Q_INVOKABLE QVariantList getQuizBatteries();
    Q_INVOKABLE QVariantList getBatteryQuestions(const QString &batteryId);
    Q_INVOKABLE bool createQuizBattery(const QString &title, const QString &description);
    Q_INVOKABLE bool createQuizQuestion(const QString &batteryId, const QString &question, const QString &optionsJson, int correctIndex, const QString &explanation = "");
    Q_INVOKABLE bool recordQuizAttempt(const QString &batteryId, const QString &questionId, int selectedIndex, bool isCorrect);

    // 5. Finanças & Wishlist
    Q_INVOKABLE QVariantList getTransactions(const QString &typeFilter = "");
    Q_INVOKABLE QVariantList getAccounts();
    Q_INVOKABLE QVariantMap getFinancialSummary();
    Q_INVOKABLE bool addTransaction(const QString &description, double amount, const QString &type, const QString &category, const QString &date, const QString &accountId = "");
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
    Q_INVOKABLE bool toggleEventStatus(const QString &eventId);
    Q_INVOKABLE bool deleteCalendarEvent(const QString &eventId);

    // 8. Biblioteca & E-Reader
    Q_INVOKABLE QVariantList getLibraryBooks(const QString &filter = "");
    Q_INVOKABLE bool updateBookProgress(const QString &bookId, int currentPage, int totalPages);
    Q_INVOKABLE bool createLibraryBook(const QString &title, const QString &author, int totalPages, const QString &coverColor = "#7c3aed");
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
    Q_INVOKABLE QString generateSecurePassword(int length = 16, bool symbols = true);

    // 12. Utilitários
    Q_INVOKABLE void copyToClipboard(const QString &text);

signals:
    void dbPathChanged();
    void countsChanged();

private:
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

    QJsonArray executeQuery(const QString &sql);
    QString escapeSql(const QString &str) const;
    QString generateUuid() const;
    QString currentTimestamp() const;
};

#endif // SYNAPSE_CONTROLLER_H
