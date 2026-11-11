#ifndef NATIVE_BOOK_READER_H
#define NATIVE_BOOK_READER_H

#include <QtCore/QVariantMap>

QVariantMap inspectNativePdf(const QString &path);
QVariantMap inspectNativeEpubMetadata(const QString &path);
QVariantMap readNativeEpub(const QString &path);
QVariantMap renderNativePdfPage(const QString &path, int pageNumber, int targetWidth,
                                const QString &imagePath);
QVariantMap extractNativePdfCover(const QString &path);

#endif // NATIVE_BOOK_READER_H
