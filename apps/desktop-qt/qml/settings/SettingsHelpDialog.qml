import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: helpRoot
    anchors.fill: parent
    color: "#d90f0e17"
    visible: helpRoot.isOpen
    z: 220

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
                Layout.preferredWidth: 200
                Layout.fillHeight: true
                spacing: 12

                Text { text: "Guia de Ajustes"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Diagnóstico & Telemetria" },
                        { id: "backup", title: "Backups & Manutenção" },
                        { id: "volumetry", title: "Volumetria de Dados" },
                        { id: "security", title: "Segurança & Aparência" }
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
                    text: helpRoot.activeSection === "overview" ? "Diagnóstico e Infraestrutura Nativa"
                        : helpRoot.activeSection === "backup" ? "Backups de Segurança e Otimização WAL"
                        : helpRoot.activeSection === "volumetry" ? "Auditoria e Volumetria de Dados"
                        : "Segurança do Cofre e Destaque Visual"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O Synapse Desktop opera em arquitetura nativa de alto desempenho (C++17, Qt 6 Quick/QML e Rust FFI). Esta seção exibe o caminho canônico do banco SQLite, métricas de tamanho em disco, status do journal WAL (Write-Ahead Logging), contagem de tabelas do schema e versões dos módulos nativos."
                        : helpRoot.activeSection === "backup"
                        ? "Você pode gerar uma cópia snapshot do seu banco SQLite a qualquer instante clicando em 'Criar Backup'. O Synapse força um checkpoint PASSIVE do WAL antes de duplicar o arquivo para evitar corrupção. O botão 'Otimizar WAL' executa PRAGMA optimize e truncamento do log de transações, reduzindo o consumo de espaço."
                        : helpRoot.activeSection === "volumetry"
                        ? "A grade de volumetria audita instantaneamente as contagens de entidades ativas no banco: notas, vídeos, baralhos de flashcards, livros na biblioteca, obras culturais, credenciais salvas no cofre, transações financeiras, eventos de agenda, hábitos monitorados, baterias de questões e sessões de foco."
                        : "Gerencie a Senha Mestre do acervo confidencial com derivação PBKDF2 HMAC-SHA256 e criptografia AES-256-GCM. Configure o temporizador de bloqueio automático por inatividade (1m, 5m, 15m, 30m ou Nunca) e selecione a cor de destaque (accent color) para personalizar seu ambiente escuro."
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
