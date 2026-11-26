#include "notes_text_operations.h"

#include "notes_rich_format.h"
#include "notes_rich_markup.h"
#include "notes_rich_page_reference_object.h"

#include <QtGui/QTextBlock>
#include <QtGui/QTextCursor>
#include <QtGui/QTextDocument>
#include <QtGui/QTextFragment>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>
#include <QtCore/QMimeData>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QXmlStreamReader>
#include <QtQuick/QQuickTextDocument>
#include <QtCore/QVector>
#include <limits>

namespace {

QTextCharFormat formatAtCharacter(const QTextDocument &document, int position) {
    if (position < 0 || position >= document.characterCount() - 1) return {};
    const QTextBlock block = document.findBlock(position);
    for (auto it = block.begin(); !it.atEnd(); ++it) {
        const QTextFragment fragment = it.fragment();
        if (fragment.isValid() && position >= fragment.position() &&
            position < fragment.position() + fragment.length()) {
            return fragment.charFormat();
        }
    }
    return {};
}

QVariantMap referenceRangeAtCharacter(const QTextDocument &document, int position) {
    const QTextCharFormat format = formatAtCharacter(document, position);
    if (format.objectType() == NotesRichFormat::PageReferenceObjectType) {
        if (document.characterAt(position) != QChar::ObjectReplacementCharacter) return {};
        const QString pageId = format.stringProperty(NotesRichFormat::PageReferenceId);
        const QString title = NotesRichPageReferences::resolvedTitle(document, format);
        const QString href = NotesRichMarkup::pageReferenceHref(pageId, title);
        if (href.isEmpty()) return {};
        return {{"start", position}, {"end", position + 1}, {"href", href},
                {"pageId", pageId}, {"title", title},
                {"deleted", NotesRichPageReferences::resolvedDeleted(document, format)}};
    }
    if (!format.isAnchor()) return {};

    const QString href = format.anchorHref();
    QString pageId;
    QString title;
    if (!NotesRichMarkup::pageReferenceFromHref(href, &pageId, &title)) return {};

    const QString plainText = document.toPlainText();
    const QVector<QString> expectedLabels = {
        QStringLiteral("↗ ") + title,
        QStringLiteral("⚠ ") + title + QStringLiteral(" (Deleted)")
    };
    for (const QString &expectedLabel : expectedLabels) {
        const int minimumStart = qMax(0, position - expectedLabel.size() + 1);
        for (int start = position; start >= minimumStart; --start) {
            const int end = start + expectedLabel.size();
            if (position >= end || end > document.characterCount() - 1 ||
                plainText.mid(start, expectedLabel.size()) != expectedLabel) continue;
            bool validAnchor = true;
            for (int index = start; index < end; ++index) {
                const QTextCharFormat labelFormat = formatAtCharacter(document, index);
                if (!labelFormat.isAnchor() || labelFormat.anchorHref() != href) {
                    validAnchor = false;
                    break;
                }
            }
            if (validAnchor) {
                return {{"start", start}, {"end", end}, {"href", href},
                        {"pageId", pageId}, {"title", title}};
            }
        }
    }
    return {};
}

bool referenceFromClipboardHtml(const QString &clipboardHtml, QString &pageId, QString &title) {
    if (clipboardHtml.size() > 16384) return false;
    static const QRegularExpression referenceSpan(
        QStringLiteral("<span\\b([^>]*?)(?:>\\s*</span\\s*>|/\\s*>)"),
        QRegularExpression::CaseInsensitiveOption);
    const auto match = referenceSpan.match(clipboardHtml);
    if (!match.hasMatch()) return false;
    QRegularExpressionMatchIterator matches = referenceSpan.globalMatch(clipboardHtml);
    if (!matches.hasNext()) return false;
    matches.next();
    if (matches.hasNext()) return false;

    QString surroundingMarkup = clipboardHtml;
    surroundingMarkup.remove(match.capturedStart(), match.capturedLength());
    static const QRegularExpression clipboardWrappers(
        QStringLiteral("</?(?:html|body|p)\\b[^>]*>|<head\\b[^>]*>[\\s\\S]*?</head\\s*>|"
                       "<meta\\b[^>]*?/?>|<div\\b(?=[^>]*\\bdata-pm-slice\\s*=)[^>]*>|"
                       "</div\\s*>|<!--\\s*(?:StartFragment|EndFragment)\\s*-->"),
        QRegularExpression::CaseInsensitiveOption);
    surroundingMarkup.remove(clipboardWrappers);
    if (!surroundingMarkup.trimmed().isEmpty()) return false;

    QXmlStreamReader xml(QStringLiteral("<span%1></span>").arg(match.captured(1)));
    if (!xml.readNextStartElement() || !NotesRichMarkup::isPageReferenceAttributes(xml.attributes())) return false;
    pageId = xml.attributes().value(QStringLiteral("data-page-id")).toString();
    title = xml.attributes().value(QStringLiteral("title")).toString();
    return true;
}

}

