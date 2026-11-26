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
    Q_INVOKABLE QString richSourceForEditorWithPages(const QString &source, const QVariantList &pages) const;
    Q_INVOKABLE QString richPageReferenceId(const QString &href) const;
    Q_INVOKABLE QVariantMap richPageReferenceAt(QQuickTextDocument *document, int start, int end,
                                                 bool preferPreviousCharacter) const;
    Q_INVOKABLE int richSourceOffsetForEditorPosition(QQuickTextDocument *document,
                                                       int editorPosition) const;
    Q_INVOKABLE QVariantMap richPageReferenceRangeForHref(QQuickTextDocument *document,
                                                           const QString &href,
                                                           int hintPosition) const;
    Q_INVOKABLE bool removeRichPageReference(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE int replaceRichPageReferenceText(QQuickTextDocument *document, int start, int end,
                                                 const QString &replacement) const;
    Q_INVOKABLE bool copyRichPageReference(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE int pasteRichPageReference(QQuickTextDocument *document, int start, int end,
                                           const QVariantList &pages) const;
    Q_INVOKABLE int insertRichPageReference(QQuickTextDocument *document, int position,
                                            const QString &pageId, const QString &title) const;
    Q_INVOKABLE bool prepareRichHeadings(QQuickTextDocument *document, const QString &source) const;
    Q_INVOKABLE bool prepareRichPageReferences(QQuickTextDocument *document,
                                                const QVariantList &pages) const;
    Q_INVOKABLE bool refreshRichPageReferences(QQuickTextDocument *document,
                                                const QVariantList &pages) const;
    Q_INVOKABLE bool prepareRichCodeBlocks(QQuickTextDocument *document, const QString &source) const;
    Q_INVOKABLE bool isRichCodeBlock(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool canMoveRichCodeBlock(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int moveRichCodeBlock(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int moveRichCodeBlockTo(QQuickTextDocument *document, int position, int targetPosition,
                                        bool afterTarget) const;
    Q_INVOKABLE QString richCodeBlockLanguage(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool setRichCodeBlockLanguage(QQuickTextDocument *document, int position,
                                              const QString &language) const;
    Q_INVOKABLE QObject *createRichCodeSyntaxHighlighter(QQuickTextDocument *document);
    Q_INVOKABLE void releaseRichCodeSyntaxHighlighter(QObject *highlighter);
    Q_INVOKABLE void refreshRichCodeSyntaxHighlighting(QObject *highlighter);
    Q_INVOKABLE bool copyRichCodeBlock(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE int insertRichParagraphBelowCodeBlock(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE int deleteRichCodeBlock(QQuickTextDocument *document, int position) const;
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
    Q_INVOKABLE bool prepareRichImages(QQuickTextDocument *document, const QString &source) const;
    Q_INVOKABLE bool canInsertRichImage(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE int insertRichImage(QQuickTextDocument *document, int start, int end,
                                    const QString &dataUrl, const QString &alt, int width, int height) const;
    Q_INVOKABLE int insertRichImages(QQuickTextDocument *document, int start, int end,
                                     const QVariantList &images) const;
    Q_INVOKABLE int richImageInsertionPositionAfter(QQuickTextDocument *document,
                                                    int imagePosition) const;
    Q_INVOKABLE int adjacentRichImagePosition(QQuickTextDocument *document,
                                              int cursorPosition, bool backward) const;
    Q_INVOKABLE bool removeRichImage(QQuickTextDocument *document, int imagePosition) const;
    Q_INVOKABLE QVariantMap richImageAt(QQuickTextDocument *document, int cursorPosition,
                                        int selectionStart, int selectionEnd) const;
    Q_INVOKABLE QString richImageData(QQuickTextDocument *document, int imagePosition) const;
    Q_INVOKABLE QVariantList richImageCaptions(QQuickTextDocument *document) const;
    Q_INVOKABLE bool canMoveRichImage(QQuickTextDocument *document, int imagePosition, bool upward) const;
    Q_INVOKABLE int moveRichImage(QQuickTextDocument *document, int imagePosition, bool upward) const;
    Q_INVOKABLE int insertRichParagraphBelowImage(QQuickTextDocument *document, int imagePosition) const;
    Q_INVOKABLE bool setRichImageAlignment(QQuickTextDocument *document, int imagePosition,
                                            const QString &alignment) const;
    Q_INVOKABLE bool setRichImageCaption(QQuickTextDocument *document, int imagePosition,
                                          const QString &caption) const;
    Q_INVOKABLE bool setRichImageSize(QQuickTextDocument *document, int imagePosition,
                                       int width, int height) const;
    Q_INVOKABLE bool replaceRichImageSource(QQuickTextDocument *document, int imagePosition,
                                             const QString &dataUrl) const;
    Q_INVOKABLE bool toggleRich(QQuickTextDocument *document, int start, int end, const QString &mark) const;
    Q_INVOKABLE bool toggleRichAtCursor(QQuickTextDocument *document, int position, const QString &mark) const;
    Q_INVOKABLE bool isRichMarkActive(QQuickTextDocument *document, int start, int end, const QString &mark) const;
    Q_INVOKABLE bool clearRichPendingMarks(QQuickTextDocument *document) const;
    Q_INVOKABLE bool applyRichPendingMarks(QQuickTextDocument *document, const QString &previousText,
                                           const QString &currentText, int cursorPosition) const;
    Q_INVOKABLE QString richPlainText(QQuickTextDocument *document) const;
    Q_INVOKABLE bool isRichDocumentModified(QQuickTextDocument *document) const;
    Q_INVOKABLE bool toggleRichBlock(QQuickTextDocument *document, int start, int end, const QString &blockType) const;
    Q_INVOKABLE int executeRichSlashCommand(QQuickTextDocument *document, int start, int end,
                                             const QString &commandId) const;
    Q_INVOKABLE bool changeRichListIndent(QQuickTextDocument *document, int position, bool outdent) const;
    Q_INVOKABLE bool toggleRichTaskItem(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool toggleRichTaskItemFromCursor(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE QVariantList richTaskCheckboxes(QQuickTextDocument *document) const;
    Q_INVOKABLE int insertRichDivider(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE bool isRichDivider(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool canMoveRichDivider(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int moveRichDivider(QQuickTextDocument *document, int position, bool upward) const;
    Q_INVOKABLE int moveRichDividerTo(QQuickTextDocument *document, int position, int targetPosition,
                                      bool afterTarget) const;
    Q_INVOKABLE int insertRichParagraphBelowDivider(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE int insertRichTable(QQuickTextDocument *document, int start, int end) const;
    Q_INVOKABLE bool isRichTableCell(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool canApplyRichTableAction(QQuickTextDocument *document, int position,
                                             const QString &action, int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool applyRichTableAction(QQuickTextDocument *document, int position, const QString &action,
                                          int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool canMergeOrSplitRichTable(QQuickTextDocument *document, int cursorPosition,
                                              int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool mergeOrSplitRichTable(QQuickTextDocument *document, int cursorPosition,
                                           int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool canSetRichTableBackgroundOnSelection(QQuickTextDocument *document,
                                                          int selectionStart, int selectionEnd) const;
    Q_INVOKABLE QVariantMap richTableSelectionRange(QQuickTextDocument *document, int position,
                                                    const QString &scope) const;
    Q_INVOKABLE QString richTableSelectionScope(QQuickTextDocument *document, int cursorPosition,
                                                int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool clearRichTableFormattingOnSelection(QQuickTextDocument *document,
                                                         int selectionStart, int selectionEnd) const;
    Q_INVOKABLE bool setRichTableCellBackground(QQuickTextDocument *document, int position,
                                                const QString &color, const QString &scope,
                                                int selectionStart, int selectionEnd) const;
    Q_INVOKABLE QVariantMap richTableGeometry(QQuickTextDocument *document, int position) const;
    Q_INVOKABLE bool setRichTableCellText(QQuickTextDocument *document, int position,
                                          const QString &value) const;
    Q_INVOKABLE bool applyRichTableValidationHighlights(QQuickTextDocument *document, int position,
                                                        const QVariantList &validations) const;
    Q_INVOKABLE bool setRichColor(QQuickTextDocument *document, int start, int end,
                                  const QString &color, bool background) const;
    Q_INVOKABLE bool setRichLink(QQuickTextDocument *document, int start, int end, const QString &url) const;
    Q_INVOKABLE QString richLinkUrl(QQuickTextDocument *document, int start, int end) const;
    static bool replaceDocumentText(QTextDocument *document, int start, int end, const QString &replacement);
};
