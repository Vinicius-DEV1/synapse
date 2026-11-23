import QtQuick 2.15
import QtQuick.Layouts 1.15

ListView {
    id: transListView
    clip: true
    spacing: 8

    property var transactions: []
    property var accounts: []

    signal deleteRequested(string transactionId)
    signal editRequested(var transaction)
    signal confirmPendingRequested(var transaction)

    function getAccountName(accId) {
        if (!accId || accId.length === 0) return ""
        for (var i = 0; i < accounts.length; i++) {
            if (accounts[i].id === accId) return accounts[i].name
        }
        return ""
    }

    model: transactions

    delegate: Rectangle {
        id: transRowRect
        property var txData: modelData
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
                color: transRowRect.txData.type === "income" ? "#10b981"
                    : (transRowRect.txData.type === "expense" ? "#f43f5e"
                    : (transRowRect.txData.type === "transfer" ? "#8b5cf6" : "#f59e0b"))
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    text: transRowRect.txData.description || ""
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                    elide: Text.ElideRight
                }
                RowLayout {
                    spacing: 6
                    Text {
                        text: (transRowRect.txData.category || "Geral") + " • " + (transRowRect.txData.date || "")
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                    // Account badge
                    Rectangle {
                        readonly property string accName: transListView.getAccountName(transRowRect.txData.account_id)
                        visible: accName.length > 0
                        Layout.preferredHeight: 18
                        Layout.preferredWidth: badgeLabel.contentWidth + 10
                        radius: 4
                        color: "#15ffffff"
                        Text {
                            id: badgeLabel
                            anchors.centerIn: parent
                            text: parent.accName
                            color: "#c4b5fd"
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }
                    // Pending status badge
                    Rectangle {
                        readonly property bool isPending: transRowRect.txData.status === "pending" || transRowRect.txData.is_paid === 0
                        visible: isPending
                        Layout.preferredHeight: 18
                        Layout.preferredWidth: pendingLabel.contentWidth + 12
                        radius: 4
                        color: "#26f59e0b"
                        border.color: "#4df59e0b"
                        border.width: 1
                        Text {
                            id: pendingLabel
                            anchors.centerIn: parent
                            text: "⏱ Pendente"
                            color: "#fbbf24"
                            font.pixelSize: 10
                            font.bold: true
                        }
                    }
                }
            }

            Text {
                text: (transRowRect.txData.type === "income" ? "+ R$ "
                    : (transRowRect.txData.type === "expense" ? "- R$ " : "⇄ R$ "))
                    + Number(transRowRect.txData.amount || 0).toFixed(2)
                color: transRowRect.txData.type === "income" ? "#34d399"
                    : (transRowRect.txData.type === "expense" ? "#f43f5e" : "#a78bfa")
                font.pixelSize: 16
                font.bold: true
            }

            Row {
                spacing: 6
                // Confirm Pending button
                Rectangle {
                    readonly property bool isPending: transRowRect.txData.status === "pending" || transRowRect.txData.is_paid === 0
                    visible: isPending
                    width: 76
                    height: 28
                    radius: 6
                    color: confirmBtnMouse.containsMouse ? "#3310b981" : "#1a10b981"
                    border.color: "#4d10b981"
                    border.width: 1
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text { text: "✓"; color: "#34d399"; font.pixelSize: 11; font.bold: true }
                        Text { text: "Efetivar"; color: "#34d399"; font.pixelSize: 11; font.bold: true }
                    }
                    MouseArea {
                        id: confirmBtnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: transListView.confirmPendingRequested(transRowRect.txData)
                    }
                }
                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: editTransMouse.containsMouse ? "#1a8b5cf6" : "transparent"
                    Text { anchors.centerIn: parent; text: "✎"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: editTransMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: transListView.editRequested(transRowRect.txData)
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
                        onClicked: transListView.deleteRequested(transRowRect.txData.id)
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
        visible: !transListView.transactions || transListView.transactions.length === 0
        text: "Nenhuma transação registrada no banco."
        color: "#64748b"
        font.pixelSize: 15
    }
}
