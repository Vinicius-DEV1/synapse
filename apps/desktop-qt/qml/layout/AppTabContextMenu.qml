import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Popup {
    id: tabContextMenu
    padding: 6
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    dim: false

    property var targetTab: null
    property int tabCount: 1
    property bool hasTabsToRight: false

    signal pinToggled(string tabId)
    signal newTabRequested()
    signal duplicateRequested(string tabId)
    signal closeRequested(string tabId)
    signal closeOthersRequested(string tabId)
    signal closeToRightRequested(string tabId)

    Theme { id: theme }

    background: Rectangle {
        color: theme.bgDarkCard
        radius: 10
        border.color: theme.borderBrand
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 2
        Layout.preferredWidth: 190

        // Pin / Unpin
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: pinMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: (tabContextMenu.targetTab && tabContextMenu.targetTab.isPinned) ? "pin-off" : "pin"
                    color: theme.brand400
                }
                Text {
                    text: (tabContextMenu.targetTab && tabContextMenu.targetTab.isPinned) ? qsTr("Desafixar aba") : qsTr("Fixar aba")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: pinMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    tabContextMenu.close()
                    if (tabContextMenu.targetTab) tabContextMenu.pinToggled(tabContextMenu.targetTab.id)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.borderSubtle
        }

        // New Tab
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newTabMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "plus"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Nova aba")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: newTabMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    tabContextMenu.close()
                    tabContextMenu.newTabRequested()
                }
            }
        }

        // Duplicate Tab
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: dupMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "copy"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Duplicar aba")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: dupMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    tabContextMenu.close()
                    if (tabContextMenu.targetTab) tabContextMenu.duplicateRequested(tabContextMenu.targetTab.id)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.borderSubtle
        }

        // Close Tab
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            enabled: tabContextMenu.tabCount > 1
            opacity: tabContextMenu.tabCount > 1 ? 1.0 : 0.4
            color: closeMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "close"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Fechar aba")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: closeMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: tabContextMenu.tabCount > 1 ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: {
                    if (tabContextMenu.tabCount <= 1) return
                    tabContextMenu.close()
                    if (tabContextMenu.targetTab) tabContextMenu.closeRequested(tabContextMenu.targetTab.id)
                }
            }
        }

        // Close Others
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            visible: tabContextMenu.tabCount > 1
            color: closeOthersMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "close"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Fechar outras abas")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: closeOthersMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    tabContextMenu.close()
                    if (tabContextMenu.targetTab) tabContextMenu.closeOthersRequested(tabContextMenu.targetTab.id)
                }
            }
        }

        // Close Tabs to Right
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            visible: tabContextMenu.hasTabsToRight
            color: closeRightMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "arrow-right"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Fechar abas à direita")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: closeRightMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    tabContextMenu.close()
                    if (tabContextMenu.targetTab) tabContextMenu.closeToRightRequested(tabContextMenu.targetTab.id)
                }
            }
        }
    }
}
