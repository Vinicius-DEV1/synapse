#pragma once

#include <QtCore/QObject>
#include <QtCore/QString>
#include <QtCore/QVariantMap>
#include <QtCore/QVariantList>
#include <QtQuick/QQuickTextDocument>

class QTextDocument;

class NotesTextOperations final : public QObject {
    Q_OBJECT
public:
    using QObject::QObject;
    Q_INVOKABLE bool replace(QQuickTextDocument *document, int start, int end, const QString &replacement);
    Q_INVOKABLE bool supportsRichSource(const QString &source) const;
    Q_INVOKABLE QString richSourceForEditor(const QString &source) const;
    Q_INVOKABLE bool prepareRichHeadings(QQuickTextDocument *document, const QString &source) const;
    Q_INVOKABLE bool prepareRichCallouts(QQuickTextDocument *document, const QString &source) const;
    Q_INVOKABLE bool isRichCalloutAt(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE QString richCalloutColorAt(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool setRichCalloutColor(QQuickTextDocument *document, int start, int end,
                                         const QString &color) const;
    Q_INVOKABLE bool prepareRichSpoilers(QQuickTextDocument *document) const;
    Q_INVOKABLE bool isRichSpoilerAt(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool isRichSpoilerRevealedAt(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool setRichSpoilerVisibility(QQuickTextDocument *document, int position,
                                              const QString &action) const;
    Q_INVOKABLE QVariantMap serializeRich(QQuickTextDocument *document) const;
    Q_INVOKABLE bool toggleRich(QQuickTextDocument *document, int start, int end, const QString &mark) const;
    Q_INVOKABLE bool toggleRichBlock(QQuickTextDocument *document, int start, int end, const QString &blockType) const;
    Q_INVOKABLE bool changeRichListIndent(QQuickTextDocument *document, int position, bool outdent) const;
    Q_INVOKABLE bool toggleRichTaskItem(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool toggleRichTaskItemFromCursor(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE QVariantList richTaskCheckboxes(QQuickTextDocument *document) const;
    Q_INVOKABLE int insertRichDivider(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE bool isRichDivider(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool canMoveRichDivider(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int moveRichDivider(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int insertRichParagraphBelowDivider(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE int insertRichTable(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE bool isRichTableCell(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool canApplyRichTableAction(QQuickTextDocument *document, int position,
                                             const QString &action) const;
    Q_INVOKABLE bool applyRichTableAction(QQuickTextDocument *document, int position, const QString &action) const;
    Q_INVOKABLE bool setRichTableCellBackground(QQuickTextDocument *document, int position,
                                                const QString &color, const QString &scope) const;
    Q_INVOKABLE bool setRichColor(QQuickTextDocument *document, int start, int end,
                                  const QString &color, bool background) const;
    Q_INVOKABLE bool setRichLink(QQuickTextDocument *document, int start, int end, const QString &url) const;
    Q_INVOKABLE QString richLinkUrl(QQuickTextDocument *document, int start, int end) const;
    static bool replaceDocumentText(QTextDocument *document, int start, int end, const QString &replacement);
};
