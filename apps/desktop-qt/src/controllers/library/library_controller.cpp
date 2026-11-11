#include "synapse_controller.h"
#include "native_book_reader.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QDir>
#include <QtCore/QDebug>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QHash>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>

// ---------------------------------------------------------------------------
// 8. Library and native reader persistence
// ---------------------------------------------------------------------------

QVariantList SynapseDataController::getLibraryBooks(const QString &filter) {
    QString sql = "SELECT id, title, author, file_path, drive_file_id, cover_color, cover_image, collections, "
                  "total_pages, current_page, reading_status, last_read_page, epub_locations, created_at, "
                  "updated_at, deleted_at, reading_preferences, language, last_read_at, original_name, "
                  "published_year, publisher, description, is_local, is_archived, archived_at "
                  "FROM library_books WHERE deleted_at IS NULL ";
    if (!filter.trimmed().isEmpty()) {
        sql += QString("AND (title LIKE '%%1%' OR author LIKE '%%1%') ").arg(escapeSql(filter.trimmed()));
    }
    sql += "ORDER BY updated_at DESC";
    const QJsonArray rows = executeQuery(sql);
    const QJsonArray relationRows = executeQueryPrepared(
        "SELECT bc.book_id, c.id, c.name, c.color FROM library_book_collections bc "
        "INNER JOIN library_collections c ON c.id = bc.collection_id "
        "WHERE bc.deleted_at IS NULL AND c.deleted_at IS NULL ORDER BY bc.rowid ASC", {});
    QHash<QString, QJsonArray> collectionsByBook;
    for (const QJsonValue &value : relationRows) {
        const QJsonObject relation = value.toObject();
        QJsonObject collection;
        collection.insert(QStringLiteral("id"), relation.value(QStringLiteral("id")));
        collection.insert(QStringLiteral("name"), relation.value(QStringLiteral("name")));
        collection.insert(QStringLiteral("color"), relation.value(QStringLiteral("color")));
        const QString bookId = relation.value(QStringLiteral("book_id")).toString();
        collectionsByBook[bookId].append(collection);
    }

    QJsonArray enrichedRows;
    for (const QJsonValue &value : rows) {
        QJsonObject book = value.toObject();
        const QString bookId = book.value(QStringLiteral("id")).toString();
        if (collectionsByBook.contains(bookId)) {
            book.insert(QStringLiteral("collections"), collectionsByBook.value(bookId));
        } else if (!book.value(QStringLiteral("collections")).isArray()) {
            const QString legacyJson = book.value(QStringLiteral("collections")).toString();
            QJsonParseError parseError;
            const QJsonDocument document = QJsonDocument::fromJson(legacyJson.toUtf8(), &parseError);
            if (!legacyJson.trimmed().isEmpty() &&
                (parseError.error != QJsonParseError::NoError || !document.isArray())) {
                qWarning() << "[SynapseDataController] Legacy library collection metadata is invalid for book" << bookId;
            }
            book.insert(QStringLiteral("collections"),
                        parseError.error == QJsonParseError::NoError && document.isArray()
                            ? QJsonValue(document.array()) : QJsonValue(QJsonArray()));
        }
        enrichedRows.append(book);
    }
    return enrichedRows.toVariantList();
}

bool SynapseDataController::updateLibraryBookStatus(const QString &bookId, const QString &status) {
    const QString normalizedId = bookId.trimmed();
    if (normalizedId.isEmpty() ||
        (status != "not_started" && status != "reading" && status != "finished")) return false;
    return executeSqlPrepared(
        "UPDATE library_books SET reading_status = ?1, updated_at = ?2 "
        "WHERE id = ?3 AND deleted_at IS NULL",
        {status, currentTimestamp(), normalizedId}) == 1;
}

