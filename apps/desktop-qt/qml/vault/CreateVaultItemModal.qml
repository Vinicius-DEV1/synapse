pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: modalRoot
    anchors.fill: parent
    visible: false
    z: 95

    property var initialItem: null
    property var groups: []
    property string activeGroupId: ""

    property string loginType: "password"
    property var customFields: []
    property string selectedGroupId: ""

    signal itemSubmitted(string label, string username, string password, string url, string notes, string customFieldsJson, string loginType, string groupId)
    signal closed()

    onVisibleChanged: {
        if (visible) {
            if (initialItem) {
                vaultLabelInput.text = initialItem.label || ""
                vaultUserInput.text = initialItem.username || initialItem.email || ""
                vaultPassInput.text = initialItem.password || ""
                vaultUrlInput.text = initialItem.url || ""
                vaultNotesInput.text = initialItem.notes || ""
                loginType = initialItem.login_type || "password"
                selectedGroupId = initialItem.group_id || activeGroupId || ""
                if (initialItem.custom_fields) {
                    try {
                        customFields = typeof initialItem.custom_fields === "string" ? JSON.parse(initialItem.custom_fields) : initialItem.custom_fields
                    } catch (e) {
                        customFields = []
                    }
                } else {
                    customFields = []
                }
            } else {
                vaultLabelInput.text = ""
                vaultUserInput.text = ""
                vaultPassInput.text = ""
                vaultUrlInput.text = ""
                vaultNotesInput.text = ""
                loginType = "password"
                selectedGroupId = activeGroupId || ""
                customFields = []
            }
            vaultLabelInput.forceActiveFocus()
        }
    }

    // Backdrop
    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: modalRoot.closed()
        }
    }

    // Modal Content Card
    Rectangle {
        width: 520
        height: Math.min(modalRoot.height - 64, 680)
        anchors.centerIn: parent
        radius: 20
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            // Header
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 60
                color: "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 24
                    anchors.rightMargin: 20
                    spacing: 12

                    AppIcon {
                        name: "key"
                        color: "#7c3aed"
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20
                    }

                    Text {
                        text: modalRoot.initialItem ? "Editar Credencial" : "Nova Credencial no Cofre"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        Layout.preferredWidth: 28
                        Layout.preferredHeight: 28
                        radius: 6
                        color: closeMouse.containsMouse ? "#2e2e38" : "transparent"

                        AppIcon {
                            anchors.centerIn: parent
                            name: "close"
                            color: "#9ca3af"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                        }

                        MouseArea {
                            id: closeMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: modalRoot.closed()
                        }
                    }
                }

                Rectangle {
                    anchors.bottom: parent.bottom
                    width: parent.width
                    height: 1
                    color: "#2e2e38"
                }
            }

            // Scrollable Form Fields
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                contentWidth: parent.width
                clip: true

                ColumnLayout {
                    width: parent.width - 48
                    anchors.horizontalCenter: parent.horizontalCenter
                    spacing: 16

                    Item { Layout.preferredHeight: 8 }

                    // Auth Type Toggle
                    VaultAuthTypeToggle {
                        loginType: modalRoot.loginType
                        onTypeChanged: function(newType) { modalRoot.loginType = newType }
                    }

                    // Label / Service Name
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: "Serviço ou Rótulo"; color: "#a7a9be"; font.pixelSize: 11; font.weight: Font.DemiBold }
                        TextField {
                            id: vaultLabelInput
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            placeholderText: "Ex: Google, GitHub, Netflix..."
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.pixelSize: 13
                            background: Rectangle {
                                radius: 8
                                color: "#0f0e17"
                                border.color: vaultLabelInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1
                            }
                        }
                    }

                    // Username / Email
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text {
                            text: modalRoot.loginType === "google" ? "E-mail da Conta Google" : "Usuário ou E-mail"
                            color: "#a7a9be"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }
                        TextField {
                            id: vaultUserInput
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            placeholderText: "seu-usuario@exemplo.com"
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.pixelSize: 13
                            background: Rectangle {
                                radius: 8
                                color: "#0f0e17"
                                border.color: vaultUserInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1
                            }
                        }
                    }

                    // Password (visible only if loginType != "google")
                    ColumnLayout {
                        visible: modalRoot.loginType !== "google"
                        Layout.fillWidth: true
                        spacing: 4

                        RowLayout {
                            Layout.fillWidth: true
                            Text { text: "Senha"; color: "#a7a9be"; font.pixelSize: 11; font.weight: Font.DemiBold; Layout.fillWidth: true }

                            // Generate Password Shortcut
                            Text {
                                text: "🎲 Gerar Senha"
                                color: "#a78bfa"
                                font.pixelSize: 11
                                font.weight: Font.Medium
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        vaultPassInput.text = dataController.generateSecurePassword(20, true, true, true, true)
                                    }
                                }
                            }
                        }

                        TextField {
                            id: vaultPassInput
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            placeholderText: "Senha mestra do serviço"
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.family: "monospace"
                            font.pixelSize: 13
                            echoMode: TextInput.Password
                            background: Rectangle {
                                radius: 8
                                color: "#0f0e17"
                                border.color: vaultPassInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1
                            }
                        }
                    }

                    // URL
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: "URL do Site (opcional)"; color: "#a7a9be"; font.pixelSize: 11; font.weight: Font.DemiBold }
                        TextField {
                            id: vaultUrlInput
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            placeholderText: "https://exemplo.com"
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.pixelSize: 13
                            background: Rectangle {
                                radius: 8
                                color: "#0f0e17"
                                border.color: vaultUrlInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1
                            }
                        }
                    }

                    // Custom Fields Editor
                    VaultCustomFieldsEditor {
                        customFields: modalRoot.customFields
                        onFieldsChanged: function(updated) { modalRoot.customFields = updated }
                    }

                    // Secure Notes
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: "Anotações Seguras"; color: "#a7a9be"; font.pixelSize: 11; font.weight: Font.DemiBold }
                        TextArea {
                            id: vaultNotesInput
                            Layout.fillWidth: true
                            Layout.preferredHeight: 80
                            placeholderText: "Notas confidenciais, códigos de recuperação, etc."
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.family: "monospace"
                            font.pixelSize: 12
                            wrapMode: Text.WordWrap
                            background: Rectangle {
                                radius: 8
                                color: "#0f0e17"
                                border.color: vaultNotesInput.activeFocus ? "#7c3aed" : "#2e2e38"
                                border.width: 1
                            }
                        }
                    }

                    Item { Layout.preferredHeight: 16 }
                }
            }

            // Footer
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 60
                color: "#13131a"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 24
                    anchors.rightMargin: 24
                    spacing: 12

                    Item { Layout.fillWidth: true }

                    Rectangle {
                        Layout.preferredWidth: 90
                        Layout.preferredHeight: 36
                        radius: 8
                        color: cancelMouse.containsMouse ? "#2e2e38" : "transparent"
                        border.color: "#2e2e38"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: "Cancelar"
                            color: "#a7a9be"
                            font.pixelSize: 12
                        }

                        MouseArea {
                            id: cancelMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: modalRoot.closed()
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 140
                        Layout.preferredHeight: 36
                        radius: 8
                        color: saveMouse.containsMouse ? "#6d28d9" : "#7c3aed"

                        Text {
                            anchors.centerIn: parent
                            text: modalRoot.initialItem ? "Salvar Alterações" : "Salvar no Cofre"
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }

                        MouseArea {
                            id: saveMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var lbl = vaultLabelInput.text.trim()
                                var usr = vaultUserInput.text.trim()
                                var pass = vaultPassInput.text
                                var url = vaultUrlInput.text.trim()
                                var notes = vaultNotesInput.text.trim()

                                if (lbl.length > 0 && (modalRoot.loginType === "google" || pass.length > 0)) {
                                    var customJson = JSON.stringify(modalRoot.customFields || [])
                                    modalRoot.itemSubmitted(lbl, usr, pass, url, notes, customJson, modalRoot.loginType, modalRoot.selectedGroupId)
                                    modalRoot.closed()
                                }
                            }
                        }
                    }
                }

                Rectangle {
                    anchors.top: parent.top
                    width: parent.width
                    height: 1
                    color: "#2e2e38"
                }
            }
        }
    }
}
