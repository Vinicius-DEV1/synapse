import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int transactionsCount: 0
    property int wishlistCount: 0
    property string activeSubTab: "transactions"
    property string transactionTypeFilter: "all"
    property string transactionSearch: ""

    signal newTransactionRequested()
    signal newWishlistRequested()
    signal helpRequested()
    signal subTabSelected(string tab)
    signal typeFilterSelected(string type)
    signal searchChanged(string search)

    // Header and Action Buttons
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            Text {
                text: "💰 Finanças Pessoais & Wishlist"
                color: "#fffffe"
                font.pixelSize: 24
                font.bold: true
            }
            Text {
                text: "Gestão financeira local, controle de fluxo de caixa e lista de compras com SQLite"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        // + Nova Transação Button
        Rectangle {
            width: 146; height: 38; radius: 10
            color: "#7c3aed" // brand-600

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                Text { text: "Nova Transação"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.newTransactionRequested()
            }
        }

        // + Item Wishlist Button
        Rectangle {
            width: 120; height: 38; radius: 10
            color: "#1a1924"
            border.color: "#4d8b5cf6"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "★"; color: "#c4b5fd"; font.pixelSize: 13 }
                Text { text: "Wishlist"; color: "#c4b5fd"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.newWishlistRequested()
            }
        }

        // Ajuda Button
        Rectangle {
            width: 86; height: 38; radius: 10
            color: "#161524"
            border.color: "#18ffffff"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "❓"; font.pixelSize: 12 }
                Text { text: "Ajuda"; color: "#a7a9be"; font.pixelSize: 13; font.bold: true }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.helpRequested()
            }
        }
    }

    // Subtabs: Transações vs Wishlist + Type Filters
    RowLayout {
        Layout.fillWidth: true
        spacing: 8

        Rectangle {
            width: 150; height: 36; radius: 8
            color: headerRoot.activeSubTab === "transactions" ? "#1a6366f1" : "transparent"
            border.color: headerRoot.activeSubTab === "transactions" ? "#6366f1" : "transparent"
            Text {
                anchors.centerIn: parent
                text: "Transações (" + headerRoot.transactionsCount + ")"
                color: headerRoot.activeSubTab === "transactions" ? "#a78bfa" : "#a7a9be"
                font.pixelSize: 13
                font.bold: true
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.subTabSelected("transactions")
            }
        }

        Rectangle {
            width: 150; height: 36; radius: 8
            color: headerRoot.activeSubTab === "wishlist" ? "#1a6366f1" : "transparent"
            border.color: headerRoot.activeSubTab === "wishlist" ? "#6366f1" : "transparent"
            Text {
                anchors.centerIn: parent
                text: "Wishlist (" + headerRoot.wishlistCount + ")"
                color: headerRoot.activeSubTab === "wishlist" ? "#a78bfa" : "#a7a9be"
                font.pixelSize: 13
                font.bold: true
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.subTabSelected("wishlist")
            }
        }

        Item { Layout.fillWidth: true }

        // Transaction Filter Pills (when transactions tab is active)
        RowLayout {
            visible: headerRoot.activeSubTab === "transactions"
            spacing: 6

            Repeater {
                model: [
                    { key: "all", label: "Todas" },
                    { key: "income", label: "Receitas" },
                    { key: "expense", label: "Despesas" }
                ]
                delegate: Rectangle {
                    property bool isSel: headerRoot.transactionTypeFilter === modelData.key
                    height: 28
                    width: fltText.contentWidth + 16
                    radius: 14
                    color: isSel ? "#6366f1" : "#161524"
                    border.color: isSel ? "#818cf8" : "#10ffffff"
                    border.width: 1

                    Text {
                        id: fltText
                        anchors.centerIn: parent
                        text: modelData.label
                        color: isSel ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 11
                        font.bold: isSel
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: headerRoot.typeFilterSelected(modelData.key)
                    }
                }
            }
        }

        // Transaction Search Box
        Rectangle {
            visible: headerRoot.activeSubTab === "transactions"
            width: 180; height: 32; radius: 8
            color: "#161524"
            border.color: txSearchInput.activeFocus ? "#818cf8" : "#10ffffff"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 4
                Text { text: "🔍"; color: "#64748b"; font.pixelSize: 11 }
                TextInput {
                    id: txSearchInput
                    Layout.fillWidth: true
                    color: "#fffffe"
                    font.pixelSize: 12
                    text: headerRoot.transactionSearch
                    onTextChanged: headerRoot.searchChanged(text)
                    selectByMouse: true

                    Text {
                        visible: !txSearchInput.text && !txSearchInput.activeFocus
                        anchors.fill: parent
                        verticalAlignment: Text.AlignVCenter
                        text: "Buscar..."
                        color: "#64748b"
                        font.pixelSize: 11
                    }
                }
            }
        }
    }
}
