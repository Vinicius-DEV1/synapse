#ifndef NATIVE_BOOK_SEARCH_H
#define NATIVE_BOOK_SEARCH_H

#include <atomic>
#include <QtCore/QVariantMap>

QVariantMap searchNativeBookText(const QString &path, const QString &format, const QString &query,
                                 std::atomic_bool *cancelled = nullptr);

#endif // NATIVE_BOOK_SEARCH_H
