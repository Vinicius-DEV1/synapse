import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

ColumnLayout {
    id: loansTabRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    spacing: 16

    property var loansList: []
    property int typeFilter: 0 // 0: All, 1: Lent, 2: Borrowed

    signal paymentRequested(var loanItem)
    signal deleteLoanRequested(string loanId)
    signal newLoanRequested()

    function isLent(item) {
        return item && (item.type === "lent" || item.type === "loan_made")
    }

    function calculateTotalLent() {
        var sum = 0
        for (var i = 0; i < loansList.length; i++) {
            if (isLent(loansList[i])) {
                sum += Math.max(0, Number(loansList[i].amount || 0) - Number(loansList[i].paid_amount || 0))
            }
        }
        return sum
    }

    function calculateTotalBorrowed() {
        var sum = 0
        for (var i = 0; i < loansList.length; i++) {
            if (!isLent(loansList[i])) {
                sum += Math.max(0, Number(loansList[i].amount || 0) - Number(loansList[i].paid_amount || 0))
            }
        }
        return sum
    }

    function getFilteredLoans() {
        if (typeFilter === 0) return loansList
        return loansList.filter(function(l) {
            return typeFilter === 1 ? isLent(l) : !isLent(l)
        })
    }

    // 3 Loan KPI Cards
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        Rectangle {
            Layout.fillWidth: true
            height: 72
            radius: 12
            color: "#161524"
            border.color: "#2e2b44"
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 2
                Text { text: "A Receber (Emprestado)"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                Text { text: "R$ " + loansTabRoot.calculateTotalLent().toFixed(2); color: "#10b981"; font.pixelSize: 17; font.bold: true; Layout.alignment: Qt.AlignHCenter }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 72
            radius: 12
            color: "#161524"
            border.color: "#2e2b44"
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 2
                Text { text: "A Pagar (Dívidas)"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                Text { text: "R$ " + loansTabRoot.calculateTotalBorrowed().toFixed(2); color: "#f43f5e"; font.pixelSize: 17; font.bold: true; Layout.alignment: Qt.AlignHCenter }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 72
            radius: 12
            color: "#161524"
            border.color: "#2e2b44"
            ColumnLayout {
                anchors.centerIn: parent
                spacing: 2
                Text { text: "Saldo Líquido"; color: "#94a1b2"; font.pixelSize: 11; Layout.alignment: Qt.AlignHCenter }
                Text {
                    property double net: loansTabRoot.calculateTotalLent() - loansTabRoot.calculateTotalBorrowed()
                    text: (net >= 0 ? "+ R$ " : "- R$ ") + Math.abs(net).toFixed(2)
                    color: net >= 0 ? "#10b981" : "#f43f5e"
                    font.pixelSize: 17
                    font.bold: true
                    Layout.alignment: Qt.AlignHCenter
                }
            }
        }
    }

    // Filter Chips Row
    RowLayout {
        Layout.fillWidth: true
        spacing: 8

        Repeater {
            model: ["Todos", "A Receber", "A Pagar"]
            Rectangle {
                Layout.preferredHeight: 28
                Layout.preferredWidth: cText.implicitWidth + 16
                radius: 6
                property bool isSel: loansTabRoot.typeFilter === index
                color: isSel ? "#8b5cf6" : "#1f1d2e"
                Text { id: cText; anchors.centerIn: parent; text: modelData; color: parent.isSel ? "#ffffff" : "#94a1b2"; font.pixelSize: 11; font.bold: parent.isSel }
                MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: loansTabRoot.typeFilter = index
                }
            }
        }

        Item { Layout.fillWidth: true }
    }

    // Loans List
    ScrollView {
        Layout.fillWidth: true
        Layout.fillHeight: true
        clip: true

        ListView {
            id: loansListView
            width: loansTabRoot.width
            model: loansTabRoot.getFilteredLoans()
            spacing: 10

            delegate: FinanceLoanCard {
                width: loansListView.width
                loan: modelData
                onPaymentRequested: function(item) { loansTabRoot.paymentRequested(item) }
                onDeleteRequested: function(id) { loansTabRoot.deleteLoanRequested(id) }
            }

            Text {
                anchors.centerIn: parent
                text: "Nenhum empréstimo cadastrado."
                color: "#6b7280"
                font.pixelSize: 13
                visible: loansListView.count === 0
            }
        }
    }
}
