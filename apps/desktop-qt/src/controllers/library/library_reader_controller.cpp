#include "synapse_controller.h"
#include "synapse_bridge.h"
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

    if (!m_db) return fail("Database is not available.");
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    char *raw = synapse_library_get_book(m_db, bidBytes.constData());
    if (!raw) return fail("The selected book is no longer available.");
    const QJsonObject book = QJsonDocument::fromJson(QByteArray(raw)).object();
    synapse_free_string(raw);
    QString recordedPath = book.value("file_path").toString();
    if (recordedPath.startsWith("file://", Qt::CaseInsensitive)) {
        recordedPath.remove(0, 7);
    } else if (recordedPath.startsWith("indexeddb://", Qt::CaseInsensitive)) {
        recordedPath.remove(0, 12);
    }
    const QString originalName = book.value("original_name").toString();
    const QString appDirectory = QFileInfo(m_dbPath).absolutePath();
    const QString libraryDirectory = QDir(appDirectory + "/library").canonicalPath();

    QStringList candidatePaths;
    auto addCandidate = [&candidatePaths](const QString &path) {
        if (!path.isEmpty() && !candidatePaths.contains(path)) {
            candidatePaths.append(path);
        }
    };

    if (QDir::isAbsolutePath(recordedPath)) {
        addCandidate(recordedPath);
        addCandidate(recordedPath + ".enc");
    } else {
        addCandidate(QDir(appDirectory).filePath(recordedPath));
        addCandidate(QDir(appDirectory).filePath(recordedPath + ".enc"));
    }

    if (!libraryDirectory.isEmpty()) {
        const QDir libDir(libraryDirectory);
        addCandidate(libDir.filePath(recordedPath));
        addCandidate(libDir.filePath(recordedPath + ".enc"));
        addCandidate(libDir.filePath(bookId + ".epub"));
        addCandidate(libDir.filePath(bookId + ".epub.enc"));
        addCandidate(libDir.filePath(bookId + ".pdf"));
        addCandidate(libDir.filePath(bookId + ".pdf.enc"));
        if (!originalName.isEmpty()) {
            addCandidate(libDir.filePath(originalName));
            addCandidate(libDir.filePath(originalName + ".enc"));
        }
    }

    if (!originalName.isEmpty()) {
        addCandidate(QDir::homePath() + "/Downloads/epub-pdf/" + originalName);
        addCandidate(QDir::homePath() + "/Downloads/epub-pdf/pdf/" + originalName);
        addCandidate(QDir::homePath() + "/Downloads/" + originalName);
        addCandidate(QDir::homePath() + "/Documents/" + originalName);
    }
    addCandidate(QDir::homePath() + "/Downloads/epub-pdf/" + recordedPath);

    QString sourcePath;
    for (const QString &cand : candidatePaths) {
        if (cand.isEmpty()) continue;
        QFileInfo fi(cand);
        if (fi.exists() && fi.isFile() && fi.isReadable()) {
            sourcePath = fi.canonicalFilePath();
            if (!sourcePath.isEmpty()) break;
        }
    }

    if (sourcePath.isEmpty()) {
        return fail("The local book path is missing or could not be found on disk.");
    }

    QString format = QFileInfo(originalName).suffix().toLower();
    if (format != "pdf" && format != "epub") {
        QString base = recordedPath;
        if (base.endsWith(".enc", Qt::CaseInsensitive)) base.chop(4);
        QString suff = QFileInfo(base).suffix().toLower();
        if (suff == "pdf" || suff == "epub") format = suff;
    }
    if (format != "pdf" && format != "epub") {
        QString baseName = QFileInfo(sourcePath).completeBaseName();
        if (baseName.endsWith(".pdf", Qt::CaseInsensitive)) format = "pdf";
        else if (baseName.endsWith(".epub", Qt::CaseInsensitive)) format = "epub";
        else if (QFileInfo(sourcePath).suffix().toLower() == "pdf") format = "pdf";
        else if (QFileInfo(sourcePath).suffix().toLower() == "epub") format = "epub";
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

void SynapseDataController::renderLibraryPdfPage(const QString &temporaryPath, int pageNumber, int targetWidth,
                                                  const QString &requestId) {
    const auto publishResult = [this, &requestId](QVariantMap result) {
        if (!requestId.isEmpty()) {
            result.insert("request_id", requestId);
            emit notesFilePreviewPdfPageReady(result);
        } else {
            emit libraryPdfPageReady(result);
        }
    };
    const auto fail = [publishResult, pageNumber, temporaryPath](const QString &message) {
        publishResult({{"success", false}, {"pageNumber", pageNumber},
                       {"source_path", temporaryPath}, {"error", message}});
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
    if (!requestId.isEmpty()) m_activeNotesFilePreviewPdfRequestId = requestId;
    m_fileOperationRunning = true;
    emit fileOperationStateChanged();
    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_fileOperationWatcher = watcher;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this, [this, watcher, pageImage, imagePath, pageNumber,
                                                                     temporaryPath, requestId]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        const bool wasCancelled = m_cancelPreviewRequested;
        const bool success = result.value("success").toBool() && !wasCancelled;
        m_cancelPreviewRequested = false;
        if (success) {
            m_filePreviewFiles.insert(imagePath, pageImage);
            result.insert("path", imagePath);
            result.insert("url", QUrl::fromLocalFile(imagePath).toString());
        } else {
            QFile::remove(imagePath);
            delete pageImage;
            if (wasCancelled) result.insert("error", "PDF rendering was cancelled because the preview closed or the vault was locked.");
        }
        if (m_pendingPreviewFile == pageImage) m_pendingPreviewFile = nullptr;
        if (m_activeNotesFilePreviewPdfRequestId == requestId) m_activeNotesFilePreviewPdfRequestId.clear();
        m_fileOperationRunning = false;
        emit fileOperationStateChanged();
        if (m_fileOperationWatcher == watcher) m_fileOperationWatcher = nullptr;
        result.insert("success", success);
        result.insert("pageNumber", pageNumber);
        result.insert("source_path", temporaryPath);
        if (!requestId.isEmpty()) {
            result.insert("request_id", requestId);
            emit notesFilePreviewPdfPageReady(result);
        } else {
            emit libraryPdfPageReady(result);
        }
    });
    watcher->setFuture(QtConcurrent::run([temporaryPath, pageNumber, targetWidth, imagePath]() {
        return renderNativePdfPage(temporaryPath, pageNumber, targetWidth, imagePath);
    }));
}

