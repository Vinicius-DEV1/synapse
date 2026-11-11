#include "native_book_reader.h"

#include <archive.h>
#include <archive_entry.h>
#include <QtCore/QBuffer>
#include <QtCore/QDir>
#include <QtCore/QFileInfo>
#include <QtCore/QHash>
#include <QtCore/QRegularExpression>
#include <QtCore/QSet>
#include <QtCore/QUrl>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QImage>
#include <QtGui/QImageReader>
#include <memory>

namespace {

constexpr qint64 MaxEpubMetadataEntryBytes = 16LL * 1024LL * 1024LL;
constexpr qint64 MaxEpubCoverBytes = 12LL * 1024LL * 1024LL;
constexpr qint64 MaxEpubCoverPixels = 24LL * 1024LL * 1024LL;
constexpr int MaxEpubCoverWidth = 1280;
constexpr int MaxEpubSpineEntries = 2000;

bool readEpubEntry(const QString &archivePath, const QString &entryPath, qint64 maximumBytes,
                   QByteArray *contents, QString *error) {
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
        if (error) *error = "The EPUB archive could not be opened.";
        return false;
    }

    archive_entry *entry = nullptr;
    while (archive_read_next_header(reader.get(), &entry) == ARCHIVE_OK) {
        const char *entryName = archive_entry_pathname(entry);
        const QString name = entryName ? QString::fromUtf8(entryName) : QString();
        if (name != entryPath) {
            archive_read_data_skip(reader.get());
            continue;
        }
        const la_int64_t declaredSize = archive_entry_size(entry);
        if (declaredSize < 0 || declaredSize > maximumBytes) {
            if (error) *error = "An EPUB metadata or cover entry exceeds the safe size limit.";
            return false;
        }
        QByteArray data;
        QByteArray buffer(64 * 1024, Qt::Uninitialized);
        la_ssize_t bytesRead = 0;
        while ((bytesRead = archive_read_data(reader.get(), buffer.data(),
                                               static_cast<size_t>(buffer.size()))) > 0) {
            if (data.size() + bytesRead > maximumBytes) {
                buffer.fill('\0');
                if (error) *error = "An EPUB metadata or cover entry exceeds the safe size limit.";
                return false;
            }
            data.append(buffer.constData(), static_cast<qsizetype>(bytesRead));
        }
        buffer.fill('\0');
        if (bytesRead < 0) {
            if (error) *error = "An EPUB metadata or cover entry could not be decoded.";
            return false;
        }
        *contents = data;
        return true;
    }
    if (error) *error = "The requested EPUB entry was not found.";
    return false;
}

QString resolveEpubPath(const QString &baseDirectory, const QString &relativePath) {
    QString decoded = QUrl::fromPercentEncoding(relativePath.toUtf8());
    if (decoded.isEmpty() || QDir::isAbsolutePath(decoded) || decoded.contains('\\') ||
        decoded.contains(':') || decoded.startsWith("//")) return {};
    decoded = decoded.section('#', 0, 0).section('?', 0, 0);
    const QString resolved = QDir::cleanPath(QDir(baseDirectory).filePath(decoded));
    if (resolved == ".." || resolved.startsWith("../")) return {};
    return resolved;
}

QString makeCoverDataUrl(const QByteArray &source, const QString &formatHint) {
    if (source.isEmpty() || source.size() > MaxEpubCoverBytes) return {};
    QByteArray imageBytes = source;
    QBuffer input(&imageBytes);
    if (!input.open(QIODevice::ReadOnly)) return {};
    QImageReader imageReader(&input, formatHint.toLatin1());
    imageReader.setDecideFormatFromContent(true);
    const QSize dimensions = imageReader.size();
    if (!imageReader.canRead() || !dimensions.isValid() ||
        static_cast<qint64>(dimensions.width()) * dimensions.height() > MaxEpubCoverPixels) return {};
    QImage image = imageReader.read();
    if (image.isNull()) return {};
    if (image.width() > MaxEpubCoverWidth) {
        image = image.scaledToWidth(MaxEpubCoverWidth, Qt::SmoothTransformation);
    }
    image = image.convertToFormat(QImage::Format_RGB32);

    QByteArray encoded;
    QBuffer output(&encoded);
    if (!output.open(QIODevice::WriteOnly) || !image.save(&output, "JPEG", 78) ||
        encoded.isEmpty() || encoded.size() > MaxEpubCoverBytes) return {};
    return QStringLiteral("data:image/jpeg;base64,%1").arg(QString::fromLatin1(encoded.toBase64()));
}

} // namespace

