#include "synapse_controller.h"
#include "native_book_reader.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QRegularExpression>
#include <QtCore/QTemporaryFile>
#include <QtCore/QUrl>

void SynapseDataController::openLibraryBook(const QString &bookId) {
    const auto fail = [this, &bookId](const QString &message) {
        emit libraryBookReady({{"success", false}, {"error", message}, {"operation", "library-read"},
                               {"bookId", bookId}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current file operation to finish.");
    if (m_isVaultConfigured && !m_isVaultUnlocked) {
        return fail("Unlock the vault before opening local books.");
    }

    const QJsonArray rows = executeQuery(QString("SELECT file_path, original_name, current_page, total_pages "
                                                 "FROM library_books WHERE id = '%1' AND deleted_at IS NULL")
                                         .arg(escapeSql(bookId)));
    if (rows.isEmpty()) return fail("The selected book is no longer available.");
    const QJsonObject book = rows.first().toObject();
    QString recordedPath = book.value("file_path").toString();
    recordedPath.remove("file://");
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString libraryDirectory = QFileInfo(appDirectory + "/library").canonicalFilePath();
    const QString candidatePath = QDir::isAbsolutePath(recordedPath)
        ? recordedPath : QDir(appDirectory).filePath(recordedPath);
    const QFileInfo sourceInfo(candidatePath);
    const QString sourcePath = sourceInfo.canonicalFilePath();
    if (libraryDirectory.isEmpty() || sourcePath.isEmpty() || !sourceInfo.isFile() ||
        !sourcePath.startsWith(libraryDirectory + QDir::separator())) {
        return fail("The local book path is missing or outside the managed library directory.");
    }

    QString format = QFileInfo(book.value("original_name").toString()).suffix().toLower();
    if (format != "pdf" && format != "epub") {
        QString baseName = QFileInfo(sourcePath).completeBaseName();
        if (baseName.endsWith(".pdf", Qt::CaseInsensitive)) format = "pdf";
        else if (baseName.endsWith(".epub", Qt::CaseInsensitive)) format = "epub";
    }
    if (format != "pdf" && format != "epub") return fail("This book format is not supported by the native reader.");

    QFile probe(sourcePath);
    if (!probe.open(QIODevice::ReadOnly)) return fail("The local book file could not be opened.");
    const bool encryptedAtRest = probe.read(4) == QByteArrayLiteral("ENC1");
    probe.close();
    QString key = encryptedAtRest ? m_unlockedKeys.value("library") : QString();
    if (encryptedAtRest && m_isVaultConfigured && !m_isVaultUnlocked) {
        return fail("Unlock the vault before opening an encrypted book.");
    }
    if (encryptedAtRest && key.isEmpty()) return fail("The encrypted library key is unavailable.");

    const QString tempTemplate = QDir(QDir::tempPath()).filePath(QString("synapse-book-XXXXXX.%1").arg(format));
    auto *readerFile = new QTemporaryFile(tempTemplate, this);
    readerFile->setAutoRemove(true);
    if (!readerFile->open()) {
        delete readerFile;
        key.fill(QChar(0));
        return fail("Could not create a protected temporary book file.");
    }
    const QString temporaryPath = readerFile->fileName();
    readerFile->close();

    SynapseFileOperation *operation = synapse_file_operation_create();
    if (!operation) {
        QFile::remove(temporaryPath);
        delete readerFile;
        key.fill(QChar(0));
        return fail("Could not start the native book reader.");
    }

    m_cancelPreviewRequested = false;
    m_pendingPreviewFile = readerFile;
    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    m_activeFileOperation = operation;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, operation, readerFile, temporaryPath, bookId, format, encryptedAtRest]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        bool success = result.value("success").toBool();
        const bool cancelled = m_cancelPreviewRequested;
        if (success && encryptedAtRest && m_isVaultConfigured && !m_isVaultUnlocked) {
            success = false;
            result.insert("error", "The vault was locked before the book could be opened.");
        }
        if (success) {
            m_filePreviewFiles.insert(temporaryPath, readerFile);
            result.insert("path", temporaryPath);
            result.insert("url", QUrl::fromLocalFile(temporaryPath).toString());
            result.insert("format", format);
            result.insert("bookId", bookId);
            const int pageCount = result.value("totalPages").toInt();
            if (pageCount > 0) {
                const int currentPage = qBound(0, result.value("currentPage").toInt(), pageCount);
                updateBookProgress(bookId, currentPage, pageCount);
            }
        } else {
            QFile::remove(temporaryPath);
            delete readerFile;
            if (cancelled) result.insert("error", "Opening the book was cancelled because the vault was locked.");
            else if (result.value("error").toString().isEmpty()) result.insert("error", "The book could not be prepared for reading.");
        }
        if (m_pendingPreviewFile == readerFile) m_pendingPreviewFile = nullptr;
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_activeFileOperation == operation) m_activeFileOperation = nullptr;
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        synapse_file_operation_close(operation);
        result.insert("success", success);
        result.insert("operation", "library-read");
        emit libraryBookReady(result);
    });
    watcher->setFuture(QtConcurrent::run([sourcePath, temporaryPath, key, encryptedAtRest, format, operation,
                                          currentPage = book.value("current_page").toInt()]() mutable {
        const QByteArray sourceBytes = sourcePath.toUtf8();
        const QByteArray targetBytes = temporaryPath.toUtf8();
        QByteArray keyBytes = key.toUtf8();
        key.fill(QChar(0));
        const int result = encryptedAtRest
            ? synapse_file_decrypt(sourceBytes.constData(), targetBytes.constData(), keyBytes.constData(), operation)
            : synapse_file_copy(sourceBytes.constData(), targetBytes.constData(), operation);
        keyBytes.fill('\0');
        if (result != 0) {
            QFile::remove(temporaryPath);
            return QVariantMap{{"success", false}, {"error", "The local book could not be decrypted."}};
        }

        QVariantMap document = format == "pdf" ? inspectNativePdf(temporaryPath) : readNativeEpub(temporaryPath);
        if (!document.value("success").toBool()) {
            QFile::remove(temporaryPath);
            return document;
        }
        document.insert("success", true);
        document.insert("currentPage", currentPage);
        return document;
    }));
    key.fill(QChar(0));
    resetAutoLockTimer();
}

