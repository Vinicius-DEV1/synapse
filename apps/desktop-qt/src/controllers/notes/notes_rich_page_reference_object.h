#pragma once

#include <QtCore/QObject>
#include <QtGui/QAbstractTextDocumentLayout>

class NotesRichPageReferenceObject final : public QObject, public QTextObjectInterface {
    Q_OBJECT
    Q_INTERFACES(QTextObjectInterface)
public:
    using QObject::QObject;
    QSizeF intrinsicSize(QTextDocument *document, int position, const QTextFormat &format) override;
    void drawObject(QPainter *painter, const QRectF &rect, QTextDocument *document,
                    int position, const QTextFormat &format) override;
};

class QTextCursor;

namespace NotesRichPageReferences {
bool prepare(QTextDocument &document);
int insert(QTextDocument &document, int position, const QString &pageId, const QString &title,
           bool deleted = false);
int insertAtCursor(QTextCursor &cursor, const QString &pageId, const QString &title, bool deleted = false);
}
