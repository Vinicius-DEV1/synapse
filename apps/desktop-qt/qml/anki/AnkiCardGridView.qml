import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Item {
    id: gridViewRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    property var cards: []
    property var selectedIds: ({})

    signal cardClicked(var card)
    signal cardDoubleClicked(var card)
    signal toggleCardSelected(string cardId)
    signal cardHovered(var card, real posX, real posY)
    signal cardUnhovered()

    ScrollView {
        anchors.fill: parent
        clip: true

        GridView {
            id: grid
            width: parent.width
            cellWidth: Math.floor(width / Math.max(1, Math.floor(width / 240)))
            cellHeight: 160
            model: gridViewRoot.cards

            delegate: Item {
                required property var modelData
                required property int index
                width: grid.cellWidth
                height: grid.cellHeight

                Rectangle {
                    anchors.fill: parent
                    anchors.margins: 6
                    radius: 10
                    color: isSelected ? "#2a2842" : (cardMouse.containsMouse ? "#201e30" : "#161524")
                    border.color: isSelected ? "#818cf8" : (cardMouse.containsMouse ? "#3b3852" : "#1fffffff")
                    border.width: isSelected ? 2 : 1
                    readonly property bool isSelected: gridViewRoot.selectedIds[modelData.id] === true

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 6

                        // Top Row: Selection Checkbox & Type Badge
                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            CheckBox {
                                checked: parent.parent.isSelected
                                onClicked: gridViewRoot.toggleCardSelected(modelData.id)
                            }

                            Rectangle {
                                height: 18
                                width: typeText.implicitWidth + 10
                                radius: 9
                                color: "#256366f1"
                                Text {
                                    id: typeText
                                    anchors.centerIn: parent
                                    text: modelData.card_type || "reading"
                                    color: "#a78bfa"
                                    font.pixelSize: 9
                                    font.bold: true
                                }
                            }

                            Item { Layout.fillWidth: true }

                            Text {
                                text: modelData.reps !== undefined ? ("#" + modelData.reps) : ""
                                color: "#71717a"
                                font.pixelSize: 10
                            }
                        }

                        // Front snippet
                        Text {
                            Layout.fillWidth: true
                            text: modelData.front || ""
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.bold: true
                            maximumLineCount: 2
                            elide: Text.ElideRight
                            wrapMode: Text.Wrap
                        }

                        // Back snippet
                        Text {
                            Layout.fillWidth: true
                            text: modelData.back || ""
                            color: "#a7a9be"
                            font.pixelSize: 11
                            maximumLineCount: 2
                            elide: Text.ElideRight
                            wrapMode: Text.Wrap
                        }

                        Item { Layout.fillHeight: true }
                    }

                    MouseArea {
                        id: cardMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: gridViewRoot.cardClicked(modelData)
                        onDoubleClicked: gridViewRoot.cardDoubleClicked(modelData)
                        onEntered: gridViewRoot.cardHovered(modelData, cardMouse.mouseX, cardMouse.mouseY)
                        onExited: gridViewRoot.cardUnhovered()
                    }
                }
            }
        }
    }
}
