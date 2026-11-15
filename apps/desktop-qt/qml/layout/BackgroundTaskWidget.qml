pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: taskWidgetRoot
    property var tasks: []

    signal taskCancelled(string taskId)
    signal taskDismissed(string taskId)

    visible: tasks && tasks.length > 0
    anchors.right: parent.right
    anchors.bottom: parent.bottom
    anchors.rightMargin: 16
    anchors.bottomMargin: 56
    implicitWidth: 280
    implicitHeight: taskColumn.implicitHeight

    ColumnLayout {
        id: taskColumn
        anchors.fill: parent
        spacing: 8

        Repeater {
            model: taskWidgetRoot.tasks

            delegate: Rectangle {
                id: taskCard
                required property var modelData

                Theme { id: cardTheme }

                Layout.fillWidth: true
                Layout.preferredHeight: 70
                radius: 12
                color: cardTheme.bgDarkCard
                border.color: cardTheme.borderBrand
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        // Status Icon
                        AppIcon {
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                            name: taskCard.modelData.status === "completed" ? "check" :
                                  (taskCard.modelData.status === "error" ? "alert" :
                                  (taskCard.modelData.status === "cancelled" ? "close" : "loader"))
                            color: taskCard.modelData.status === "completed" ? cardTheme.success :
                                   (taskCard.modelData.status === "error" ? cardTheme.error :
                                   (taskCard.modelData.status === "cancelled" ? cardTheme.textMuted : cardTheme.brand400))

                            RotationAnimation on rotation {
                                running: taskCard.modelData.status === "running"
                                loops: Animation.Infinite
                                from: 0
                                to: 360
                                duration: 1000
                            }
                        }

                        // Title & Subtitle
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 1

                            Text {
                                text: taskCard.modelData.title || qsTr("Tarefa em segundo plano")
                                color: cardTheme.textDark
                                font.pixelSize: 12
                                font.bold: true
                                font.family: cardTheme.fontFamily
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }

                            Text {
                                text: taskCard.modelData.status === "error" ? (taskCard.modelData.errorMessage || qsTr("Falha na operação")) :
                                      (taskCard.modelData.status === "completed" ? qsTr("Concluído") :
                                      (taskCard.modelData.status === "cancelled" ? qsTr("Cancelado") :
                                      qsTr("%1% concluído").arg(Math.round(taskCard.modelData.progress || 0))))
                                color: taskCard.modelData.status === "error" ? cardTheme.error :
                                       (taskCard.modelData.status === "completed" ? cardTheme.success : cardTheme.textSubtext)
                                font.pixelSize: 10
                                font.family: cardTheme.fontFamily
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }

                        // Cancel / Close Button
                        Rectangle {
                            Layout.preferredWidth: 20
                            Layout.preferredHeight: 20
                            radius: 4
                            color: closeTaskMouse.containsMouse ? cardTheme.bgHover : "transparent"

                            AppIcon {
                                anchors.centerIn: parent
                                width: 12
                                height: 12
                                name: "close"
                                color: cardTheme.textSubtext
                            }

                            MouseArea {
                                id: closeTaskMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    if (taskCard.modelData.status === "running") {
                                        taskWidgetRoot.taskCancelled(taskCard.modelData.id)
                                    } else {
                                        taskWidgetRoot.taskDismissed(taskCard.modelData.id)
                                    }
                                }
                            }
                        }
                    }

                    // Progress Bar
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 4
                        radius: 2
                        color: "#20ffffff"
                        visible: taskCard.modelData.status === "running" || taskCard.modelData.status === "completed"

                        Rectangle {
                            anchors.left: parent.left
                            anchors.top: parent.top
                            anchors.bottom: parent.bottom
                            width: Math.max(0, Math.min(parent.width, parent.width * ((taskCard.modelData.progress || 0) / 100)))
                            radius: 2
                            color: taskCard.modelData.status === "completed" ? cardTheme.success : cardTheme.brand500

                            Behavior on width {
                                NumberAnimation { duration: 250; easing.type: Easing.OutQuad }
                            }
                        }
                    }
                }
            }
        }
    }
}
