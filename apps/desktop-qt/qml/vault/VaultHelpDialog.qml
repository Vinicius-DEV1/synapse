import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: helpRoot
    anchors.fill: parent
    color: "#d90f0e17"
    visible: helpRoot.isOpen
    z: 190

    property bool isOpen: false
    property string activeSection: "overview"

    signal closed()

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 36, 820)
        height: Math.min(parent.height - 36, 600)
        radius: 18
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 24

            ColumnLayout {
                Layout.preferredWidth: 190
                Layout.fillHeight: true
                spacing: 12

                Text { text: "Guia do Cofre"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Criptografia E2EE" },
                        { id: "master_key", title: "Senha Mestre" },
                        { id: "items", title: "Credenciais & Grupos" },
                        { id: "security", title: "Geração & Bloqueio" }
                    ]

                    delegate: Button {
                        id: navBtn
                        property var itemData: modelData
                        Layout.fillWidth: true
                        text: navBtn.itemData.title
                        highlighted: helpRoot.activeSection === navBtn.itemData.id
                        onClicked: helpRoot.activeSection = navBtn.itemData.id
                    }
                }

                Item { Layout.fillHeight: true }

                Button {
                    Layout.fillWidth: true
                    text: "Fechar"
                    onClicked: helpRoot.closed()
                }
            }

            Rectangle { Layout.fillHeight: true; Layout.preferredWidth: 1; color: "#0fffffff" }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 14

                Text {
                    text: helpRoot.activeSection === "overview" ? "Arquitetura Zero-Knowledge e E2EE"
                        : helpRoot.activeSection === "master_key" ? "Ciclo de Vida da Senha Mestre"
                        : helpRoot.activeSection === "items" ? "Gestão de Credenciais e Grupos"
                        : "Gerador Seguro e Bloqueio Automático"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O Synapse opera sob o princípio de Conhecimento Zero (Zero-Knowledge): suas senhas e dados confidenciais nunca são armazenados em texto claro. A chave do cofre é envelopada através do Two-Tier Keychain com AES-256-GCM derivado por PBKDF2-HMAC-SHA256 (600.000 iterações), garantindo proteção resistente a ataques de força bruta."
                        : helpRoot.activeSection === "master_key"
                        ? "Ao configurar a Senha Mestre, uma chave mestra exclusiva cifra a keychain do cofre. Se o cofre estiver bloqueado, a tela Zen de desbloqueio solicita sua credencial. É possível alterar a senha mestre ou removê-la a qualquer momento pelas configurações de segurança (descriptografando o acervo de forma controlada)."
                        : helpRoot.activeSection === "items"
                        ? "Organize suas credenciais com rótulo, usuário/email, senha e URL do serviço. Cada credencial pode ser visualizada sob demanda, copiada com feedback em um clique ou editada via botão ✎. As senhas permanecem mascaradas na tela por padrão."
                        : "Gere senhas de alta entropia (18+ caracteres com números e símbolos criptograficamente seguros) clicando em 'Gerar Senha'. Ao bloquear o cofre manualmente ou pelo timer de inatividade, as chaves em memória são imediatamente purgadas."
                    color: "#c4c4d0"
                    font.pixelSize: 14
                    wrapMode: Text.Wrap
                    lineHeight: 1.5
                    verticalAlignment: Text.AlignTop
                }
            }
        }
    }
}
