#pragma once

#include <QtCore/QString>
#include <QtCore/QXmlStreamReader>
#include <QtGui/QTextImageFormat>

class QTextBlock;
class QTextDocument;

namespace NotesRichImages {

bool supportsAttributes(const QXmlStreamAttributes &attributes);
bool supportsDataUrl(const QString &dataUrl, QSize *naturalSize = nullptr);
QString wrapRootImages(const QString &source);
bool serialize(const QTextImageFormat &format, QString &html);
bool serializeStandaloneBlock(const QTextBlock &block, QString &html);
bool prepare(QTextDocument &document);
bool canInsertAt(const QTextDocument &document, int position);
int insert(QTextDocument &document, int start, int end, const QString &dataUrl,
           const QString &alt, int width, int height);

}
