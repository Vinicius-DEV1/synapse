#pragma once

#include <QtCore/QString>

class QQuickTextDocument;

namespace NotesRichSlashCommands {
int execute(QQuickTextDocument *document, int start, int end, const QString &commandId);
}
