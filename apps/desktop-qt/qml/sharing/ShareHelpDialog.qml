import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: helpRoot
    anchors.fill: parent
    visible: isOpen
    z: 220

    property bool isOpen: false
    property string activeSection: "links" // links, passwords, approval, recovery

    signal closed()

    Theme { id: theme }

    Shortcut {
        sequence: "Escape"
        enabled: helpRoot.isOpen
        onActivated: helpRoot.closed()
    }

    Rectangle {
        anchors.fill: parent
        color: "#aa000000"

        MouseArea {
            anchors.fill: parent
            onClicked: helpRoot.closed()
        }
    }

    Rectangle {
        id: dialogCard
        width: Math.min(740, parent.width - 32)
        height: Math.min(520, parent.height - 40)
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        anchors.centerIn: parent

        MouseArea {
            anchors.fill: parent
            onClicked: function(mouse) { mouse.accepted = true }
        }

        RowLayout {
            anchors.fill: parent
            spacing: 0

            // Left Navigation Tabs
            Rectangle {
                Layout.preferredWidth: 220
                Layout.fillHeight: true
                color: theme.bgDarkSurface
                radius: 16

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 8

                    Text {
                        text: qsTr("Guia de Compartilhamento")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                        Layout.bottomMargin: 8
                    }

                    Repeater {
                        model: [
                            { id: "links", label: qsTr("Links e Acesso"), icon: "notes" },
                            { id: "passwords", label: qsTr("Proteção por Senha"), icon: "key" },
                            { id: "approval", label: qsTr("Aprovação do Dono"), icon: "shield" },
                            { id: "recovery", label: qsTr("Chaves e Segurança"), icon: "vault" }
                        ]

                        delegate: Rectangle {
                            id: secBtn
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            radius: 8
                            color: helpRoot.activeSection === modelData.id ? theme.activePillBg : (btnMouse.containsMouse ? theme.bgHover : "transparent")
                            border.color: helpRoot.activeSection === modelData.id ? theme.brand500 : "transparent"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8

                                AppIcon {
                                    width: 14; height: 14
                                    name: modelData.icon
                                    color: helpRoot.activeSection === modelData.id ? theme.brand400 : theme.textSubtext
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.label
                                    color: helpRoot.activeSection === modelData.id ? theme.brand400 : theme.textDark
                                    font.pixelSize: 12
                                    font.bold: helpRoot.activeSection === modelData.id
                                }
                            }

                            MouseArea {
                                id: btnMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: helpRoot.activeSection = modelData.id
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }
            }

            // Right Content Area
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: theme.bgDarkCard
                radius: 16

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 24
                    spacing: 16

                    // Header with Close Button
                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: {
                                if (helpRoot.activeSection === "links") return qsTr("Links de Compartilhamento")
                                if (helpRoot.activeSection === "passwords") return qsTr("Proteção por Senha")
                                if (helpRoot.activeSection === "approval") return qsTr("Aprovação e Controle de Acesso")
                                return qsTr("Chaves e Recuperação E2EE")
                            }
                            color: theme.textDark
                            font.pixelSize: 16
                            font.bold: true
                        }
                        Item { Layout.fillWidth: true }
                        Rectangle {
                            width: 28; height: 28; radius: 6
                            color: closeMouse.containsMouse ? theme.bgHover : "transparent"
                            Text {
                                anchors.centerIn: parent
                                text: "✕"
                                color: theme.textSubtext
                                font.pixelSize: 12
                            }
                            MouseArea {
                                id: closeMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: helpRoot.closed()
                            }
                        }
                    }

                    Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

                    // Body
                    Flickable {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        contentHeight: articleCol.implicitHeight
                        clip: true

                        ColumnLayout {
                            id: articleCol
                            width: parent.width
                            spacing: 14

                            // Section: Links
                            ColumnLayout {
                                visible: helpRoot.activeSection === "links"
                                spacing: 10
                                Layout.fillWidth: true

                                Text {
                                    text: qsTr("Crie links seguros para qualquer página do caderno. Você pode definir se o link concede apenas permissão de visualização (leitura) ou edição colaborativa.")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: qsTr("Em links sem senha, a chave de decriptografia fica contida no fragmento (#) do endereço. O fragmento nunca é enviado aos servidores, garantindo privacidade ponta a ponta (Zero-Knowledge).")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                            }

                            // Section: Passwords
                            ColumnLayout {
                                visible: helpRoot.activeSection === "passwords"
                                spacing: 10
                                Layout.fillWidth: true

                                Text {
                                    text: qsTr("A senha protege a chave que decriptografa o conteúdo da página. A chave não fica armazenada em texto plano no banco de dados nem nos metadados públicos.")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: qsTr("Recomendamos utilizar uma senha forte e exclusiva. Qualquer pessoa com o endereço e a senha correta poderá abrir a página enquanto o link estiver ativo.")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                            }

                            // Section: Approval
                            ColumnLayout {
                                visible: helpRoot.activeSection === "approval"
                                spacing: 10
                                Layout.fillWidth: true

                                Text {
                                    text: qsTr("Com a aprovação ativada, cada novo dispositivo que tentar abrir a página enviará uma solicitação de acesso que aparecerá na sua central de notificações.")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: qsTr("Você pode autorizar ou rejeitar solicitações diretamente e revogar dispositivos previamente confiáveis através do Painel de Compartilhamento.")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }
                            }

                            // Section: Recovery
                            ColumnLayout {
                                visible: helpRoot.activeSection === "recovery"
                                spacing: 12
                                Layout.fillWidth: true

                                Text {
                                    text: qsTr("O Synapse mantém uma cópia local protegida da chave de cada compartilhamento na sua base SQLite criptografada (E2EE).")
                                    color: theme.textSubtext
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    Layout.fillWidth: true
                                }

                                Rectangle {
                                    Layout.fillWidth: true
                                    Layout.preferredHeight: 70
                                    radius: 10
                                    color: theme.warningBg
                                    border.color: theme.warningBorder

                                    RowLayout {
                                        anchors.fill: parent
                                        anchors.margins: 12
                                        spacing: 10

                                        AppIcon {
                                            width: 16; height: 16
                                            name: "alert"
                                            color: theme.warning
                                        }

                                        Text {
                                            Layout.fillWidth: true
                                            text: qsTr("Ao revogar um compartilhamento, o link deixa de responder imediatamente e nenhuma nova requisição terá acesso ao conteúdo decriptografado.")
                                            color: theme.textDark
                                            font.pixelSize: 12
                                            wrapMode: Text.Wrap
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
