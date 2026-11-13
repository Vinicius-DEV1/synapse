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
    property string activeSection: "transactions"

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

                Text { text: "Guia Financeiro"; color: "#fffffe"; font.pixelSize: 18; font.bold: true }

                Repeater {
                    model: [
                        { id: "transactions", title: "Transações" },
                        { id: "accounts", title: "Contas & Saldos" },
                        { id: "transfers", title: "Transferências" },
                        { id: "wishlist", title: "Wishlist" }
                    ]

                    delegate: Button {
                        id: navButton
                        property var sectionData: modelData
                        Layout.fillWidth: true
                        text: navButton.sectionData.title
                        highlighted: helpRoot.activeSection === navButton.sectionData.id
                        onClicked: helpRoot.activeSection = navButton.sectionData.id
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
                    text: helpRoot.activeSection === "transactions" ? "Lançamentos e Categorias"
                        : helpRoot.activeSection === "accounts" ? "Gestão de Contas Bancárias"
                        : helpRoot.activeSection === "transfers" ? "Transferências entre Contas"
                        : "Lista de Desejos (Wishlist)"
                    color: "#fffffe"
                    font.pixelSize: 20
                    font.bold: true
                }

                Text {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    text: helpRoot.activeSection === "transactions"
                        ? "Registre despesas e receitas associando a uma conta bancária e categoria. Use o botão + Nova Transação para preencher descrição, valor, tipo e categoria. Na lista, você pode buscar por texto, filtrar por receitas ou despesas e editar transações em linha (✏️) ou excluí-las (🗑️)."
                        : helpRoot.activeSection === "accounts"
                        ? "O sistema mantém o saldo inicial e calcula em tempo real o saldo atual de cada conta com base nos lançamentos e transferências não pendentes. No Gerenciador de Contas (botão Gerenciar na faixa de cartões), cadastre novas contas com cores personalizadas (Nubank, Itaú, Carteira, Investimentos), edite saldos iniciais ou arquive contas descontinuadas."
                        : helpRoot.activeSection === "transfers"
                        ? "Transferências movimentam dinheiro entre duas contas cadastradas sem alterar o total global de receitas ou despesas. No formulário de transação, selecione o tipo Transferência para informar a conta de origem e a conta de destino. O saldo da conta de origem é debitado e o da conta de destino é creditado instantaneamente."
                        : "A aba Wishlist permite planejar compras futuras definindo prioridades (alta, média, baixa) e valores estimados. Ao adquirir um item da lista, clique no botão Adquirido para converter o desejo automaticamente em uma despesa na aba de Transações com a data atual e remover o item da wishlist."
                    color: "#c4c4d0"
                    font.pixelSize: 14
                    wrapMode: Text.Wrap
                    lineHeight: 1.5
                    verticalAlignment: Text.AlignTop
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 1
                    color: "#0fffffff"
                }

                Text {
                    Layout.fillWidth: true
                    text: "Todos os dados financeiros e contas são persistidos localmente com transações SQLite protegidas."
                    color: "#7c7c8b"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}

