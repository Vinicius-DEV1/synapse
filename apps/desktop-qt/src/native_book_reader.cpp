#include "native_book_reader.h"

#include <archive.h>
#include <archive_entry.h>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QProcess>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QStandardPaths>
#include <QtCore/QTextStream>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextDocumentFragment>
#include <memory>

namespace {

constexpr qint64 MaxArchiveEntryBytes = 16LL * 1024LL * 1024LL;
constexpr qint64 MaxEpubContentBytes = 64LL * 1024LL * 1024LL;
constexpr int MaxEpubSpineEntries = 2000;

bool runNativeCommand(const QString &program, const QStringList &arguments,
                      QByteArray *standardOutput, QString *error) {
    QProcess process;
    process.start(program, arguments);
    if (!process.waitForStarted(5000)) {
        if (error) *error = "The native document renderer could not be started.";
        return false;
    }
    if (!process.waitForFinished(120000)) {
        process.kill();
        process.waitForFinished(5000);
        if (error) *error = "The native document renderer timed out.";
        return false;
    }
    if (process.exitStatus() != QProcess::NormalExit || process.exitCode() != 0) {
        if (error) *error = QString::fromLocal8Bit(process.readAllStandardError()).trimmed();
        if (error && error->isEmpty()) *error = "The native document renderer failed.";
        return false;
    }
    if (standardOutput) *standardOutput = process.readAllStandardOutput();
    return true;
}

bool readArchiveEntries(const QString &archivePath, const QSet<QString> &wanted,
                        QHash<QString, QByteArray> *contents, QString *error) {
    using ArchivePtr = std::unique_ptr<archive, decltype(&archive_read_free)>;
    ArchivePtr reader(archive_read_new(), &archive_read_free);
    if (!reader) {
        if (error) *error = "Could not create the EPUB archive reader.";
        return false;
    }
    archive_read_support_filter_all(reader.get());
    archive_read_support_format_zip(reader.get());
    const QByteArray pathBytes = archivePath.toUtf8();
    if (archive_read_open_filename(reader.get(), pathBytes.constData(), 65536) != ARCHIVE_OK) {
        if (error) *error = "The EPUB container could not be opened.";
        return false;
    }

    archive_entry *entry = nullptr;
    while (archive_read_next_header(reader.get(), &entry) == ARCHIVE_OK) {
        const char *entryName = archive_entry_pathname(entry);
        const QString name = entryName ? QString::fromUtf8(entryName) : QString();
        if (!wanted.contains(name)) {
            archive_read_data_skip(reader.get());
            continue;
        }

        QByteArray data;
        QByteArray buffer(64 * 1024, Qt::Uninitialized);
        la_ssize_t bytesRead = 0;
        while ((bytesRead = archive_read_data(reader.get(), buffer.data(), static_cast<size_t>(buffer.size()))) > 0) {
            if (data.size() + bytesRead > MaxArchiveEntryBytes) {
                if (error) *error = "An EPUB document section is too large to display safely.";
                return false;
            }
            data.append(buffer.constData(), static_cast<qsizetype>(bytesRead));
        }
        buffer.fill('\0');
        if (bytesRead < 0) {
            if (error) *error = "An EPUB document section could not be decoded.";
            return false;
        }
        contents->insert(name, data);
    }
    return true;
}

QString cleanArchivePath(const QString &baseDirectory, const QString &relativePath) {
    QString path = relativePath.section('#', 0, 0).section('?', 0, 0);
    path = QUrl::fromPercentEncoding(path.toUtf8());
    if (QDir::isAbsolutePath(path)) return {};
    const QString clean = QDir::cleanPath(QDir(baseDirectory).filePath(path));
    if (clean == ".." || clean.startsWith("../")) return {};
    return clean;
}

QString sanitizeXhtml(const QByteArray &bytes) {
    QString html = QString::fromUtf8(bytes);
    html.remove(QRegularExpression("(?is)<(script|iframe|object|embed)\\b[^>]*>.*?</\\1\\s*>"));
    html.remove(QRegularExpression("(?is)<(script|iframe|object|embed)\\b[^>]*/\\s*>"));
    html.replace(QRegularExpression("(?i)\\s+href\\s*=\\s*([\"'])\\s*javascript:[^\"']*\\1"), "");
    const QRegularExpression bodyPattern("(?is)<body\\b[^>]*>(.*?)</body\\s*>");
    const QRegularExpressionMatch body = bodyPattern.match(html);
    if (body.hasMatch()) html = body.captured(1);
    return html.trimmed();
}

QString firstXhtmlHeading(const QByteArray &bytes) {
    QXmlStreamReader xml(bytes);
    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement() &&
            (xml.name() == QStringLiteral("h1") || xml.name() == QStringLiteral("h2") ||
             xml.name() == QStringLiteral("title"))) {
            const QString heading = xml.readElementText(QXmlStreamReader::IncludeChildElements).trimmed();
            if (!heading.isEmpty()) return heading;
        }
    }
    const QString plainText = QTextDocumentFragment::fromHtml(QString::fromUtf8(bytes)).toPlainText().simplified();
    return plainText.left(90);
}

} // namespace