QVariantMap inspectNativeEpubMetadata(const QString &path) {
    QByteArray container;
    QString error;
    if (!readEpubEntry(path, QStringLiteral("META-INF/container.xml"), MaxEpubMetadataEntryBytes,
                       &container, &error)) {
        return {{"success", false}, {"error", error}};
    }

    QString packagePath;
    QXmlStreamReader containerXml(container);
    while (!containerXml.atEnd()) {
        containerXml.readNext();
        if (containerXml.isStartElement() && containerXml.name() == QStringLiteral("rootfile")) {
            packagePath = resolveEpubPath({}, containerXml.attributes().value("full-path").toString());
            break;
        }
    }
    if (containerXml.hasError() || packagePath.isEmpty()) {
        return {{"success", false}, {"error", "The EPUB package location is invalid."}};
    }

    QByteArray package;
    if (!readEpubEntry(path, packagePath, MaxEpubMetadataEntryBytes, &package, &error)) {
        return {{"success", false}, {"error", error}};
    }

    QString title;
    QString author;
    QString legacyCoverId;
    QString coverPath;
    QString coverMediaType;
    int spineCount = 0;
    QXmlStreamReader packageXml(package);
    while (!packageXml.atEnd()) {
        packageXml.readNext();
        if (!packageXml.isStartElement()) continue;
        const QString elementName = packageXml.name().toString();
        if (elementName == QStringLiteral("title") && title.isEmpty()) {
            title = packageXml.readElementText(QXmlStreamReader::IncludeChildElements).trimmed().left(512);
        } else if (elementName == QStringLiteral("creator") && author.isEmpty()) {
            author = packageXml.readElementText(QXmlStreamReader::IncludeChildElements).trimmed().left(512);
        } else if (elementName == QStringLiteral("meta") &&
                   packageXml.attributes().value("name") == QStringLiteral("cover")) {
            legacyCoverId = packageXml.attributes().value("content").toString();
        } else if (elementName == QStringLiteral("item")) {
            const auto attributes = packageXml.attributes();
            const QString itemId = attributes.value("id").toString();
            const QString properties = attributes.value("properties").toString();
            const bool epub3Cover = properties.split(QRegularExpression(QStringLiteral("\\s+")),
                                                      Qt::SkipEmptyParts).contains(QStringLiteral("cover-image"));
            if (coverPath.isEmpty() && (epub3Cover || (!legacyCoverId.isEmpty() && itemId == legacyCoverId))) {
                coverPath = resolveEpubPath(QFileInfo(packagePath).path(), attributes.value("href").toString());
                coverMediaType = attributes.value("media-type").toString();
            }
        } else if (elementName == QStringLiteral("itemref")) {
            if (spineCount < MaxEpubSpineEntries) ++spineCount;
        }
    }
    if (packageXml.hasError()) {
        return {{"success", false}, {"error", "The EPUB package metadata is malformed."}};
    }

    QVariantMap result{{"success", true}, {"title", title}, {"author", author},
                       {"totalPages", spineCount}};
    if (!coverPath.isEmpty() && coverMediaType.startsWith(QStringLiteral("image/"), Qt::CaseInsensitive)) {
        QByteArray coverBytes;
        QString ignoredError;
        if (readEpubEntry(path, coverPath, MaxEpubCoverBytes, &coverBytes, &ignoredError)) {
            const QString dataUrl = makeCoverDataUrl(coverBytes, coverMediaType.mid(6));
            coverBytes.fill('\0');
            if (!dataUrl.isEmpty()) result.insert(QStringLiteral("coverImage"), dataUrl);
        }
    }
    return result;
}
