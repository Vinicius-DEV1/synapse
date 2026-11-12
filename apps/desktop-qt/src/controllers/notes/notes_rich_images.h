#pragma once

#include <QtCore/QString>
#include <QtCore/QXmlStreamReader>
#include <QtCore/QVariantList>
#include <QtGui/QTextImageFormat>
#include <QtCore/QVariantMap>

class QTextBlock;
class QTextDocument;

namespace NotesRichImages {

inline constexpr int MaximumBatchSize = 20;

bool supportsAttributes(const QXmlStreamAttributes &attributes);
bool supportsDataUrl(const QString &dataUrl, QSize *naturalSize = nullptr);
QString wrapRootImages(const QString &source);
bool serialize(const QTextImageFormat &format, QString &html);
bool serializeStandaloneBlock(const QTextBlock &block, QString &html);
bool prepare(QTextDocument &document, const QString &source);
bool canInsertAt(const QTextDocument &document, int position);
int insertionPositionAfter(const QTextDocument &document, int imagePosition);
QVariantMap imageAt(const QTextDocument &document, int cursorPosition,
                    int selectionStart, int selectionEnd);
QString imageData(const QTextDocument &document, int imagePosition);
QVariantList captions(const QTextDocument &document);
bool setAlignment(QTextDocument &document, int imagePosition, const QString &alignment);
bool setCaption(QTextDocument &document, int imagePosition, const QString &caption);
bool setSize(QTextDocument &document, int imagePosition, int width, int height);
int insert(QTextDocument &document, int start, int end, const QString &dataUrl,
           const QString &alt, int width, int height);
int insertMany(QTextDocument &document, int start, int end, const QVariantList &images);

}
