#pragma once

#include <QtCore/QObject>
#include <QtCore/QHash>
#include <QtCore/QSet>
#include <QtCore/QVariantList>
#include <QtGui/QAbstractTextDocumentLayout>

class NotesRichPageReferenceObject final : public QObject, public QTextObjectInterface {
    Q_OBJECT
    Q_INTERFACES(QTextObjectInterface)
public:
    using QObject::QObject;
    bool setPageSnapshot(const QVariantList &pages);
    QString resolvedTitle(const QTextFormat &format) const;
    bool resolvedDeleted(const QTextFormat &format) const;
    QSizeF intrinsicSize(QTextDocument *document, int position, const QTextFormat &format) override;
    void drawObject(QPainter *painter, const QRectF &rect, QTextDocument *document,
                    int position, const QTextFormat &format) override;

private:
    QHash<QString, QString> m_activePageTitles;
    QSet<QString> m_activePageIds;
    bool m_hasPageSnapshot = false;
};

class QTextCursor;

namespace NotesRichPageReferences {
bool prepare(QTextDocument &document, const QVariantList &pages);
bool refreshPageSnapshot(QTextDocument &document, const QVariantList &pages);
QString resolvedTitle(const QTextDocument &document, const QTextFormat &format);
bool resolvedDeleted(const QTextDocument &document, const QTextFormat &format);
int insert(QTextDocument &document, int position, const QString &pageId, const QString &title,
           bool deleted = false);
int insertAtCursor(QTextCursor &cursor, const QString &pageId, const QString &title, bool deleted = false);
}
