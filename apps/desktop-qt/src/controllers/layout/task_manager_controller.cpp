#include "../../synapse_controller.h"

// TaskManager controller implementation for tracking background operations
// such as backup, cloud sync, export, and uploads.

QVariantList SynapseDataController::getActiveTasks() const {
    return m_activeTasks;
}

QString SynapseDataController::startTask(const QString &title, const QString &type) {
    const QString taskId = QUuid::createUuid().toString(QUuid::WithoutBraces);
    QVariantMap task;
    task["id"] = taskId;
    task["title"] = title;
    task["type"] = type;
    task["status"] = "running";
    task["progress"] = 0;
    task["errorMessage"] = "";
    task["startedAt"] = currentTimestamp();

    m_activeTasks.append(task);
    emit tasksChanged();
    return taskId;
}

void SynapseDataController::updateTaskProgress(const QString &taskId, int progress,
                                               const QString &status, const QString &errorMessage) {
    bool updated = false;
    for (int i = 0; i < m_activeTasks.size(); ++i) {
        QVariantMap task = m_activeTasks[i].toMap();
        if (task.value("id").toString() == taskId) {
            task["progress"] = qBound(0, progress, 100);
            if (!status.isEmpty()) {
                task["status"] = status;
            }
            if (!errorMessage.isEmpty()) {
                task["errorMessage"] = errorMessage;
            }
            m_activeTasks[i] = task;
            updated = true;
            break;
        }
    }
    if (updated) {
        emit tasksChanged();
    }
}

void SynapseDataController::cancelTask(const QString &taskId) {
    bool updated = false;
    for (int i = 0; i < m_activeTasks.size(); ++i) {
        QVariantMap task = m_activeTasks[i].toMap();
        if (task.value("id").toString() == taskId) {
            task["status"] = "cancelled";
            m_activeTasks[i] = task;
            updated = true;
            break;
        }
    }
    if (updated) {
        emit tasksChanged();
        emit taskCancelled(taskId);
    }
}

void SynapseDataController::removeTask(const QString &taskId) {
    for (int i = 0; i < m_activeTasks.size(); ++i) {
        QVariantMap task = m_activeTasks[i].toMap();
        if (task.value("id").toString() == taskId) {
            m_activeTasks.removeAt(i);
            emit tasksChanged();
            return;
        }
    }
}