bool NotesTextOperations::prepareRichPageReferences(QQuickTextDocument *document,
                                                       const QVariantList &pages) const {
    return document && document->textDocument() &&
        NotesRichPageReferences::prepare(*document->textDocument(), pages);
}

bool NotesTextOperations::refreshRichPageReferences(QQuickTextDocument *document,
                                                       const QVariantList &pages) const {
    return document && document->textDocument() &&
        NotesRichPageReferences::refreshPageSnapshot(*document->textDocument(), pages);
}

QVariantMap NotesTextOperations::richPageReferenceAt(QQuickTextDocument *document, int start, int end,
                                                       bool preferPreviousCharacter) const {
    if (!document || !document->textDocument()) return {};
    const QTextDocument &textDocument = *document->textDocument();
    const int lastPosition = textDocument.characterCount() - 1;
    if (start < 0 || end < start || end > lastPosition) return {};

    if (start < end) {
        QVariantMap reference = referenceRangeAtCharacter(textDocument, start);
        return reference.value(QStringLiteral("start")).toInt() == start &&
                reference.value(QStringLiteral("end")).toInt() == end
            ? reference : QVariantMap{};
    }

    const int characterPosition = preferPreviousCharacter ? start - 1 : start;
    return referenceRangeAtCharacter(textDocument, characterPosition);
}

QVariantMap NotesTextOperations::richPageReferenceRangeForHref(QQuickTextDocument *document,
                                                                 const QString &href,
                                                                 int hintPosition) const {
    if (!document || !document->textDocument()) return {};
    QString pageId;
    if (!NotesRichMarkup::pageReferenceFromHref(href, &pageId)) return {};

    const QTextDocument &textDocument = *document->textDocument();
    QVariantMap bestRange;
    int bestDistance = std::numeric_limits<int>::max();
    for (int position = 0; position < textDocument.characterCount() - 1; ++position) {
        const QTextCharFormat format = formatAtCharacter(textDocument, position);
        if (format.objectType() == NotesRichFormat::PageReferenceObjectType) {
            const QVariantMap candidate = referenceRangeAtCharacter(textDocument, position);
            if (candidate.value("href").toString() != href) continue;
        } else if (!format.isAnchor() || format.anchorHref() != href) {
            continue;
        }
        const QVariantMap candidate = referenceRangeAtCharacter(textDocument, position);
        const int candidateStart = candidate.value(QStringLiteral("start")).toInt();
        const int distance = hintPosition < 0 ? candidateStart : qAbs(candidateStart - hintPosition);
        if (distance < bestDistance) {
            bestRange = candidate;
            bestDistance = distance;
        }
    }
    return bestRange;
}

bool NotesTextOperations::removeRichPageReference(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument() || start < 0 || end <= start) return false;
    const QVariantMap reference = richPageReferenceAt(document, start, end, false);
    if (reference.isEmpty()) return false;

    QTextCursor cursor(document->textDocument());
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.removeSelectedText();
    cursor.endEditBlock();
    return true;
}

int NotesTextOperations::replaceRichPageReferenceText(QQuickTextDocument *document, int start, int end,
                                                       const QString &replacement) const {
    if (!document || !document->textDocument() || start < 0 || end != start + 1) return -1;
    const QVariantMap reference = richPageReferenceAt(document, start, end, false);
    if (reference.value("start").toInt() != start || reference.value("end").toInt() != end) return -1;

    const QTextDocument &textDocument = *document->textDocument();
    const QTextCharFormat before = formatAtCharacter(textDocument, start - 1);
    const QTextCharFormat after = formatAtCharacter(textDocument, end);
    QTextCharFormat insertionFormat;
    const auto isOrdinaryTextFormat = [](const QTextCharFormat &format) {
        return format.objectType() == QTextFormat::NoObject && !format.isImageFormat() && !format.isAnchor();
    };
    if (isOrdinaryTextFormat(before)) insertionFormat = before;
    else if (isOrdinaryTextFormat(after)) insertionFormat = after;

    QTextCursor cursor(document->textDocument());
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.removeSelectedText();
    cursor.insertText(replacement, insertionFormat);
    cursor.endEditBlock();
    return cursor.position();
}