void SynapseDataController::closeLibraryBook(const QString &temporaryPath) {
    if (m_librarySearchPath == temporaryPath && m_librarySearchCancellation) {
        m_librarySearchCancellation->store(true, std::memory_order_relaxed);
    }
    closeFilePreview(temporaryPath);
}

void SynapseDataController::renderLibraryPdfPage(const QString &temporaryPath, int pageNumber, int targetWidth) {
    const auto fail = [this, pageNumber](const QString &message) {
        emit libraryPdfPageReady({{"success", false}, {"pageNumber", pageNumber}, {"error", message}});
    };
    if (m_fileOperationRunning) return fail("Wait for the current document operation to finish.");
    if (!m_filePreviewFiles.contains(temporaryPath) || !QFileInfo(temporaryPath).isFile()) {
        return fail("The temporary PDF is no longer available.");
    }
    if (pageNumber < 1) return fail("Choose a valid PDF page.");

    auto *pageImage = new QTemporaryFile(QDir(QDir::tempPath()).filePath("synapse-pdf-page-XXXXXX.png"), this);
    pageImage->setAutoRemove(true);
    if (!pageImage->open()) {
        delete pageImage;
        return fail("Could not create a protected PDF page image.");
    }
    const QString imagePath = pageImage->fileName();
    pageImage->close();
    QFile::remove(imagePath);

    m_cancelPreviewRequested = false;
    m_pendingPreviewFile = pageImage;
    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this, [this, watcher, pageImage, imagePath, pageNumber]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        bool success = result.value("success").toBool() && !m_cancelPreviewRequested;
        if (success) {
            m_filePreviewFiles.insert(imagePath, pageImage);
            result.insert("path", imagePath);
            result.insert("url", QUrl::fromLocalFile(imagePath).toString());
        } else {
            QFile::remove(imagePath);
            delete pageImage;
            if (m_cancelPreviewRequested) result.insert("error", "PDF rendering was cancelled because the vault was locked.");
        }
        if (m_pendingPreviewFile == pageImage) m_pendingPreviewFile = nullptr;
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        result.insert("success", success);
        result.insert("pageNumber", pageNumber);
        emit libraryPdfPageReady(result);
    });
    watcher->setFuture(QtConcurrent::run([temporaryPath, pageNumber, targetWidth, imagePath]() {
        return renderNativePdfPage(temporaryPath, pageNumber, targetWidth, imagePath);
    }));
}

QVariantList SynapseDataController::getLibraryBookmarks(const QString &bookId) {
    return executeQuery(QString("SELECT id, book_id, page_number, label, created_at FROM library_bookmarks "
                                "WHERE book_id = '%1' AND deleted_at IS NULL ORDER BY page_number ASC, created_at ASC")
                            .arg(escapeSql(bookId))).toVariantList();
}

