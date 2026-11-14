#include "synapse_controller.h"
#include "synapse_bridge.h"
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
    if (!m_db) return {};
    const QByteArray filterBytes = filter.trimmed().toUtf8();
    char *raw = synapse_library_get_books(m_db, filterBytes.isEmpty() ? nullptr : filterBytes.constData());
    if (!raw) return {};
    const QJsonArray rows = QJsonDocument::fromJson(QByteArray(raw)).array();
    synapse_free_string(raw);

    char *rawCols = synapse_library_get_collections(m_db);
    QJsonArray allCols;
    if (rawCols) {
        allCols = QJsonDocument::fromJson(QByteArray(rawCols)).array();
        synapse_free_string(rawCols);
    }
    QHash<QString, QJsonObject> collectionsById;
    for (const QJsonValue &v : allCols) {
        const QJsonObject obj = v.toObject();
        collectionsById[obj.value("id").toString()] = obj;
    }

    QJsonArray enrichedRows;
    for (const QJsonValue &value : rows) {
        QJsonObject book = value.toObject();
        const QString collectionsRaw = book.value(QStringLiteral("collections")).toString();
        QJsonParseError parseError;
        const QJsonDocument doc = QJsonDocument::fromJson(collectionsRaw.toUtf8(), &parseError);
        if (parseError.error == QJsonParseError::NoError && doc.isArray()) {
            QJsonArray resolvedCols;
            for (const QJsonValue &cv : doc.array()) {
                if (cv.isObject()) {
                    resolvedCols.append(cv);
                } else if (cv.isString()) {
                    const QString cid = cv.toString();
                    if (collectionsById.contains(cid)) resolvedCols.append(collectionsById.value(cid));
                }
            }
            book.insert(QStringLiteral("collections"), resolvedCols);
        } else if (!book.value(QStringLiteral("collections")).isArray()) {
            book.insert(QStringLiteral("collections"), QJsonArray());
        }
        enrichedRows.append(book);
    }
    return enrichedRows.toVariantList();
}

bool SynapseDataController::updateLibraryBookStatus(const QString &bookId, const QString &status) {
    if (!m_db || bookId.trimmed().isEmpty() ||
        (status != "not_started" && status != "reading" && status != "finished")) return false;
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    const QByteArray stBytes = status.trimmed().toUtf8();
    return synapse_library_update_status(m_db, bidBytes.constData(), stBytes.constData()) == 1;
}

bool SynapseDataController::setLibraryBookArchived(const QString &bookId, bool archived) {
    if (!m_db || bookId.trimmed().isEmpty()) return false;
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    return synapse_library_set_archived(m_db, bidBytes.constData(), archived ? 1 : 0) == 1;
}

bool SynapseDataController::updateLibraryBookMetadata(const QString &bookId, const QString &title,
                                                      const QString &author, const QString &publisher,
                                                      const QVariant &publishedYear, const QString &language,
                                                      const QString &description, const QString &status,
                                                      const QString &coverImage) {
    const QString normalizedId = bookId.trimmed();
    const QString normalizedTitle = title.trimmed();
    if (!m_db || normalizedId.isEmpty() || normalizedTitle.isEmpty() ||
        (status != "not_started" && status != "reading" && status != "finished")) return false;

    int year = 0;
    if (publishedYear.isValid() && !publishedYear.isNull()) {
        bool validYear = false;
        year = publishedYear.toInt(&validYear);
        if (!validYear || year < 0 || year > 9999) return false;
    }

    const QByteArray bidBytes = normalizedId.toUtf8();
    const QByteArray tBytes = normalizedTitle.toUtf8();
    const QByteArray aBytes = author.trimmed().toUtf8();
    const QByteArray pubBytes = publisher.trimmed().toUtf8();
    const QByteArray descBytes = description.trimmed().toUtf8();
    const QByteArray langBytes = language.trimmed().toUtf8();

    const bool metaUpdated = synapse_library_update_metadata(
        m_db, bidBytes.constData(), tBytes.constData(), aBytes.constData(),
        descBytes.isEmpty() ? nullptr : descBytes.constData(), year,
        pubBytes.isEmpty() ? nullptr : pubBytes.constData(),
        langBytes.isEmpty() ? nullptr : langBytes.constData()) == 1;
    if (!metaUpdated) return false;

    synapse_library_update_status(m_db, bidBytes.constData(), status.toUtf8().constData());
    if (!coverImage.trimmed().isEmpty()) {
        synapse_library_update_cover(m_db, bidBytes.constData(), coverImage.trimmed().toUtf8().constData(), nullptr);
    }
    return true;
}

bool SynapseDataController::updateBookProgress(const QString &bookId, int currentPage, int totalPages) {
    if (!m_db || bookId.trimmed().isEmpty()) return false;
    const int safeTotalPages = qMax(0, totalPages);
    const int safeCurrentPage = safeTotalPages > 0
        ? qBound(0, currentPage, safeTotalPages) : qMax(0, currentPage);
    const QString status = safeCurrentPage == 0 ? "not_started"
        : (safeTotalPages > 0 && safeCurrentPage >= safeTotalPages ? "finished" : "reading");
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    const QByteArray stBytes = status.toUtf8();
    const bool saved = synapse_library_update_progress(
        m_db, bidBytes.constData(), safeCurrentPage, safeTotalPages, stBytes.constData()) == 1;
    if (saved && bookId.trimmed() == m_activeLibraryReadingBookId) {
        m_activeLibraryReadingLastPage = safeCurrentPage;
    }
    return saved;
}

bool SynapseDataController::createLibraryBook(const QString &title, const QString &author, int totalPages,
                                              const QString &coverColor) {
    if (!m_db || title.trimmed().isEmpty()) return false;
    const QString id = generateUuid();
    const QString color = coverColor.trimmed().isEmpty() ? "#7c3aed" : coverColor.trimmed();
    const QString safeAuthor = author.trimmed().isEmpty() ? "Desconhecido" : author.trimmed();

    QJsonObject bookObj;
    bookObj["id"] = id;
    bookObj["title"] = title.trimmed();
    bookObj["author"] = safeAuthor;
    bookObj["total_pages"] = qMax(0, totalPages);
    bookObj["current_page"] = 0;
    bookObj["reading_status"] = "not_started";
    bookObj["cover_color"] = color;

    const QByteArray jsonBytes = QJsonDocument(bookObj).toJson(QJsonDocument::Compact);
    const bool success = synapse_library_insert_book(m_db, jsonBytes.constData()) == 1;
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
            const QString lastReadPage = extension == "pdf" ? "1" : "";
            QJsonObject bookObj;
            bookObj["id"] = id;
            bookObj["title"] = importedTitle;
            bookObj["author"] = importedAuthor;
            bookObj["file_path"] = relativePath;
            bookObj["cover_color"] = "#7c3aed";
            if (!coverImage.isEmpty()) bookObj["cover_image"] = coverImage;
            bookObj["total_pages"] = totalPages;
            bookObj["current_page"] = 0;
            bookObj["reading_status"] = "not_started";
            if (!lastReadPage.isEmpty()) bookObj["last_read_page"] = lastReadPage;
            bookObj["is_local"] = true;
            bookObj["original_name"] = originalName;

            const QByteArray jsonBytes = QJsonDocument(bookObj).toJson(QJsonDocument::Compact);
            success = m_db && synapse_library_insert_book(m_db, jsonBytes.constData()) == 1;
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
    if (!m_db || bookId.trimmed().isEmpty()) return false;
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    const bool saved = synapse_library_delete_book(m_db, bidBytes.constData()) == 1;
    if (saved) refreshStats();
    return saved;
}