QVariantList SynapseDataController::getLibraryBookmarks(const QString &bookId) {
    if (!m_db) return {};
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    char *raw = synapse_library_get_bookmarks(m_db, bidBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

bool SynapseDataController::createLibraryBookmark(const QString &bookId, int pageNumber, const QString &label) {
    if (!m_db || bookId.trimmed().isEmpty() || pageNumber < 1) return false;
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    const QByteArray lblBytes = label.trimmed().toUtf8();
    char *raw = synapse_library_add_bookmark(
        m_db, bidBytes.constData(), pageNumber, lblBytes.isEmpty() ? nullptr : lblBytes.constData());
    if (!raw) return false;
    synapse_free_string(raw);
    return true;
}

bool SynapseDataController::updateLibraryBookmark(const QString &bookmarkId, const QString &label) {
    if (!m_db || bookmarkId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = bookmarkId.trimmed().toUtf8();
    const QByteArray lblBytes = label.trimmed().toUtf8();
    return synapse_library_update_bookmark(m_db, idBytes.constData(), lblBytes.constData()) == 1;
}

bool SynapseDataController::deleteLibraryBookmark(const QString &bookmarkId) {
    if (!m_db || bookmarkId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = bookmarkId.trimmed().toUtf8();
    return synapse_library_delete_bookmark(m_db, idBytes.constData()) == 1;
}

QVariantList SynapseDataController::getLibraryHighlights(const QString &bookId) {
    if (!m_db) return {};
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    char *raw = synapse_library_get_highlights(m_db, bidBytes.constData());
    if (!raw) return {};
    const QJsonDocument doc = QJsonDocument::fromJson(QByteArray(raw));
    synapse_free_string(raw);
    return doc.array().toVariantList();
}

bool SynapseDataController::createLibraryHighlight(const QString &bookId, int pageNumber, const QString &text,
                                                   const QString &color, const QString &note) {
    const QString cleanText = text.trimmed();
    if (!m_db || bookId.trimmed().isEmpty() || pageNumber < 1 || cleanText.isEmpty()) return false;
    const QStringList allowedColors{"yellow", "green", "blue", "pink", "orange"};
    const QString safeColor = allowedColors.contains(color) ? color : "yellow";
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    const QByteArray txtBytes = cleanText.toUtf8();
    const QByteArray colBytes = safeColor.toUtf8();
    const QByteArray noteBytes = note.trimmed().toUtf8();
    char *raw = synapse_library_add_highlight(
        m_db, bidBytes.constData(), pageNumber, txtBytes.constData(), colBytes.constData(),
        noteBytes.isEmpty() ? nullptr : noteBytes.constData());
    if (!raw) return false;
    synapse_free_string(raw);
    return true;
}

bool SynapseDataController::updateLibraryHighlight(const QString &highlightId, const QString &note,
                                                   const QString &color) {
    if (!m_db || highlightId.trimmed().isEmpty()) return false;
    const QStringList allowedColors{"yellow", "green", "blue", "pink", "orange"};
    const QString safeColor = allowedColors.contains(color) ? color : "yellow";
    const QByteArray idBytes = highlightId.trimmed().toUtf8();
    const QByteArray colBytes = safeColor.toUtf8();
    const QByteArray noteBytes = note.trimmed().toUtf8();
    return synapse_library_update_highlight(
        m_db, idBytes.constData(), colBytes.constData(), noteBytes.isEmpty() ? nullptr : noteBytes.constData()) == 1;
}

bool SynapseDataController::deleteLibraryHighlight(const QString &highlightId) {
    if (!m_db || highlightId.trimmed().isEmpty()) return false;
    const QByteArray idBytes = highlightId.trimmed().toUtf8();
    return synapse_library_delete_highlight(m_db, idBytes.constData()) == 1;
}

bool SynapseDataController::deleteLibraryHighlightsForBook(const QString &bookId) {
    if (!m_db || bookId.trimmed().isEmpty()) return false;
    const QByteArray bidBytes = bookId.trimmed().toUtf8();
    char *raw = synapse_library_get_highlights(m_db, bidBytes.constData());
    if (!raw) return true;
    const QJsonArray array = QJsonDocument::fromJson(QByteArray(raw)).array();
    synapse_free_string(raw);
    for (const QJsonValue &val : array) {
        const QString hId = val.toObject().value("id").toString();
        if (!hId.isEmpty()) {
            synapse_library_delete_highlight(m_db, hId.toUtf8().constData());
        }
    }
    return true;
}
