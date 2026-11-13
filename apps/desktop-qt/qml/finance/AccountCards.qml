import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: cardsRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 76

    property var accounts: []
    property string selectedAccountId: "all"
    property double totalBalance: 0.0

    signal selectAccountRequested(string accountId)
    signal manageAccountsRequested()

    ScrollView {
        id: accountsScroll
        anchors.fill: parent
        clip: true
        ScrollBar.horizontal.policy: ScrollBar.AsNeeded
        ScrollBar.vertical.policy: ScrollBar.AlwaysOff

        RowLayout {
            spacing: 12
            height: cardsRoot.height

            // "Todas as Contas" Card
            Rectangle {
                Layout.preferredWidth: 160
                Layout.preferredHeight: 68
                radius: 12
                color: cardsRoot.selectedAccountId === "all" ? "#206366f1" : "#161524"
                border.color: cardsRoot.selectedAccountId === "all" ? "#6366f1" : "#18ffffff"
                border.width: cardsRoot.selectedAccountId === "all" ? 1.5 : 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4

                    RowLayout {
                        spacing: 6
                        Text { text: "🏦"; font.pixelSize: 12 }
                        Text {
                            text: "Todas as Contas"
                            color: cardsRoot.selectedAccountId === "all" ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                        }
                    }

                    Text {
                        text: "R$ " + cardsRoot.totalBalance.toFixed(2)
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                    }
                }

                MouseArea {
                    id: allCardsMouse
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onClicked: cardsRoot.selectAccountRequested("all")
                }
            }

            // Individual Account Cards
            Repeater {
                model: cardsRoot.accounts

                delegate: Rectangle {
                    id: accCardRect
                    property var accData: modelData
                    Layout.preferredWidth: Math.max(160, accNameText.contentWidth + 40)
                    Layout.preferredHeight: 68
                    radius: 12
                    color: cardsRoot.selectedAccountId === accCardRect.accData.id ? "#206366f1" : "#161524"
                    border.color: cardsRoot.selectedAccountId === accCardRect.accData.id
                        ? (accCardRect.accData.color || "#6366f1")
                        : (accMouse.containsMouse ? "#28ffffff" : "#18ffffff")
                    border.width: cardsRoot.selectedAccountId === accCardRect.accData.id ? 1.5 : 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 4

                        RowLayout {
                            spacing: 6
                            Rectangle {
                                Layout.preferredWidth: 8
                                Layout.preferredHeight: 8
                                radius: 4
                                color: accCardRect.accData.color || "#10b981"
                            }
                            Text {
                                id: accNameText
                                text: accCardRect.accData.name || "Conta"
                                color: cardsRoot.selectedAccountId === accCardRect.accData.id ? "#fffffe" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                                elide: Text.ElideRight
                                Layout.maximumWidth: 160
                            }
                        }

                        Text {
                            text: "R$ " + Number(accCardRect.accData.current_balance || 0).toFixed(2)
                            color: Number(accCardRect.accData.current_balance || 0) < 0 ? "#f43f5e" : "#fffffe"
                            font.pixelSize: 15
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: accMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: cardsRoot.selectAccountRequested(accCardRect.accData.id)
                    }
                }
            }

            // "Gerenciar Contas" Button Card
            Rectangle {
                Layout.preferredWidth: 130
                Layout.preferredHeight: 68
                radius: 12
                color: manageMouse.containsMouse ? "#1c1a2e" : "#12111c"
                border.color: "#18ffffff"
                border.width: 1

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 8
                    Text { text: "💳"; font.pixelSize: 14 }
                    Text {
                        text: "Gerenciar"
                        color: "#c4b5fd"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                MouseArea {
                    id: manageMouse
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onClicked: cardsRoot.manageAccountsRequested()
                }
            }
        }
    }
}

