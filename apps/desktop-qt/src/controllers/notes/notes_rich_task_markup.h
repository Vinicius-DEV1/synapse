#pragma once

#include <QtCore/QVector>
#include <QtCore/QString>

namespace NotesRichTaskMarkup {
struct ListItemState {
    bool isTask = false;
    bool checked = false;
    int depth = 0;
    int paragraphBlocks = 0;
    bool hasNestedList = false;
    int paragraphsBeforeNestedList = 0;
};

bool normalizeSource(const QString &source, QString &normalized, QVector<ListItemState> &items);
}
