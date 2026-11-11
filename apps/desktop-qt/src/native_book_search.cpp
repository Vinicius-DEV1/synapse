#include "native_book_search.h"
#include "native_book_reader.h"

#include <QtCore/QElapsedTimer>
#include <QtCore/QProcess>
#include <QtCore/QStandardPaths>
#include <QtGui/QTextDocumentFragment>

namespace {

constexpr qsizetype MaximumPdfSearchBytes = 64LL * 1024LL * 1024LL;
constexpr int MaximumSearchResults = 100;
constexpr int SearchSnippetRadius = 64;
constexpr int PdfSearchTimeoutMs = 60000;

bool isCancelled(std::atomic_bool *cancelled) {
    return cancelled && cancelled->load(std::memory_order_relaxed);
}

void appendMatches(const QString &pageText, const QString &pageTitle, int pageNumber,
                   const QString &query, QVariantList *results, qint64 *totalMatches) {
    qsizetype cursor = 0;
    while (cursor < pageText.size()) {
        const qsizetype matchIndex = pageText.indexOf(query, cursor, Qt::CaseInsensitive);
        if (matchIndex < 0) break;
        ++(*totalMatches);
        if (results->size() < MaximumSearchResults) {
            const qsizetype snippetStart = qMax<qsizetype>(0, matchIndex - SearchSnippetRadius);
            const qsizetype snippetEnd = qMin<qsizetype>(pageText.size(),
                matchIndex + query.size() + SearchSnippetRadius);
            const QString snippet = pageText.mid(snippetStart, snippetEnd - snippetStart).simplified();
            results->append(QVariantMap{{"pageNumber", pageNumber}, {"pageTitle", pageTitle},
                                        {"snippet", snippet}, {"matchIndex", matchIndex}});
        }
        cursor = matchIndex + qMax(1, query.size());
    }
}

QVariantMap searchPdf(const QString &path, const QString &query, std::atomic_bool *cancelled) {
    const QString extractor = QStandardPaths::findExecutable(QStringLiteral("pdftotext"));
    if (extractor.isEmpty()) {
        return {{"success", false}, {"error", "PDF text search requires pdftotext."}};
    }

    QProcess process;
    process.setProcessChannelMode(QProcess::SeparateChannels);
    process.start(extractor, {QStringLiteral("-layout"), QStringLiteral("-enc"), QStringLiteral("UTF-8"),
                              path, QStringLiteral("-")});
    if (!process.waitForStarted(5000)) {
        return {{"success", false}, {"error", "The PDF text extractor could not be started."}};
    }

    QByteArray extractedText;
    QElapsedTimer elapsed;
    elapsed.start();
    while (process.state() != QProcess::NotRunning) {
        if (isCancelled(cancelled)) {
            process.kill();
            process.waitForFinished(5000);
            extractedText.fill('\0');
            return {{"success", false}, {"error", "Text search was cancelled."}};
        }
        process.waitForReadyRead(100);
        extractedText.append(process.readAllStandardOutput());
        process.readAllStandardError();
        if (extractedText.size() > MaximumPdfSearchBytes) {
            process.kill();
            process.waitForFinished(5000);
            extractedText.fill('\0');
            return {{"success", false}, {"error", "This PDF exceeds the safe text search size limit."}};
        }
        if (elapsed.elapsed() > PdfSearchTimeoutMs) {
            process.kill();
            process.waitForFinished(5000);
            extractedText.fill('\0');
            return {{"success", false}, {"error", "PDF text search timed out."}};
        }
    }
    extractedText.append(process.readAllStandardOutput());
    process.readAllStandardError();
    if (extractedText.size() > MaximumPdfSearchBytes) {
        extractedText.fill('\0');
        return {{"success", false}, {"error", "This PDF exceeds the safe text search size limit."}};
    }
    if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
        extractedText.fill('\0');
        return {{"success", false}, {"error", "Text could not be extracted from this PDF."}};
    }

    QVariantList results;
    qint64 totalMatches = 0;
    int pageNumber = 1;
    qsizetype pageStart = 0;
    while (pageStart <= extractedText.size()) {
        qsizetype pageEnd = extractedText.indexOf('\f', pageStart);
        if (pageEnd < 0) pageEnd = extractedText.size();
        const QString pageText = QString::fromUtf8(extractedText.constData() + pageStart,
                                                    static_cast<qsizetype>(pageEnd - pageStart));
        appendMatches(pageText, QStringLiteral("Page %1").arg(pageNumber), pageNumber,
                      query, &results, &totalMatches);
        if (pageEnd == extractedText.size()) break;
        pageStart = pageEnd + 1;
        ++pageNumber;
    }
    extractedText.fill('\0');
    return {{"success", true}, {"results", results}, {"totalMatches", totalMatches},
            {"truncated", totalMatches > MaximumSearchResults}};
}

QVariantMap searchEpub(const QString &path, const QString &query, std::atomic_bool *cancelled) {
    const QVariantMap document = readNativeEpub(path);
    if (!document.value(QStringLiteral("success")).toBool()) {
        return {{"success", false}, {"error", document.value(QStringLiteral("error"))}};
    }

    QVariantList results;
    qint64 totalMatches = 0;
    const QVariantList chapters = document.value(QStringLiteral("chapters")).toList();
    for (qsizetype index = 0; index < chapters.size(); ++index) {
        if (isCancelled(cancelled)) return {{"success", false}, {"error", "Text search was cancelled."}};
        const QVariantMap chapter = chapters.at(index).toMap();
        const QString html = chapter.value(QStringLiteral("html")).toString();
        const QString plainText = QTextDocumentFragment::fromHtml(html).toPlainText();
        appendMatches(plainText, chapter.value(QStringLiteral("title")).toString(),
                      static_cast<int>(index + 1), query, &results, &totalMatches);
    }
    return {{"success", true}, {"results", results}, {"totalMatches", totalMatches},
            {"truncated", totalMatches > MaximumSearchResults}};
}

}

QVariantMap searchNativeBookText(const QString &path, const QString &format, const QString &query,
                                 std::atomic_bool *cancelled) {
    const QString normalizedQuery = query.trimmed().left(256);
    if (normalizedQuery.isEmpty()) return {{"success", false}, {"error", "Enter a word or phrase to search."}};
    if (isCancelled(cancelled)) return {{"success", false}, {"error", "Text search was cancelled."}};
    if (format == QStringLiteral("pdf")) return searchPdf(path, normalizedQuery, cancelled);
    if (format == QStringLiteral("epub")) return searchEpub(path, normalizedQuery, cancelled);
    return {{"success", false}, {"error", "Text search is unavailable for this book format."}};
}
