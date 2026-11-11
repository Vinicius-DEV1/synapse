#ifndef LIBRARY_METADATA_CONTROLLER_H
#define LIBRARY_METADATA_CONTROLLER_H

#include <QtCore/QByteArray>
#include <QtCore/QVariantMap>

QVariantMap parseOpenLibraryMetadata(const QByteArray &responseBytes);

#endif // LIBRARY_METADATA_CONTROLLER_H
