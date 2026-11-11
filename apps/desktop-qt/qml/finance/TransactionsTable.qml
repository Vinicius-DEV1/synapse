import QtQuick 2.15
import QtQuick.Layouts 1.15

ListView {
    id: transListView
    clip: true
    spacing: 8

    property var transactions: []
    signal deleteRequested(string transactionId)
    signal editRequested(var transaction)

    model: transactions

    delegate: Rectangle {
        width: transListView.width
        height: 60
        radius: 10
        color: "#1a1924"
        border.color: transItemMouse.containsMouse ? "#4d8b5cf6" : "#0fffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 16
            spacing: 16

            Rectangle {
                width: 6; height: 34; radius: 3
                color: modelData.type === "income" ? "#10b981" : (modelData.type === "expense" ? "#f43f5e" : "#f59e0b")
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    text: modelData.description
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                }
                Text {
                    text: (modelData.category || "Geral") + " • " + (modelData.date || "")
                    color: "#a7a9be"
                    font.pixelSize: 12
                }
            }

            Text {
                text: (modelData.type === "income" ? "+ R$ " : "- R$ ") + Number(modelData.amount || 0).toFixed(2)
                color: modelData.type === "income" ? "#34d399" : "#fffffe"
                font.pixelSize: 16
                font.bold: true
            }

            Row {
                spacing: 4
                Rectangle {
                    width: visible ? 28 : 0; height: 28; radius: 6
                    visible: modelData.type === "income" || modelData.type === "expense"
                    color: editTransMouse.containsMouse ? "#1a8b5cf6" : "transparent"
                    Text { anchors.centerIn: parent; text: "✎"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: editTransMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: transListView.editRequested(modelData)
                    }
                }
                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: delTransMouse.containsMouse ? "#33f43f5e" : "transparent"
                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                    MouseArea {
                        id: delTransMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: transListView.deleteRequested(modelData.id)
                    }
                }
            }
        }

        MouseArea {
            id: transItemMouse
            anchors.fill: parent
            z: -1
            hoverEnabled: true
        }
    }

    Text {
        anchors.centerIn: parent
        visible: transListView.transactions.length === 0
        text: "Nenhuma transação registrada no banco."
        color: "#64748b"
        font.pixelSize: 15
    }
}
