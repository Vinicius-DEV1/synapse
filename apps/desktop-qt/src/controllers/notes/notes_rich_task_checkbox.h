#pragma once

#include <QtCore/QObject>
#include <QtGui/QAbstractTextDocumentLayout>

class NotesRichTaskCheckbox final : public QObject, public QTextObjectInterface {
    Q_OBJECT
    Q_INTERFACES(QTextObjectInterface)
public:
    using QObject::QObject;
    QSizeF intrinsicSize(QTextDocument *document, int position, const QTextFormat &format) override;
    void drawObject(QPainter *painter, const QRectF &rect, QTextDocument *document,
                    int position, const QTextFormat &format) override;
};
