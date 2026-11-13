import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: accountModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 150

    property bool isOpen: false
    property var accounts: []
    property var editingAccount: null
    readonly property bool isEditing: editingAccount !== null && editingAccount !== undefined
    property string errorMessage: ""
    property string selectedColor: "#10b981"

    signal closed()
    signal accountCreated(string name, string color, string icon, double initialBalance)
    signal accountUpdated(string accountId, string name, string color, string icon, double initialBalance)
    signal accountDeleted(string accountId)

    readonly property var colorPresets: [
        { name: "Verde", color: "#10b981" },
        { name: "Roxo", color: "#8a05be" },
        { name: "Laranja", color: "#ff5f00" },
        { name: "Vermelho", color: "#dc2626" },
        { name: "Azul", color: "#2563eb" },
        { name: "Indigo", color: "#6366f1" },
        { name: "Ciano", color: "#06b6d4" },
        { name: "Amarelo", color: "#eab308" }
    ]

    function resetForm() {
        editingAccount = null
        accNameInput.text = ""
        accBalanceInput.text = "0.00"
        selectedColor = "#10b981"
        errorMessage = ""
    }

    function startEdit(acc) {
        editingAccount = acc
        accNameInput.text = acc.name || ""
        accBalanceInput.text = Number(acc.initial_balance || 0).toFixed(2)
        selectedColor = acc.color || "#10b981"
        errorMessage = ""
        accNameInput.forceActiveFocus()
    }

    onIsOpenChanged: {
        if (isOpen) resetForm()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: accountModalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 620)
        height: Math.min(parent.height - 48, 560)
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "🏦 Gerenciador de Contas"
                        color: "#fffffe"
                        font.pixelSize: 20
                        font.bold: true
                    }
                    Text {
                        text: "Cadastre contas bancárias, carteiras e acompanhe os saldos calculados"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: closeAccMouse.containsMouse ? "#20ffffff" : "#10ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: closeAccMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: accountModalRoot.closed()
                    }
                }
            }

            // Accounts List
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#0f0e17"
                border.color: "#0fffffff"
                clip: true

                ListView {
                    id: accountsListView
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 6
                    model: accountModalRoot.accounts

                    delegate: Rectangle {
                        id: accRowRect
                        property var rowData: modelData
                        width: accountsListView.width
                        height: 52
                        radius: 8
                        color: accountModalRoot.editingAccount && accountModalRoot.editingAccount.id === accRowRect.rowData.id
                            ? "#206366f1"
                            : "#1a1924"
                        border.color: "#0affffff"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 12

                            Rectangle {
                                Layout.preferredWidth: 10
                                Layout.preferredHeight: 10
                                radius: 5
                                color: accRowRect.rowData.color || "#10b981"
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: accRowRect.rowData.name || ""
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: "Inicial: R$ " + Number(accRowRect.rowData.initial_balance || 0).toFixed(2)
                                    color: "#71717a"
                                    font.pixelSize: 11
                                }
                            }

                            Text {
                                text: "R$ " + Number(accRowRect.rowData.current_balance || 0).toFixed(2)
                                color: Number(accRowRect.rowData.current_balance || 0) < 0 ? "#f43f5e" : "#34d399"
                                font.pixelSize: 14
                                font.bold: true
                            }

                            // Edit Button
                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: editAccMouse.containsMouse ? "#206366f1" : "#106366f1"
                                Text { anchors.centerIn: parent; text: "✏️"; font.pixelSize: 11 }
                                MouseArea {
                                    id: editAccMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: accountModalRoot.startEdit(accRowRect.rowData)
                                }
                            }

                            // Delete Button
                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: delAccMouse.containsMouse ? "#30f43f5e" : "#1af43f5e"
                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                                MouseArea {
                                    id: delAccMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: accountModalRoot.accountDeleted(accRowRect.rowData.id)
                                }
                            }
                        }
                    }

                    Text {
                        anchors.centerIn: parent
                        visible: !accountModalRoot.accounts || accountModalRoot.accounts.length === 0
                        text: "Nenhuma conta cadastrada."
                        color: "#64748b"
                        font.pixelSize: 13
                    }
                }
            }

            // Account Form Section (Add / Edit)
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 180
                radius: 12
                color: "#13121f"
                border.color: "#18ffffff"

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 10

                    Text {
                        text: accountModalRoot.isEditing ? "Editar Conta: " + (accountModalRoot.editingAccount.name || "") : "Nova Conta"
                        color: "#c4b5fd"
                        font.pixelSize: 13
                        font.bold: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        TextField {
                            id: accNameInput
                            Layout.fillWidth: true
                            placeholderText: "Nome da conta (ex: Nubank, Carteira, Itaú)..."
                        }

                        TextField {
                            id: accBalanceInput
                            Layout.preferredWidth: 140
                            placeholderText: "Saldo Inicial (0.00)..."
                            text: "0.00"
                        }
                    }

                    // Color Preset Chips
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Text { text: "Cor:"; color: "#a7a9be"; font.pixelSize: 12 }

                        Repeater {
                            model: accountModalRoot.colorPresets

                            delegate: Rectangle {
                                id: colorChip
                                property var chipData: modelData
                                Layout.preferredWidth: 20
                                Layout.preferredHeight: 20
                                radius: 10
                                color: colorChip.chipData.color
                                border.color: accountModalRoot.selectedColor === colorChip.chipData.color ? "#ffffff" : "transparent"
                                border.width: 2

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: accountModalRoot.selectedColor = colorChip.chipData.color
                                }
                            }
                        }

                        Item { Layout.fillWidth: true }
                    }

                    // Error text
                    Text {
                        visible: accountModalRoot.errorMessage.length > 0
                        text: accountModalRoot.errorMessage
                        color: "#fda4af"
                        font.pixelSize: 11
                    }

                    // Buttons
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        Button {
                            visible: accountModalRoot.isEditing
                            text: "Cancelar Edição"
                            onClicked: accountModalRoot.resetForm()
                        }

                        Item { Layout.fillWidth: true }

                        Button {
                            text: accountModalRoot.isEditing ? "Atualizar Conta" : "+ Adicionar Conta"
                            highlighted: true
                            onClicked: {
                                var name = accNameInput.text.trim()
                                if (name.length === 0) {
                                    accountModalRoot.errorMessage = "Informe um nome válido para a conta."
                                    return
                                }
                                var initialBal = parseFloat(accBalanceInput.text)
                                if (isNaN(initialBal)) initialBal = 0.0

                                if (accountModalRoot.isEditing) {
                                    accountModalRoot.accountUpdated(accountModalRoot.editingAccount.id, name, accountModalRoot.selectedColor, "wallet", initialBal)
                                } else {
                                    accountModalRoot.accountCreated(name, accountModalRoot.selectedColor, "wallet", initialBal)
                                }
                                accountModalRoot.resetForm()
                            }
                        }
                    }
                }
            }
        }
    }
}

