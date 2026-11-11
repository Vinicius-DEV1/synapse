#include "notes_rich_task_markup.h"
#include "notes_rich_markup.h"

#include <QtCore/QXmlStreamReader>
#include <QtCore/QXmlStreamWriter>
#include <QtCore/QStringList>

namespace NotesRichTaskMarkup {
namespace {
struct TaskItemFrame {
    bool isTask = false;
    bool checked = false;
    bool hasLabel = false;
    bool hasInput = false;
    bool hasSpan = false;
    bool hasDiv = false;
    int itemIndex = -1;
    int paragraphBlocks = 0;
    bool hasNestedList = false;
    int paragraphsBeforeNestedList = 0;
};

bool hasOnlyAttribute(const QXmlStreamAttributes &attributes, const QString &name,
                      const QString &value = QString()) {
    if (attributes.size() != 1 || !attributes.hasAttribute(name)) return false;
    return value.isNull() || attributes.value(name) == value;
}

bool checkedValue(const QXmlStreamAttributes &attributes, bool &checked) {
    if (!attributes.hasAttribute("data-checked") || attributes.size() != 2 ||
        attributes.value("data-type") != "taskItem") return false;
    const QString value = attributes.value("data-checked").toString();
    if (value != "true" && value != "false") return false;
    checked = value == "true";
    return true;
}

bool inputMatches(const QXmlStreamAttributes &attributes, bool expectedChecked) {
    if (!attributes.hasAttribute("type") || attributes.value("type") != "checkbox" ||
        attributes.size() < 1 || attributes.size() > 2) return false;
    if (attributes.size() == 1) return !expectedChecked;
    return expectedChecked && attributes.hasAttribute("checked") &&
        (attributes.value("checked").isEmpty() || attributes.value("checked") == "checked");
}
}

bool normalizeSource(const QString &source, QString &normalized, QVector<ListItemState> &items) {
    items.clear();
    if (source.isEmpty()) {
        normalized.clear();
        return true;
    }

    const QString xmlSource = QStringLiteral("<root>") + NotesRichMarkup::normalizeVoidTags(source) + QStringLiteral("</root>");
    QXmlStreamReader xml(xmlSource);
    QString transformed;
    QXmlStreamWriter writer(&transformed);
    writer.writeStartElement(QStringLiteral("root"));
    QStringList stack;
    QVector<bool> taskLists;
    QVector<bool> emitted;
    QVector<TaskItemFrame> taskFrames;
    bool foundTaskMarkup = false;

    while (!xml.atEnd()) {
        xml.readNext();
        if (xml.isStartElement()) {
            const QString name = xml.name().toString();
            const QXmlStreamAttributes attributes = xml.attributes();
            bool emitElement = true;
            bool isTaskList = false;
            bool isTaskItem = false;
            const bool wrapperRoot = stack.isEmpty() && name == "root";
            if (name == "ul" && attributes.hasAttribute("data-type")) {
                if (!hasOnlyAttribute(attributes, "data-type", QStringLiteral("taskList"))) return false;
                isTaskList = true;
                foundTaskMarkup = true;
                emitElement = false;
            }
            if (name == "li") {
                const bool parentIsTaskList = !taskLists.isEmpty() && taskLists.last();
                bool checked = false;
                if (parentIsTaskList) {
                    if (!checkedValue(attributes, checked)) return false;
                    isTaskItem = true;
                    foundTaskMarkup = true;
                    emitElement = false;
                } else if (!attributes.isEmpty()) {
                    return false;
                }
                const int depth = taskLists.size();
                items.append({isTaskItem, checked, depth, 0, false, 0});
                TaskItemFrame frame;
                frame.isTask = isTaskItem;
                frame.checked = checked;
                frame.itemIndex = items.size() - 1;
                taskFrames.append(frame);
            }
            if (name == "p" && !taskFrames.isEmpty() && !stack.isEmpty() &&
                ((taskFrames.last().isTask && stack.last() == "div") ||
                 (!taskFrames.last().isTask && stack.last() == "li" && !stack.contains("p")))) {
                ++taskFrames.last().paragraphBlocks;
                if (!taskFrames.last().hasNestedList) ++taskFrames.last().paragraphsBeforeNestedList;
            }
            if ((name == "ul" || name == "ol") && !taskFrames.isEmpty() && !stack.isEmpty() &&
                ((taskFrames.last().isTask && stack.last() == "div") ||
                 (!taskFrames.last().isTask && stack.last() == "li"))) {
                taskFrames.last().hasNestedList = true;
            }
            if (name == "label") {
                if (stack.isEmpty() || stack.last() != "li" || taskFrames.isEmpty() ||
                    !taskFrames.last().isTask || taskFrames.last().hasLabel || !attributes.isEmpty()) return false;
                taskFrames.last().hasLabel = true;
                foundTaskMarkup = true;
                emitElement = false;
            } else if (name == "input") {
                if (stack.isEmpty() || stack.last() != "label" || taskFrames.isEmpty() ||
                    !taskFrames.last().isTask || taskFrames.last().hasInput ||
                    !inputMatches(attributes, taskFrames.last().checked)) return false;
                taskFrames.last().hasInput = true;
                foundTaskMarkup = true;
                emitElement = false;
            } else if (name == "span" && !stack.isEmpty() && stack.last() == "label") {
                if (stack.isEmpty() || stack.last() != "label" || taskFrames.isEmpty() ||
                    !taskFrames.last().isTask || !taskFrames.last().hasInput ||
                    taskFrames.last().hasSpan || !attributes.isEmpty()) return false;
                taskFrames.last().hasSpan = true;
                foundTaskMarkup = true;
                emitElement = false;
            } else if (name == "div") {
                if (stack.isEmpty() || stack.last() != "li" || taskFrames.isEmpty() ||
                    !taskFrames.last().isTask || !taskFrames.last().hasLabel ||
                    !taskFrames.last().hasInput || !taskFrames.last().hasSpan ||
                    taskFrames.last().hasDiv || !attributes.isEmpty()) return false;
                taskFrames.last().hasDiv = true;
                foundTaskMarkup = true;
                emitElement = false;
            }

            if (wrapperRoot) {
                emitElement = false;
            } else if (emitElement) {
                writer.writeStartElement(name);
                for (const auto &attribute : attributes)
                    writer.writeAttribute(attribute.name().toString(), attribute.value().toString());
            } else if (name == "ul" && isTaskList) {
                writer.writeStartElement(name);
            } else if (name == "li") {
                writer.writeStartElement(name);
            }
            if (name == "ul" || name == "ol") taskLists.append(isTaskList);
            stack.append(name);
            emitted.append(emitElement || (name == "ul" && isTaskList) || (name == "li" && isTaskItem));
        } else if (xml.isEndElement()) {
            if (stack.isEmpty() || emitted.isEmpty()) return false;
            const QString name = xml.name().toString();
            if (name != stack.last()) return false;
            const bool wrapperRoot = stack.size() == 1 && name == "root";
            if (name == "label") {
                if (taskFrames.isEmpty() || !taskFrames.last().hasInput || !taskFrames.last().hasSpan) return false;
            } else if (name == "div") {
                if (taskFrames.isEmpty() || !taskFrames.last().hasDiv) return false;
            } else if (name == "li") {
                if (taskFrames.isEmpty()) return false;
                if (taskFrames.last().isTask && (!taskFrames.last().hasLabel || !taskFrames.last().hasInput ||
                    !taskFrames.last().hasSpan || !taskFrames.last().hasDiv)) return false;
                if (taskFrames.last().itemIndex < 0 || taskFrames.last().itemIndex >= items.size()) return false;
                items[taskFrames.last().itemIndex].paragraphBlocks = taskFrames.last().paragraphBlocks;
                items[taskFrames.last().itemIndex].hasNestedList = taskFrames.last().hasNestedList;
                items[taskFrames.last().itemIndex].paragraphsBeforeNestedList =
                    taskFrames.last().paragraphsBeforeNestedList;
                taskFrames.removeLast();
            }
            if (emitted.last() && !wrapperRoot) writer.writeEndElement();
            if (name == "ul" || name == "ol") {
                if (taskLists.isEmpty()) return false;
                taskLists.removeLast();
            }
            stack.removeLast();
            emitted.removeLast();
        } else if (xml.isCharacters()) {
            if (stack.isEmpty()) {
                if (!xml.isWhitespace()) return false;
                continue;
            }
            if (stack.size() == 1 && !xml.isWhitespace()) return false;
            if (!stack.isEmpty() && (stack.last() == "label" || stack.last() == "input") &&
                !xml.isWhitespace()) return false;
            if (!taskFrames.isEmpty() && taskFrames.last().isTask && stack.last() == "span" &&
                stack.contains("label") && !xml.isWhitespace()) return false;
            if (stack.last() != "root" && stack.last() != "input") writer.writeCharacters(xml.text().toString());
        } else if (xml.isComment() || xml.isDTD() || xml.isProcessingInstruction()) {
            return false;
        }
    }
    if (xml.hasError() || !stack.isEmpty() || !taskLists.isEmpty() || !taskFrames.isEmpty()) return false;
    writer.writeEndElement();
    if (!foundTaskMarkup) {
        normalized = source;
    } else {
        normalized = transformed.mid(6, transformed.size() - 13);
    }
    return true;
}
}
