#pragma once

#include <QtGui/QTextFormat>

namespace NotesRichFormat {
inline constexpr int HeadingBoldState = QTextFormat::UserProperty + 1;
inline constexpr int HeadingGeneratedBold = 1;
inline constexpr int HeadingExplicitBold = 2;
inline constexpr int TableHeaderBoldState = QTextFormat::UserProperty + 2;
inline constexpr int TableHeaderGeneratedBold = 1;
inline constexpr int TableHeaderExplicitBold = 2;
inline constexpr int TaskListState = QTextFormat::UserProperty + 3;
inline constexpr int TaskItemChecked = QTextFormat::UserProperty + 4;
inline constexpr int TaskCheckedVisual = QTextFormat::UserProperty + 5;
inline constexpr int TaskOriginalCharacterFormat = QTextFormat::UserProperty + 6;
inline constexpr int ListItemGroup = QTextFormat::UserProperty + 13;
inline constexpr int ListItemGroupDepth = QTextFormat::UserProperty + 14;
inline constexpr int QuoteColor = QTextFormat::UserProperty + 15;
inline constexpr int CodeBlockLanguage = QTextFormat::UserProperty + 16;
inline constexpr int CodeBlockGroup = QTextFormat::UserProperty + 17;
inline constexpr int SpoilerMark = QTextFormat::UserProperty + 7;
inline constexpr int SpoilerHidden = QTextFormat::UserProperty + 8;
inline constexpr int SpoilerOriginalForegroundPresent = QTextFormat::UserProperty + 9;
inline constexpr int SpoilerOriginalForeground = QTextFormat::UserProperty + 10;
inline constexpr int SpoilerOriginalBackgroundPresent = QTextFormat::UserProperty + 11;
inline constexpr int SpoilerOriginalBackground = QTextFormat::UserProperty + 12;
inline constexpr int PageReferenceId = QTextFormat::UserProperty + 18;
inline constexpr int ImageAlignment = QTextFormat::UserProperty + 19;
inline constexpr int ImageCaption = QTextFormat::UserProperty + 20;
inline constexpr int TaskCheckboxObjectType = QTextFormat::UserObject + 1;
inline constexpr int PageReferenceTitle = QTextFormat::UserProperty + 21;
inline constexpr int PageReferenceDeleted = QTextFormat::UserProperty + 22;
inline constexpr int PageReferenceObjectType = QTextFormat::UserObject + 2;
}
