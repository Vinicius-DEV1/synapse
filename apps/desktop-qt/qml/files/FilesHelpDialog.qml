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

                Text { text: "Guia de Arquivos"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "overview", title: "Criptografia & Cofre" },
                        { id: "navigation", title: "Navegação & Pastas" },
                        { id: "actions", title: "Ações & Atalhos" },
                        { id: "preview", title: "Previsão Protegida" }
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
                    text: helpRoot.activeSection === "overview" ? "Armazenamento Criptografado E2EE"
                        : helpRoot.activeSection === "navigation" ? "Estrutura de Pastas e Navegação"
                        : helpRoot.activeSection === "actions" ? "Organização em Lote e Clipboard"
                        : "Visualização Segura e Exportação"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "overview"
                        ? "O módulo de Arquivos armazena seus documentos locais com proteção criptográfica robusta. Quando o cofre master está ativo, os arquivos são cifrados em envelopes protegidos (ENC1). Ao importar ou exportar arquivos, as operações ocorrem de forma atômica e cancelável em background."
                        : helpRoot.activeSection === "navigation"
                        ? "Navegue hierarquicamente por pastas ou acerte buscas rápidas filtradas por seção (Pastas, Todos, Recentes, Drive). Alterne a busca entre a pasta atual e todo o espaço, e use os botões de histórico (← Voltar, → Avançar, ↑ Subir) para transitar com agilidade."
                        : helpRoot.activeSection === "actions"
                        ? "Selecione múltiplos itens com clique e modificadores. Use atalhos universais como Ctrl+A para selecionar tudo, Ctrl+C para copiar, Ctrl+X para recortar e Ctrl+V para colar na pasta de destino. O inspetor lateral exibe metadados, links com páginas e ações diretas."
                        : "Documentos de texto, imagens e vídeos contam com preview integrado protegido por arquivos temporários efêmeros. Esses arquivos são imediatamente expurgados ao fechar a prévia ou no momento em que o cofre é bloqueado."
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
