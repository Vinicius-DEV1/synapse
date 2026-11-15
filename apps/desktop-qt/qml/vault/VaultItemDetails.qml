pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: detailsRoot
    property var item: null
    signal editRequested()
    signal deleteRequested()

    property bool showPassword: false
    property string copiedField: ""

    readonly property bool isGoogle: item ? (item.login_type === "google") : false

    function parseCustomFields() {
        if (!item || !item.custom_fields) return []
        if (typeof item.custom_fields === "string") {
            try {
                return JSON.parse(item.custom_fields)
            } catch (e) {
                return []
            }
        }
        return item.custom_fields
    }

    Timer {
        id: copiedTimer
        interval: 2000
        onTriggered: detailsRoot.copiedField = ""
    }

    function copyVal(val, fieldKey) {
        if (!val) return
        dataController.copyToClipboard(val)
        copiedField = fieldKey
        copiedTimer.restart()
    }

    ScrollView {
        anchors.fill: parent
        contentWidth: parent.width
        clip: true

        ColumnLayout {
            width: Math.min(parent.width - 64, 768)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { Layout.preferredHeight: 16 }

            // Header Section
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                Rectangle {
                    Layout.preferredWidth: 56
                    Layout.preferredHeight: 56
                    radius: 14
                    color: detailsRoot.isGoogle ? "#1f1f2e" : "#281b38"
                    border.color: detailsRoot.isGoogle ? "#3a3a4c" : "#7c3aed"
                    border.width: 1

                    Item {
                        anchors.fill: parent
                        GoogleGIcon {
                            anchors.centerIn: parent
                            visible: detailsRoot.isGoogle
                            size: 28
                        }
                        AppIcon {
                            anchors.centerIn: parent
                            visible: !detailsRoot.isGoogle
                            name: "key"
                            color: "#a78bfa"
                            Layout.preferredWidth: 26
                            Layout.preferredHeight: 26
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        spacing: 8
                        Text {
                            text: detailsRoot.item ? (detailsRoot.item.label || "Sem título") : ""
                            color: "#fffffe"
                            font.pixelSize: 20
                            font.weight: Font.Bold
                        }

                        Rectangle {
                            visible: detailsRoot.isGoogle
                            Layout.preferredHeight: 20
                            Layout.preferredWidth: 92
                            radius: 6
                            color: "#1e1438"
                            border.color: "#6d28d9"
                            border.width: 1

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 4
                                GoogleGIcon { size: 11 }
                                Text {
                                    text: "Google SSO"
                                    color: "#c4b5fd"
                                    font.pixelSize: 10
                                    font.weight: Font.DemiBold
                                }
                            }
                        }
                    }

                    Text {
                        visible: detailsRoot.item && detailsRoot.item.url
                        text: detailsRoot.item ? (detailsRoot.item.url || "") : ""
                        color: "#a78bfa"
                        font.pixelSize: 12

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var u = detailsRoot.item.url
                                if (u.indexOf("http") !== 0) u = "https://" + u
                                Qt.openUrlExternally(u)
                            }
                        }
                    }
                }

                // Edit & Delete Actions
                RowLayout {
                    spacing: 8

                    Rectangle {
                        Layout.preferredHeight: 34
                        Layout.preferredWidth: 74
                        radius: 8
                        color: editMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
                        border.color: "#3a3a4c"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: "Editar"
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.weight: Font.Medium
                        }

                        MouseArea {
                            id: editMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: detailsRoot.editRequested()
                        }
                    }

                    Rectangle {
                        Layout.preferredWidth: 34
                        Layout.preferredHeight: 34
                        radius: 8
                        color: delMouse.containsMouse ? "#3b1e28" : "#2a151b"
                        border.color: "#ef4444"
                        border.width: 1

                        AppIcon {
                            anchors.centerIn: parent
                            name: "trash"
                            color: "#ef4444"
                            Layout.preferredWidth: 15
                            Layout.preferredHeight: 15
                        }

                        MouseArea {
                            id: delMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: detailsRoot.deleteRequested()
                        }
                    }
                }
            }

            // Credenciais Card
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: credCol.implicitHeight + 32
                radius: 16
                color: "#16161e"
                border.color: "#2e2e38"
                border.width: 1

                ColumnLayout {
                    id: credCol
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 12

                    Text {
                        text: "CREDENCIAIS"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.weight: Font.Bold
                    }

                    // Google SSO Banner
                    Rectangle {
                        visible: detailsRoot.isGoogle
                        Layout.fillWidth: true
                        Layout.preferredHeight: 48
                        radius: 10
                        color: "#1e1438"
                        border.color: "#6d28d9"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 10

                            GoogleGIcon { size: 18 }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: "Conta vinculada ao Google"
                                    color: "#fffffe"
                                    font.pixelSize: 11
                                    font.weight: Font.Bold
                                }
                                Text {
                                    text: "Acesso direto via autenticação federada"
                                    color: "#c4b5fd"
                                    font.pixelSize: 10
                                }
                            }

                            Rectangle {
                                Layout.preferredHeight: 20
                                Layout.preferredWidth: 64
                                radius: 4
                                color: "#14532d"
                                Text {
                                    anchors.centerIn: parent
                                    text: "SSO Ativo"
                                    color: "#4ade80"
                                    font.pixelSize: 10
                                    font.weight: Font.Bold
                                }
                            }
                        }
                    }

                    // Username Row
                    Rectangle {
                        visible: detailsRoot.item && detailsRoot.item.username
                        Layout.fillWidth: true
                        Layout.preferredHeight: 48
                        radius: 10
                        color: "#0f0e17"
                        border.color: "#22222d"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: "Nome de Usuário"
                                    color: "#6b7280"
                                    font.pixelSize: 10
                                }
                                Text {
                                    text: detailsRoot.item ? (detailsRoot.item.username || "") : ""
                                    color: "#fffffe"
                                    font.pixelSize: 12
                                    font.weight: Font.Medium
                                }
                            }

                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: detailsRoot.copiedField === "user" ? "#14532d" : (copyUserMouse.containsMouse ? "#2e2e38" : "transparent")

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: detailsRoot.copiedField === "user" ? "check" : "copy"
                                    color: detailsRoot.copiedField === "user" ? "#4ade80" : "#a7a9be"
                                    Layout.preferredWidth: 14
                                    Layout.preferredHeight: 14
                                }

                                MouseArea {
                                    id: copyUserMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: detailsRoot.copyVal(detailsRoot.item.username, "user")
                                }
                            }
                        }
                    }

                    // Email Row
                    Rectangle {
                        visible: detailsRoot.item && detailsRoot.item.email
                        Layout.fillWidth: true
                        Layout.preferredHeight: 48
                        radius: 10
                        color: "#0f0e17"
                        border.color: "#22222d"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: detailsRoot.isGoogle ? "E-mail da Conta Google" : "E-mail"
                                    color: "#6b7280"
                                    font.pixelSize: 10
                                }
                                Text {
                                    text: detailsRoot.item ? (detailsRoot.item.email || "") : ""
                                    color: "#fffffe"
                                    font.pixelSize: 12
                                    font.weight: Font.Medium
                                }
                            }

                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: detailsRoot.copiedField === "email" ? "#14532d" : (copyEmailMouse.containsMouse ? "#2e2e38" : "transparent")

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: detailsRoot.copiedField === "email" ? "check" : "copy"
                                    color: detailsRoot.copiedField === "email" ? "#4ade80" : "#a7a9be"
                                    Layout.preferredWidth: 14
                                    Layout.preferredHeight: 14
                                }

                                MouseArea {
                                    id: copyEmailMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: detailsRoot.copyVal(detailsRoot.item.email, "email")
                                }
                            }
                        }
                    }

                    // Password Row
                    Rectangle {
                        visible: detailsRoot.item && detailsRoot.item.password
                        Layout.fillWidth: true
                        Layout.preferredHeight: 52
                        radius: 10
                        color: "#0f0e17"
                        border.color: "#22222d"
                        border.width: 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: "Senha"
                                    color: "#6b7280"
                                    font.pixelSize: 10
                                }
                                Text {
                                    text: detailsRoot.showPassword ? (detailsRoot.item ? (detailsRoot.item.password || "") : "") : "••••••••••••"
                                    color: "#fffffe"
                                    font.family: "monospace"
                                    font.pixelSize: 13
                                }
                            }

                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: eyeMouse.containsMouse ? "#2e2e38" : "transparent"

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: detailsRoot.showPassword ? "eye-off" : "eye"
                                    color: "#a7a9be"
                                    Layout.preferredWidth: 14
                                    Layout.preferredHeight: 14
                                }

                                MouseArea {
                                    id: eyeMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: detailsRoot.showPassword = !detailsRoot.showPassword
                                }
                            }

                            Rectangle {
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 28
                                radius: 6
                                color: detailsRoot.copiedField === "pass" ? "#14532d" : (copyPassMouse.containsMouse ? "#2e2e38" : "#7c3aed")

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: detailsRoot.copiedField === "pass" ? "check" : "copy"
                                    color: "#ffffff"
                                    Layout.preferredWidth: 14
                                    Layout.preferredHeight: 14
                                }

                                MouseArea {
                                    id: copyPassMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: detailsRoot.copyVal(detailsRoot.item.password, "pass")
                                }
                            }
                        }
                    }

                    // Breach Badge Indicator
                    VaultBreachBadge {
                        visible: detailsRoot.item && detailsRoot.item.password
                        password: detailsRoot.item ? (detailsRoot.item.password || "") : ""
                    }
                }
            }

            // Custom Fields Card
            Rectangle {
                id: custFieldsRect
                property var customFieldsList: detailsRoot.parseCustomFields()
                visible: custFieldsRect.customFieldsList && custFieldsRect.customFieldsList.length > 0
                Layout.fillWidth: true
                Layout.preferredHeight: custCol.implicitHeight + 32
                radius: 16
                color: "#16161e"
                border.color: "#2e2e38"
                border.width: 1

                ColumnLayout {
                    id: custCol
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 12

                    Text {
                        text: "CAMPOS ADICIONAIS"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.weight: Font.Bold
                    }

                    Repeater {
                        model: custFieldsRect.customFieldsList

                        delegate: Rectangle {
                            id: fldDelegate
                            required property var modelData
                            required property int index

                            Layout.fillWidth: true
                            Layout.preferredHeight: 46
                            radius: 8
                            color: "#0f0e17"
                            border.color: "#22222d"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 10
                                spacing: 8

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 2
                                    Text {
                                        text: fldDelegate.modelData.key || ""
                                        color: "#6b7280"
                                        font.pixelSize: 10
                                    }
                                    Text {
                                        text: fldDelegate.modelData.type === "hidden" && !detailsRoot.showPassword ? "••••••••" : (fldDelegate.modelData.value || "")
                                        color: "#fffffe"
                                        font.pixelSize: 12
                                    }
                                }

                                Rectangle {
                                    Layout.preferredWidth: 26
                                    Layout.preferredHeight: 26
                                    radius: 6
                                    color: detailsRoot.copiedField === ("fld-" + fldDelegate.index) ? "#14532d" : (fldMouse.containsMouse ? "#2e2e38" : "transparent")

                                    AppIcon {
                                        anchors.centerIn: parent
                                        name: detailsRoot.copiedField === ("fld-" + fldDelegate.index) ? "check" : "copy"
                                        color: detailsRoot.copiedField === ("fld-" + fldDelegate.index) ? "#4ade80" : "#a7a9be"
                                        Layout.preferredWidth: 13
                                        Layout.preferredHeight: 13
                                    }

                                    MouseArea {
                                        id: fldMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: detailsRoot.copyVal(fldDelegate.modelData.value, "fld-" + fldDelegate.index)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Secure Notes Card
            Rectangle {
                visible: detailsRoot.item && detailsRoot.item.notes
                Layout.fillWidth: true
                Layout.preferredHeight: notesCol.implicitHeight + 32
                radius: 16
                color: "#16161e"
                border.color: "#2e2e38"
                border.width: 1

                ColumnLayout {
                    id: notesCol
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 8

                    Text {
                        text: "ANOTAÇÕES SEGURAS"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.weight: Font.Bold
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: notesText.implicitHeight + 20
                        radius: 10
                        color: "#0f0e17"
                        border.color: "#22222d"
                        border.width: 1

                        Text {
                            id: notesText
                            anchors.fill: parent
                            anchors.margins: 10
                            text: detailsRoot.item ? (detailsRoot.item.notes || "") : ""
                            color: "#c4b5fd"
                            font.family: "monospace"
                            font.pixelSize: 12
                            wrapMode: Text.WordWrap
                        }
                    }
                }
            }

            // Password History Card
            Rectangle {
                visible: (!detailsRoot.isGoogle || (detailsRoot.item && detailsRoot.item.password))
                Layout.fillWidth: true
                Layout.preferredHeight: histCol.implicitHeight + 32
                radius: 16
                color: "#16161e"
                border.color: "#2e2e38"
                border.width: 1

                ColumnLayout {
                    id: histCol
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 12

                    RowLayout {
                        spacing: 8
                        AppIcon {
                            name: "history"
                            color: "#a7a9be"
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                        }
                        Text {
                            text: "HISTÓRICO DE SENHAS"
                            color: "#a7a9be"
                            font.pixelSize: 11
                            font.weight: Font.Bold
                        }
                    }

                    VaultPasswordHistory {
                        itemId: detailsRoot.item ? (detailsRoot.item.id || "") : ""
                    }
                }
            }

            Item { Layout.preferredHeight: 32 }
        }
    }
}