bool SynapseDataController::setLibraryBookArchived(const QString &bookId, bool archived) {
    const QString normalizedId = bookId.trimmed();
    if (normalizedId.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    const QVariant archiveTimestamp = archived ? QVariant(timestamp) : QVariant();
    return executeSqlPrepared(
        "UPDATE library_books SET is_archived = ?1, archived_at = ?2, updated_at = ?3 "
        "WHERE id = ?4 AND deleted_at IS NULL",
        {archived ? 1 : 0, archiveTimestamp, timestamp, normalizedId}) == 1;
}

bool SynapseDataController::updateLibraryBookMetadata(const QString &bookId, const QString &title,
                                                      const QString &author, const QString &publisher,
                                                      const QVariant &publishedYear, const QString &language,
                                                      const QString &description, const QString &status,
                                                      const QString &coverImage) {
    const QString normalizedId = bookId.trimmed();
    const QString normalizedTitle = title.trimmed();
    if (normalizedId.isEmpty() || normalizedTitle.isEmpty() ||
        (status != "not_started" && status != "reading" && status != "finished")) return false;

    QVariant normalizedYear;
    if (publishedYear.isValid() && !publishedYear.isNull()) {
        bool validYear = false;
        const int year = publishedYear.toInt(&validYear);
        if (!validYear || year < 0 || year > 9999) return false;
        normalizedYear = year;
    }
    const QVariant normalizedPublisher = publisher.trimmed().isEmpty() ? QVariant() : QVariant(publisher.trimmed());
    const QVariant normalizedLanguage = language.trimmed().isEmpty() ? QVariant() : QVariant(language.trimmed());
    const QVariant normalizedDescription = description.trimmed().isEmpty() ? QVariant() : QVariant(description.trimmed());
    return executeSqlPrepared(
        "UPDATE library_books SET title = ?1, author = ?2, publisher = ?3, published_year = ?4, "
        "language = ?5, description = ?6, reading_status = ?7, cover_image = ?8, updated_at = ?9 "
        "WHERE id = ?10 AND deleted_at IS NULL",
        {normalizedTitle, author.trimmed(), normalizedPublisher, normalizedYear, normalizedLanguage,
         normalizedDescription, status, coverImage.trimmed(), currentTimestamp(), normalizedId}) == 1;
}

bool SynapseDataController::updateBookProgress(const QString &bookId, int currentPage, int totalPages) {
    if (bookId.trimmed().isEmpty()) return false;
    const int safeTotalPages = qMax(0, totalPages);
    const int safeCurrentPage = safeTotalPages > 0
        ? qBound(0, currentPage, safeTotalPages) : qMax(0, currentPage);
    const QString status = safeCurrentPage == 0 ? "not_started"
        : (safeTotalPages > 0 && safeCurrentPage >= safeTotalPages ? "finished" : "reading");
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_books SET current_page = %1, total_pages = %2, reading_status = '%3', "
                                "last_read_at = '%4', updated_at = '%4' WHERE id = '%5' AND deleted_at IS NULL")
                            .arg(safeCurrentPage).arg(safeTotalPages).arg(status, timestamp, escapeSql(bookId));
    const bool saved = executeSql(sql);
    if (saved && bookId.trimmed() == m_activeLibraryReadingBookId) {
        m_activeLibraryReadingLastPage = safeCurrentPage;
    }
    return saved;
}

bool SynapseDataController::createLibraryBook(const QString &title, const QString &author, int totalPages,
                                              const QString &coverColor) {
    if (title.trimmed().isEmpty()) return false;
    const QString id = generateUuid();
    const QString timestamp = currentTimestamp();
    const QString color = coverColor.trimmed().isEmpty() ? "#7c3aed" : coverColor.trimmed();
    const QString safeAuthor = author.trimmed().isEmpty() ? "Desconhecido" : author.trimmed();
    const QString sql = QString("INSERT INTO library_books (id, title, author, total_pages, current_page, "
                                "reading_status, cover_color, created_at, updated_at) "
                                "VALUES ('%1', '%2', '%3', %4, 0, 'not_started', '%5', '%6', '%6')")
                            .arg(escapeSql(id), escapeSql(title.trimmed()), escapeSql(safeAuthor))
                            .arg(qMax(0, totalPages))
                            .arg(escapeSql(color), timestamp);
    const bool success = executeSql(sql);
    if (success) refreshStats();
    return success;
}

