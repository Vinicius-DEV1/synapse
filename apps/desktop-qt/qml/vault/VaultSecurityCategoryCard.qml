pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: categoryCardRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    radius: 16
    color: "#16161e"
    border.color: "#2e2e38"
    border.width: 1

    property string iconName: "alert"
    property color iconBgColor: "#2a151b"
    property color iconColor: "#ef4444"
    property string title: ""
    property int count: 0
    property string description: ""
    property string emptyMessage: "Nenhuma vulnerabilidade detectada!"
    property var items: []
    signal itemClicked(var item)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Rectangle {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                radius: 8
                color: categoryCardRoot.iconBgColor

                AppIcon {
                    anchors.centerIn: parent
                    name: categoryCardRoot.iconName
                    color: categoryCardRoot.iconColor
                    Layout.preferredWidth: 16
                    Layout.preferredHeight: 16
                }
            }

            Text {
                text: categoryCardRoot.title + " (" + categoryCardRoot.count + ")"
                color: "#fffffe"
                font.pixelSize: 14
                font.weight: Font.Bold
                Layout.fillWidth: true
            }
        }

        // Description
        Text {
            Layout.fillWidth: true
            text: categoryCardRoot.description
            color: "#a7a9be"
            font.pixelSize: 11
            wrapMode: Text.WordWrap
        }

        // Items list or Empty Message
        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            // Empty state
            Rectangle {
                anchors.fill: parent
                visible: !categoryCardRoot.items || categoryCardRoot.items.length === 0
                radius: 10
                color: "#132b21"
                border.color: "#10b981"
                border.width: 1

                Text {
                    anchors.centerIn: parent
                    text: categoryCardRoot.emptyMessage
                    color: "#6ee7b7"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                }
            }

            // Scrollable list
            ListView {
                anchors.fill: parent
                visible: categoryCardRoot.items && categoryCardRoot.items.length > 0
                clip: true
                spacing: 6
                model: categoryCardRoot.items

                delegate: Rectangle {
                    id: cardItemDelegate
                    required property var modelData
                    required property int index

                    width: ListView.view.width
                    height: 52
                    radius: 8
                    color: itemMouse.containsMouse ? "#232332" : "#0f0e17"
                    border.color: "#2a2a36"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 8
                        spacing: 8

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            RowLayout {
                                spacing: 6
                                Text {
                                    text: cardItemDelegate.modelData.label || "Sem título"
                                    color: "#fffffe"
                                    font.pixelSize: 12
                                    font.weight: Font.DemiBold
                                }
                                Rectangle {
                                    visible: cardItemDelegate.modelData.login_type === "google"
                                    Layout.preferredHeight: 16
                                    Layout.preferredWidth: 36
                                    radius: 4
                                    color: "#1e1438"
                                    Text {
                                        anchors.centerIn: parent
                                        text: "SSO"
                                        color: "#a78bfa"
                                        font.pixelSize: 9
                                        font.weight: Font.Bold
                                    }
                                }
                            }

                            Text {
                                text: cardItemDelegate.modelData.username || cardItemDelegate.modelData.email || ""
                                color: "#a7a9be"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }

                        AppIcon {
                            name: "edit"
                            color: "#6b7280"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                        }
                    }

                    MouseArea {
                        id: itemMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: categoryCardRoot.itemClicked(cardItemDelegate.modelData)
                    }
                }
            }
        }
    }
}