QVariantMap inspectNativePdf(const QString &path) {
    const QString pdfInfo = QStandardPaths::findExecutable("pdfinfo");
    const QString pdfRenderer = QStandardPaths::findExecutable("pdftoppm");
    if (pdfInfo.isEmpty() || pdfRenderer.isEmpty()) {
        return {{"success", false}, {"error", "The native PDF tools pdfinfo and pdftoppm are required."}};
    }
    QByteArray output;
    QString error;
    if (!runNativeCommand(pdfInfo, {path}, &output, &error)) {
        return {{"success", false}, {"error", error}};
    }
    const QRegularExpression pagesPattern("(?m)^Pages:\\s+(\\d+)");
    const QString infoText = QString::fromLocal8Bit(output);
    const QRegularExpressionMatch pagesMatch = pagesPattern.match(infoText);
    if (!pagesMatch.hasMatch()) {
        return {{"success", false}, {"error", "The PDF page count could not be read."}};
    }
    const auto readMetadataField = [&infoText](const QString &fieldName) {
        const QRegularExpression fieldPattern(
            QStringLiteral("(?m)^%1:\\s*(.*?)\\s*$").arg(QRegularExpression::escape(fieldName)));
        const QRegularExpressionMatch match = fieldPattern.match(infoText);
        if (!match.hasMatch()) return QString();
        const QString value = match.captured(1).trimmed();
        if (value.isEmpty() || value == QStringLiteral("(none)") || value == QStringLiteral("-")) return QString();
        return value.left(512);
    };
    return {{"success", true}, {"totalPages", pagesMatch.captured(1).toInt()},
            {"title", readMetadataField(QStringLiteral("Title"))},
            {"author", readMetadataField(QStringLiteral("Author"))}};
}

