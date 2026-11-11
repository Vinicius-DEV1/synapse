#include "synapse_controller.h"
#include "native_book_search.h"

#include <QtConcurrent/QtConcurrentRun>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>

namespace {

QVariantMap librarySearchFailure(int requestId, const QString &message) {
    return {{"success", false}, {"requestId", requestId}, {"error", message},
            {"operation", "library-search"}};
}

}

void SynapseDataController::searchLibraryBookText(const QString &temporaryPath, const QString &format,
                                                  const QString &query, int requestId) {
    if (m_librarySearchRunning) {
        emit libraryBookSearchReady(librarySearchFailure(requestId, "Wait for the current book search to finish."));
        return;
    }
    if (m_fileOperationRunning) {
        emit libraryBookSearchReady(librarySearchFailure(requestId, "Wait for the current document operation to finish."));
        return;
    }
    if (m_isVaultConfigured && !m_isVaultUnlocked) {
        emit libraryBookSearchReady(librarySearchFailure(requestId, "Unlock the vault before searching book contents."));
        return;
    }
    const QString normalizedFormat = format.trimmed().toLower();
    const QString extension = QFileInfo(temporaryPath).suffix().toLower();
    if ((normalizedFormat != "pdf" && normalizedFormat != "epub") || extension != normalizedFormat ||
        !m_filePreviewFiles.contains(temporaryPath) || !QFileInfo(temporaryPath).isFile()) {
        emit libraryBookSearchReady(librarySearchFailure(requestId, "The opened book is no longer available for search."));
        return;
    }
    if (query.trimmed().isEmpty()) {
        emit libraryBookSearchReady(librarySearchFailure(requestId, "Enter a word or phrase to search."));
        return;
    }

    auto cancellation = std::make_shared<std::atomic_bool>(false);
    m_librarySearchCancellation = cancellation;
    m_librarySearchPath = temporaryPath;
    m_librarySearchRequestId = requestId;
    m_librarySearchRunning = true;
    emit librarySearchStateChanged();

    auto *watcher = new QFutureWatcher<QVariantMap>(this);
    m_librarySearchWatcher = watcher;
    connect(watcher, &QFutureWatcher<QVariantMap>::finished, this,
            [this, watcher, cancellation, temporaryPath, requestId]() {
        QVariantMap result = watcher->result();
        watcher->deleteLater();
        if (!m_filePreviewFiles.contains(temporaryPath) || !QFileInfo(temporaryPath).isFile() ||
            (m_isVaultConfigured && !m_isVaultUnlocked)) {
            result = librarySearchFailure(requestId, "Book search was cancelled because the reader closed or the vault locked.");
        }
        if (m_librarySearchCancellation == cancellation) {
            m_librarySearchCancellation.reset();
            m_librarySearchPath.clear();
            m_librarySearchRequestId = 0;
        }
        if (m_librarySearchWatcher == watcher) m_librarySearchWatcher = nullptr;
        m_librarySearchRunning = false;
        emit librarySearchStateChanged();
        result.insert("requestId", requestId);
        result.insert("operation", "library-search");
        emit libraryBookSearchReady(result);
    });
    watcher->setFuture(QtConcurrent::run([temporaryPath, normalizedFormat, query, cancellation]() {
        return searchNativeBookText(temporaryPath, normalizedFormat, query, cancellation.get());
    }));
    resetAutoLockTimer();
}

bool SynapseDataController::cancelLibraryBookSearch(int requestId) {
    if (!m_librarySearchRunning || requestId != m_librarySearchRequestId || !m_librarySearchCancellation) return false;
    m_librarySearchCancellation->store(true, std::memory_order_relaxed);
    return true;
}
