#pragma once

#include <QtCore/QString>
#include <QtCore/QVector>
#include <QtGui/QTextBlock>

namespace NotesRichSerialization {

bool supportedBlock(const QTextBlock &block);
bool appendBlockText(QString &result, const QTextBlock &block);
bool appendCodeLine(QString &result, const QTextBlock &block);
bool appendListRun(const QVector<QTextBlock> &blocks, int &index, QString &result);

}