bool NotesTextOperations::copyRichPageReference(QQuickTextDocument *document, int start, int end) const {
    if (!document || !document->textDocument() || end != start + 1) return false;
    const QVariantMap reference = richPageReferenceAt(document, start, end, false);
    if (reference.value("start").toInt() != start || reference.value("end").toInt() != end) return false;
    const QString pageId = reference.value("pageId").toString();
    const QString title = reference.value("title").toString();
    if (NotesRichMarkup::pageReferenceHref(pageId, title).isEmpty()) return false;
    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) return false;
    auto *mimeData = new QMimeData;
    mimeData->setText(title);
    mimeData->setHtml(QStringLiteral("<span data-page-id=\"%1\" title=\"%2\"></span>")
                          .arg(pageId.toHtmlEscaped(), title.toHtmlEscaped()));
    QJsonObject referenceData;
    referenceData.insert(QStringLiteral("pageId"), pageId);
    referenceData.insert(QStringLiteral("title"), title);
    mimeData->setData(QStringLiteral("application/x-synapse-page-reference"),
                      QJsonDocument(referenceData).toJson(QJsonDocument::Compact));
    clipboard->setMimeData(mimeData, QClipboard::Clipboard);
    return clipboard->mimeData(QClipboard::Clipboard) &&
        clipboard->mimeData(QClipboard::Clipboard)->hasFormat(
            QStringLiteral("application/x-synapse-page-reference"));
}

int NotesTextOperations::pasteRichPageReference(QQuickTextDocument *document, int start, int end,
                                                 const QVariantList &pages) const {
    if (!document || !document->textDocument() || start < 0 || end < start ||
        end > document->textDocument()->characterCount() - 1) return -1;
    if (start < end) {
        const QVariantMap selected = richPageReferenceAt(document, start, end, false);
        if (selected.value("start").toInt() != start || selected.value("end").toInt() != end) return -1;
    }

    QClipboard *clipboard = QGuiApplication::clipboard();
    const QMimeData *mimeData = clipboard ? clipboard->mimeData(QClipboard::Clipboard) : nullptr;
    if (!mimeData) return -1;

    QString pageId;
    QString title;
    const QString customMime = QStringLiteral("application/x-synapse-page-reference");
    if (mimeData->hasFormat(customMime)) {
        QJsonParseError parseError;
        const QJsonDocument payload = QJsonDocument::fromJson(mimeData->data(customMime), &parseError);
        if (parseError.error != QJsonParseError::NoError || !payload.isObject()) return -1;
        const QJsonObject object = payload.object();
        if (!object.value(QStringLiteral("pageId")).isString() ||
            !object.value(QStringLiteral("title")).isString()) return -1;
        pageId = object.value(QStringLiteral("pageId")).toString();
        title = object.value(QStringLiteral("title")).toString();
    } else if (mimeData->hasHtml() && referenceFromClipboardHtml(mimeData->html(), pageId, title)) {
        // React's editor wraps a copied inline atom in ProseMirror slice markup.
    } else {
        return -1;
    }

    if (title.isEmpty()) title = QStringLiteral("Página");
    if (NotesRichMarkup::pageReferenceHref(pageId, title).isEmpty()) return -1;
    bool targetIsActive = false;
    for (const QVariant &entry : pages) {
        const QVariantMap page = entry.toMap();
        const QString id = page.value(QStringLiteral("id")).toString();
        if (id != pageId) continue;
        const QVariant deletedAt = page.contains(QStringLiteral("deleted_at"))
            ? page.value(QStringLiteral("deleted_at")) : page.value(QStringLiteral("deletedAt"));
        targetIsActive = !deletedAt.isValid() || deletedAt.isNull() || deletedAt.toString().isEmpty();
        break;
    }

    QTextCursor cursor(document->textDocument());
    cursor.beginEditBlock();
    cursor.setPosition(start);
    cursor.setPosition(end, QTextCursor::KeepAnchor);
    cursor.removeSelectedText();
    const int insertedPosition = NotesRichPageReferences::insertAtCursor(
        cursor, pageId, title, !targetIsActive);
    cursor.endEditBlock();
    return insertedPosition;
}