void SynapseDataController::importLibraryBook(const QString &sourcePath) {
    const auto fail = [this](const QString &message) {
        emit fileOperationFinished({{"success", false}, {"error", message}, {"operation", "library-import"}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current file operation to finish.");
    if (!m_isVaultConfigured || !m_isVaultUnlocked || m_unlockedKeys.value("library").isEmpty()) {
        return fail("Unlock the vault before importing books so they can be encrypted locally.");
    }

    const QFileInfo sourceInfo(sourcePath);
    const QString canonicalSource = sourceInfo.canonicalFilePath();
    const QString extension = sourceInfo.suffix().toLower();
    if (canonicalSource.isEmpty() || !sourceInfo.isFile() || !sourceInfo.isReadable() || sourceInfo.size() <= 0 ||
        (extension != "pdf" && extension != "epub")) {
        return fail("Choose a readable PDF or EPUB file.");
    }

    const QString id = generateUuid();
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString libraryDirectory = QDir(appDirectory).filePath("library");
    if (!QDir().mkpath(libraryDirectory)) return fail("Could not create the local library directory.");

    const QString relativePath = QString("library/%1.%2.enc").arg(id, extension);
    const QString destination = QDir(appDirectory).filePath(relativePath);
    const QString temporaryDestination = destination + ".partial";
    const QString originalName = sourceInfo.fileName();
    const QString baseName = sourceInfo.completeBaseName().trimmed();
    QString title = baseName.isEmpty() ? originalName : baseName;
    QString author = "Desconhecido";
    const QStringList titleParts = title.split(" - ", Qt::KeepEmptyParts);
    if (titleParts.size() >= 2 && !titleParts[0].trimmed().isEmpty() && !titleParts[1].trimmed().isEmpty()) {
        title = titleParts[0].trimmed();
        author = titleParts[1].trimmed();
    }

    QString key = m_unlockedKeys.value("library");
    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        key.fill(QChar(0));
        return fail("Could not start the encrypted book import.");
    }

    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, operation, id, title, author, originalName, extension, relativePath,
             destination, temporaryDestination]() {
        const QVariantMap operationResult = watcher->result();
        watcher->deleteLater();
        bool success = operationResult.value("success").toBool();
        QString error = operationResult.value("error").toString();
        const QString coverImage = operationResult.value("coverImage").toString();
        const QString metadataTitle = operationResult.value("title").toString().trimmed();
        const QString metadataAuthor = operationResult.value("author").toString().trimmed();
        const QString importedTitle = metadataTitle.isEmpty() ? title : metadataTitle;
        const QString importedAuthor = metadataAuthor.isEmpty() ? author : metadataAuthor;
        const int totalPages = qMax(0, operationResult.value("totalPages").toInt());
        if (success && (!m_isVaultConfigured || !m_isVaultUnlocked)) {
            QFile::remove(temporaryDestination);
            success = false;
            error = "The vault was locked before the book import finished.";
        }
        if (success && !QFile::rename(temporaryDestination, destination)) {
            QFile::remove(temporaryDestination);
            success = false;
            error = "Could not finalize encrypted book storage.";
        }
        if (success) {
            const QString timestamp = currentTimestamp();
            const QString lastReadPage = extension == "pdf" ? "1" : "";
            const int insertedRows = executeSqlPrepared(
                "INSERT INTO library_books (id, title, author, file_path, cover_color, cover_image, total_pages, "
                "current_page, reading_status, last_read_page, is_local, original_name, created_at, updated_at) "
                "VALUES (?1, ?2, ?3, ?4, '#7c3aed', ?5, ?6, 0, 'not_started', ?7, 1, ?8, ?9, ?9)",
                {id, importedTitle, importedAuthor, relativePath, coverImage, totalPages,
                 lastReadPage, originalName, timestamp});
            success = insertedRows == 1;
            if (!success) {
                QFile::remove(destination);
                error = "Could not save the book record in the database.";
            } else {
                refreshStats();
            }
        } else {
            QFile::remove(temporaryDestination);
        }
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        emit fileOperationFinished({{"success", success}, {"id", id}, {"name", originalName},
                                    {"error", error}, {"operation", "library-import"}});
    });
    watcher->setFuture(QtConcurrent::run([canonicalSource, temporaryDestination, key, operation, extension]() mutable {
        const QByteArray sourceBytes = canonicalSource.toUtf8();
        const QByteArray targetBytes = temporaryDestination.toUtf8();
        QVariantMap resultMap{{"success", true}};
        const QString sourcePath = QString::fromUtf8(sourceBytes);
        const QVariantMap metadata = extension == "pdf" ? inspectNativePdf(sourcePath)
                                                           : inspectNativeEpubMetadata(sourcePath);
        if (metadata.value("success").toBool()) {
            for (const QString &field : {QStringLiteral("title"), QStringLiteral("author"),
                                         QStringLiteral("totalPages")}) {
                if (metadata.contains(field)) resultMap.insert(field, metadata.value(field));
            }
            if (metadata.contains(QStringLiteral("coverImage"))) {
                resultMap.insert(QStringLiteral("coverImage"), metadata.value(QStringLiteral("coverImage")));
            }
        }

        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = synapse_file_encrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(temporaryDestination);
            return QVariantMap{{"success", false}, {"error", "Book encryption failed."}};
        }
        return resultMap;
    }));
    key.fill(QChar(0));
    resetAutoLockTimer();
}

bool SynapseDataController::deleteLibraryBook(const QString &bookId) {
    if (bookId.trimmed().isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    if (!executeSql("BEGIN IMMEDIATE;")) return false;
    const QString escapedId = escapeSql(bookId);
    const QString updateBook = QString("UPDATE library_books SET deleted_at = '%1', updated_at = '%1' "
                                       "WHERE id = '%2' AND deleted_at IS NULL").arg(timestamp, escapedId);
    const QString updateHighlights = QString("UPDATE library_highlights SET deleted_at = '%1', updated_at = '%1' "
                                             "WHERE book_id = '%2' AND deleted_at IS NULL").arg(timestamp, escapedId);
    const QString updateBookmarks = QString("UPDATE library_bookmarks SET deleted_at = '%1', updated_at = '%1' "
                                            "WHERE book_id = '%2' AND deleted_at IS NULL").arg(timestamp, escapedId);
    const bool saved = executeSql(updateBook) && executeSql(updateHighlights) && executeSql(updateBookmarks);
    if (!saved || !executeSql("COMMIT;")) {
        executeSql("ROLLBACK;");
        return false;
    }
    refreshStats();
    return true;
}