QVariantMap readNativeEpub(const QString &path) {
    QSet<QString> packageCandidates;
    packageCandidates.insert("META-INF/container.xml");
    using ArchivePtr = std::unique_ptr<archive, decltype(&archive_read_free)>;
    ArchivePtr reader(archive_read_new(), &archive_read_free);
    if (!reader) return {{"success", false}, {"error", "Could not create the EPUB archive reader."}};
    archive_read_support_filter_all(reader.get());
    archive_read_support_format_zip(reader.get());
    const QByteArray pathBytes = path.toUtf8();
    if (archive_read_open_filename(reader.get(), pathBytes.constData(), 65536) != ARCHIVE_OK) {
        return {{"success", false}, {"error", "The EPUB container could not be opened."}};
    }

    archive_entry *entry = nullptr;
    while (archive_read_next_header(reader.get(), &entry) == ARCHIVE_OK) {
        const char *entryName = archive_entry_pathname(entry);
        const QString name = entryName ? QString::fromUtf8(entryName) : QString();
        if (name.endsWith(".opf", Qt::CaseInsensitive)) packageCandidates.insert(name);
        archive_read_data_skip(reader.get());
    }

    QHash<QString, QByteArray> packageContents;
    QString error;
    if (!readArchiveEntries(path, packageCandidates, &packageContents, &error)) {
        return {{"success", false}, {"error", error}};
    }
    const QByteArray container = packageContents.value("META-INF/container.xml");
    if (container.isEmpty()) return {{"success", false}, {"error", "The EPUB container metadata is missing."}};

    QString packagePath;
    QXmlStreamReader containerXml(container);
    while (!containerXml.atEnd()) {
        containerXml.readNext();
        if (containerXml.isStartElement() && containerXml.name() == QStringLiteral("rootfile")) {
            packagePath = containerXml.attributes().value("full-path").toString();
            break;
        }
    }
    if (packagePath.isEmpty() || !packageContents.contains(packagePath)) {
        return {{"success", false}, {"error", "The EPUB package document could not be found."}};
    }

    QHash<QString, QString> manifest;
    QStringList spineIds;
    QString title;
    QString author;
    QXmlStreamReader packageXml(packageContents.value(packagePath));
    while (!packageXml.atEnd()) {
        packageXml.readNext();
        if (!packageXml.isStartElement()) continue;
        if (packageXml.name() == QStringLiteral("item")) {
            const auto attributes = packageXml.attributes();
            const QString itemId = attributes.value("id").toString();
            const QString href = attributes.value("href").toString();
            const QString mediaType = attributes.value("media-type").toString();
            if (!itemId.isEmpty() && !href.isEmpty() && mediaType.contains("xhtml", Qt::CaseInsensitive)) {
                manifest.insert(itemId, href);
            }
        } else if (packageXml.name() == QStringLiteral("itemref")) {
            const QString itemId = packageXml.attributes().value("idref").toString();
            if (!itemId.isEmpty()) spineIds.append(itemId);
        } else if (packageXml.name() == QStringLiteral("title") && title.isEmpty()) {
            title = packageXml.readElementText(QXmlStreamReader::IncludeChildElements).trimmed();
        } else if (packageXml.name() == QStringLiteral("creator") && author.isEmpty()) {
            author = packageXml.readElementText(QXmlStreamReader::IncludeChildElements).trimmed();
        }
    }
    if (packageXml.hasError()) return {{"success", false}, {"error", "The EPUB package metadata is malformed."}};

    const QString packageDirectory = QFileInfo(packagePath).path();
    QStringList chapterPaths;
    for (const QString &itemId : spineIds) {
        if (chapterPaths.size() >= MaxEpubSpineEntries) break;
        const QString href = manifest.value(itemId);
        if (href.isEmpty()) continue;
        const QString resolved = cleanArchivePath(packageDirectory, href);
        if (!resolved.isEmpty()) chapterPaths.append(resolved);
    }
    if (chapterPaths.isEmpty()) return {{"success", false}, {"error", "The EPUB has no readable chapters."}};

    QHash<QString, QByteArray> chapterContents;
    if (!readArchiveEntries(path, QSet<QString>(chapterPaths.cbegin(), chapterPaths.cend()), &chapterContents, &error)) {
        return {{"success", false}, {"error", error}};
    }
    QVariantList chapters;
    qint64 totalContentBytes = 0;
    for (const QString &chapterPath : chapterPaths) {
        const QByteArray source = chapterContents.value(chapterPath);
        if (source.isEmpty()) continue;
        totalContentBytes += source.size();
        if (totalContentBytes > MaxEpubContentBytes) {
            return {{"success", false}, {"error", "This EPUB is too large to load as a single native document."}};
        }
        QString chapterTitle = firstXhtmlHeading(source);
        if (chapterTitle.isEmpty()) chapterTitle = QString("Chapter %1").arg(chapters.size() + 1);
        chapters.append(QVariantMap{{"title", chapterTitle}, {"html", sanitizeXhtml(source)}});
    }
    if (chapters.isEmpty()) return {{"success", false}, {"error", "The EPUB chapter contents could not be read."}};
    return {{"success", true}, {"title", title}, {"author", author}, {"chapters", chapters},
            {"totalPages", chapters.size()}};
}

QVariantMap renderNativePdfPage(const QString &path, int pageNumber, int targetWidth, const QString &imagePath) {
    if (pageNumber < 1) return {{"success", false}, {"error", "Choose a valid PDF page."}};
    const QString renderer = QStandardPaths::findExecutable("pdftoppm");
    if (renderer.isEmpty()) return {{"success", false}, {"error", "The native PDF renderer pdftoppm is unavailable."}};
    const QString outputPrefix = imagePath.endsWith(".png", Qt::CaseInsensitive)
        ? imagePath.left(imagePath.size() - 4) : imagePath;
    QString error;
    const QString page = QString::number(pageNumber);
    const QString width = QString::number(qBound(600, targetWidth, 2400));
    if (!runNativeCommand(renderer, {"-f", page, "-l", page, "-singlefile", "-scale-to", width,
                                    "-png", path, outputPrefix}, nullptr, &error)) {
        return {{"success", false}, {"error", error}};
    }
    if (!QFileInfo::exists(imagePath) || QFileInfo(imagePath).size() <= 0) {
        return {{"success", false}, {"error", "The PDF page image could not be created."}};
    }

    QString pageText;
    const QString textExtractor = QStandardPaths::findExecutable("pdftotext");
    if (!textExtractor.isEmpty()) {
        QByteArray textBytes;
        if (runNativeCommand(textExtractor, {"-f", page, "-l", page, "-layout", path, "-"}, &textBytes, nullptr)) {
            pageText = QString::fromUtf8(textBytes);
            textBytes.fill('\0');
        }
    }
    return {{"success", true}, {"pageNumber", pageNumber}, {"text", pageText}};
}
