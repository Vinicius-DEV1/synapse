import QtQuick 2.15
import "../page-view"

// Compatibility alias forwarding to refactored PageView.qml
PageView {
    id: compatPageView
    controller: dataController
}
