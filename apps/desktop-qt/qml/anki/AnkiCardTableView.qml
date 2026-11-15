import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Item {
    id: tableViewRoot
    Layout.fillWidth: true
    Layout.fillHeight: true

    property var cards: []
    property var selectedIds: ({})
    property string sortField: "front"
    property bool sortAscending: true

    signal cardEditRequested(var card)
    signal cardDeleteRequested(string cardId)
    signal toggleCardSelected(string cardId)

    readonly property var sortedCards: {
        var list = (cards || []).slice()
        var field = sortField
        var asc = sortAscending ? 1 : -1
        list.sort(function(a, b) {
            var valA = String(a[field] || "").toLowerCase()
            var valB = String(b[field] || "").toLowerCase()
            if (field === "reps") {
                valA = Number(a.reps || 0)
                valB = Number(b.reps || 0)
                return (valA - valB) * asc
            }
            if (valA < valB) return -1 * asc
            if (valA > valB) return 1 * asc
            return 0
        })
        return list
    }

    function toggleSort(field) {
        if (sortField === field) {
            sortAscending = !sortAscending
        } else {
            sortField = field
            sortAscending = true
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Table Header
        Rectangle {
            Layout.fillWidth: true
            height: 36
            color: "#1a1924"
            border.color: "#27272a"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                spacing: 8

                Item { width: 32 }

                Text {
                    text: qsTr("Frente") + (tableViewRoot.sortField === "front" ? (tableViewRoot.sortAscending ? " ▲" : " ▼") : "")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                    Layout.fillWidth: true
                    Layout.preferredWidth: 200
                    MouseArea { anchors.fill: parent; onClicked: tableViewRoot.toggleSort("front") }
                }

                Text {
                    text: qsTr("Verso") + (tableViewRoot.sortField === "back" ? (tableViewRoot.sortAscending ? " ▲" : " ▼") : "")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                    Layout.fillWidth: true
                    Layout.preferredWidth: 200
                    MouseArea { anchors.fill: parent; onClicked: tableViewRoot.toggleSort("back") }
                }

                Text {
                    text: qsTr("Tipo") + (tableViewRoot.sortField === "card_type" ? (tableViewRoot.sortAscending ? " ▲" : " ▼") : "")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                    Layout.preferredWidth: 80
                    MouseArea { anchors.fill: parent; onClicked: tableViewRoot.toggleSort("card_type") }
                }

                Text {
                    text: qsTr("Reps") + (tableViewRoot.sortField === "reps" ? (tableViewRoot.sortAscending ? " ▲" : " ▼") : "")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                    Layout.preferredWidth: 60
                    MouseArea { anchors.fill: parent; onClicked: tableViewRoot.toggleSort("reps") }
                }

                Text {
                    text: qsTr("Ações")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                    font.bold: true
                    Layout.preferredWidth: 70
                }
            }
        }

        // Table Rows
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ListView {
                width: parent.width
                model: tableViewRoot.sortedCards
                spacing: 1

                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    width: ListView.view.width
                    height: 44
                    color: isSelected ? "#2a2842" : (rowMouse.containsMouse ? "#201e30" : "#12111c")
                    border.color: "#18ffffff"
                    readonly property bool isSelected: tableViewRoot.selectedIds[modelData.id] === true

                    MouseArea {
                        id: rowMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        onDoubleClicked: tableViewRoot.cardEditRequested(modelData)
                    }

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 8

                        CheckBox {
                            checked: parent.parent.isSelected
                            onClicked: tableViewRoot.toggleCardSelected(modelData.id)
                        }

                        Text {
                            text: modelData.front || ""
                            color: "#ffffff"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                            Layout.preferredWidth: 200
                        }

                        Text {
                            text: modelData.back || ""
                            color: "#a1a1aa"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                            Layout.preferredWidth: 200
                        }

                        Text {
                            text: modelData.card_type || "reading"
                            color: "#818cf8"
                            font.pixelSize: 11
                            Layout.preferredWidth: 80
                        }

                        Text {
                            text: String(modelData.reps || 0)
                            color: "#71717a"
                            font.pixelSize: 11
                            Layout.preferredWidth: 60
                        }

                        RowLayout {
                            Layout.preferredWidth: 70
                            spacing: 4

                            ToolButton {
                                text: "✏️"
                                implicitWidth: 28
                                implicitHeight: 28
                                onClicked: tableViewRoot.cardEditRequested(modelData)
                            }

                            ToolButton {
                                text: "🗑️"
                                implicitWidth: 28
                                implicitHeight: 28
                                onClicked: tableViewRoot.cardDeleteRequested(modelData.id)
                            }
                        }
                    }
                }
            }
        }
    }
}
