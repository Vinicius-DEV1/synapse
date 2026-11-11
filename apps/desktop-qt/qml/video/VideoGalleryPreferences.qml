import QtQuick 2.15

Item {
    id: preferences
    width: 0
    height: 0
    visible: false

    property var controller: null
    property string viewMode: "grid"

    Component.onCompleted: {
        if (controller) viewMode = controller.getVideoGalleryViewMode()
    }

    onViewModeChanged: {
        if (controller) controller.setVideoGalleryViewMode(viewMode)
    }
}