bool SynapseDataController::createLibraryBookmark(const QString &bookId, int pageNumber, const QString &label) {
    if (bookId.trimmed().isEmpty() || pageNumber < 1) return false;
    const QString id = generateUuid();
    const QString timestamp = currentTimestamp();
    const QString safeLabel = label.trimmed();
    const QString sql = QString("INSERT INTO library_bookmarks (id, book_id, page_number, label, created_at, updated_at) "
                                "VALUES ('%1', '%2', %3, '%4', '%5', '%5')")
                            .arg(escapeSql(id), escapeSql(bookId)).arg(pageNumber)
                            .arg(escapeSql(safeLabel), timestamp);
    return executeSql(sql);
}

bool SynapseDataController::updateLibraryBookmark(const QString &bookmarkId, const QString &label) {
    const QString id = bookmarkId.trimmed();
    if (id.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_bookmarks SET label = '%1', updated_at = '%2' "
                                "WHERE id = '%3' AND deleted_at IS NULL")
                            .arg(escapeSql(label), timestamp, escapeSql(id));
    return executeSql(sql);
}

bool SynapseDataController::deleteLibraryBookmark(const QString &bookmarkId) {
    const QString id = bookmarkId.trimmed();
    if (id.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_bookmarks SET deleted_at = '%1', updated_at = '%1' "
                                "WHERE id = '%2' AND deleted_at IS NULL")
                            .arg(timestamp, escapeSql(id));
    return executeSql(sql);
}

QVariantList SynapseDataController::getLibraryHighlights(const QString &bookId) {
    return executeQuery(QString("SELECT id, book_id, page_number, text_content, color, note, created_at "
                                "FROM library_highlights WHERE book_id = '%1' AND deleted_at IS NULL "
                                "ORDER BY page_number ASC, created_at ASC")
                            .arg(escapeSql(bookId))).toVariantList();
}

bool SynapseDataController::createLibraryHighlight(const QString &bookId, int pageNumber, const QString &text,
                                                   const QString &color, const QString &note) {
    const QString cleanText = text.trimmed();
    if (bookId.trimmed().isEmpty() || pageNumber < 1 || cleanText.isEmpty()) return false;
    const QStringList allowedColors{"yellow", "green", "blue", "pink", "orange"};
    const QString safeColor = allowedColors.contains(color) ? color : "yellow";
    const QString id = generateUuid();
    const QString timestamp = currentTimestamp();
    const QString sql = QString("INSERT INTO library_highlights (id, book_id, page_number, text_content, color, note, "
                                "created_at, updated_at) VALUES ('%1', '%2', %3, '%4', '%5', '%6', '%7', '%7')")
                            .arg(escapeSql(id), escapeSql(bookId)).arg(pageNumber)
                            .arg(escapeSql(cleanText), escapeSql(safeColor), escapeSql(note.trimmed()), timestamp);
    return executeSql(sql);
}

bool SynapseDataController::updateLibraryHighlight(const QString &highlightId, const QString &note,
                                                   const QString &color) {
    const QString id = highlightId.trimmed();
    if (id.isEmpty()) return false;
    const QStringList allowedColors{"yellow", "green", "blue", "pink", "orange"};
    const QString safeColor = allowedColors.contains(color) ? color : "yellow";
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_highlights SET note = '%1', color = '%2', updated_at = '%3' "
                                "WHERE id = '%4' AND deleted_at IS NULL")
                            .arg(escapeSql(note), escapeSql(safeColor), timestamp, escapeSql(id));
    return executeSql(sql);
}

bool SynapseDataController::deleteLibraryHighlight(const QString &highlightId) {
    const QString id = highlightId.trimmed();
    if (id.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_highlights SET deleted_at = '%1', updated_at = '%1' "
                                "WHERE id = '%2' AND deleted_at IS NULL")
                            .arg(timestamp, escapeSql(id));
    return executeSql(sql);
}

bool SynapseDataController::deleteLibraryHighlightsForBook(const QString &bookId) {
    const QString id = bookId.trimmed();
    if (id.isEmpty()) return false;
    const QString timestamp = currentTimestamp();
    const QString sql = QString("UPDATE library_highlights SET deleted_at = '%1', updated_at = '%1' "
                                "WHERE book_id = '%2' AND deleted_at IS NULL")
                            .arg(timestamp, escapeSql(id));
    return executeSql(sql);
}
