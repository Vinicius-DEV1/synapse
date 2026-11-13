#pragma once

#include <QtCore/QVector>

class QTextTable;

namespace NotesRichTableMovement {
bool computeRowMove(const QTextTable &table, int originTop, int originBottom, bool moveUp,
                    QVector<int> &mapRow);
bool computeColumnMove(const QTextTable &table, int originLeft, int originRight, bool moveLeft,
                       QVector<int> &mapCol);
bool applyTablePermutation(QTextTable &table, const QVector<int> &mapRow,
                           const QVector<int> &mapCol);
}
