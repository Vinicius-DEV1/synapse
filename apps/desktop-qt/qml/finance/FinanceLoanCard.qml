import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: loanCardRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 110
    radius: 12
    color: "#161524"
    border.color: "#2e2b44"
    border.width: 1

    property var loan: null

    signal paymentRequested(var loanItem)
    signal reopenRequested(string loanId)
    signal deleteRequested(string loanId)

    readonly property bool isLent: loan ? loan.type === "lent" : true
    readonly property double totalAmount: loan ? Number(loan.amount || 0) : 0
    readonly property double paidAmount: loan ? Number(loan.paid_amount || 0) : 0
    readonly property double remainingAmount: Math.max(0, totalAmount - paidAmount)
    readonly property double progress: totalAmount > 0 ? Math.min(1.0, paidAmount / totalAmount) : 0

    RowLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 16

        // Type badge icon
        Rectangle {
            width: 40
            height: 40
            radius: 10
            color: loanCardRoot.isLent ? "#2610b981" : "#26f43f5e"
            Text {
                anchors.centerIn: parent
                text: loanCardRoot.isLent ? "↗️" : "↘️"
                font.pixelSize: 18
            }
        }

        // Details Column
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: loanCardRoot.loan ? (loanCardRoot.loan.title || "Empréstimo") : ""
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }

                Rectangle {
                    height: 20
                    radius: 10
                    color: loanCardRoot.isLent ? "#10b981" : "#f43f5e"
                    Layout.preferredWidth: badgeTxt.implicitWidth + 12
                    Text {
                        id: badgeTxt
                        anchors.centerIn: parent
                        text: loanCardRoot.isLent ? "A Receber" : "A Pagar"
                        color: "#ffffff"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }

            // Amounts strip
            RowLayout {
                spacing: 16
                Text {
                    text: "Total: R$ " + loanCardRoot.totalAmount.toFixed(2)
                    color: "#94a1b2"
                    font.pixelSize: 11
                }
                Text {
                    text: "Pago: R$ " + loanCardRoot.paidAmount.toFixed(2)
                    color: "#10b981"
                    font.pixelSize: 11
                }
                Text {
                    text: "Restante: R$ " + loanCardRoot.remainingAmount.toFixed(2)
                    color: loanCardRoot.isLent ? "#34d399" : "#fb7185"
                    font.pixelSize: 11
                    font.bold: true
                }
            }

            // Progress bar
            Rectangle {
                Layout.fillWidth: true
                height: 6
                radius: 3
                color: "#11101a"

                Rectangle {
                    height: parent.height
                    radius: parent.radius
                    width: parent.width * loanCardRoot.progress
                    color: loanCardRoot.isLent ? "#10b981" : "#f43f5e"
                    Behavior on width { NumberAnimation { duration: 200 } }
                }
            }
        }

        // Actions
        ColumnLayout {
            spacing: 6

            Button {
                text: loanCardRoot.remainingAmount > 0 ? "Pagar / Amortizar" : qsTr("Reabrir")
                background: Rectangle {
                    color: "#232135"
                    radius: 6
                    border.color: loanCardRoot.remainingAmount > 0 ? "#8b5cf6" : "#f59e0b"
                }
                contentItem: Text {
                    text: parent.text
                    color: loanCardRoot.remainingAmount > 0 ? "#c4b5fd" : "#fbbf24"
                    font.pixelSize: 11
                    font.bold: true
                }
                onClicked: {
                    if (loanCardRoot.remainingAmount > 0) {
                        loanCardRoot.paymentRequested(loanCardRoot.loan)
                    } else if (loanCardRoot.loan && loanCardRoot.loan.id) {
                        loanCardRoot.reopenRequested(loanCardRoot.loan.id)
                    }
                }
            }

            Button {
                text: "Excluir"
                flat: true
                contentItem: Text {
                    text: "✕ Excluir"
                    color: "#f43f5e"
                    font.pixelSize: 10
                }
                onClicked: {
                    if (loanCardRoot.loan && loanCardRoot.loan.id) {
                        loanCardRoot.deleteRequested(loanCardRoot.loan.id)
                    }
                }
            }
        }
    }
}
