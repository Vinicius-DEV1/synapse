#include "notes_rich_task_checkbox.h"

QSizeF NotesRichTaskCheckbox::intrinsicSize(QTextDocument *, int, const QTextFormat &) {
    return QSizeF(22.0, 20.0);
}

void NotesRichTaskCheckbox::drawObject(QPainter *, const QRectF &, QTextDocument *, int, const QTextFormat &) {
    // A focusable QML checkbox overlays this inline layout marker.
}
