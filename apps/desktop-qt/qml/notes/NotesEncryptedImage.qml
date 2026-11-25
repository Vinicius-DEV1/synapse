import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../editor-extensions/image"

// Encrypted E2EE image block hydrating from core image_cache via controller.getCachedImageDataUri.
Item {
    id: encImgWrap
    Layout.fillWidth: true
    implicitHeight: frame.implicitHeight

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData && blockData.attrs ? blockData.attrs : ({})
    property string rawSrc: attrs["src"] || attrs["data-src"] || ""
    property string driveFileId: attrs["data-drive-file-id"] || ""
    property string resolvedDataUri: ""
    property string caption: attrs["data-caption"] || ""
    property string alignMode: attrs["data-align"] || "center"
    property int imageWidth: parseInt(attrs["data-width"] || attrs["width"] || "460", 10) || 460
    readonly property bool isUnlocked: controller ? Boolean(controller.isVaultUnlocked) : false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    function resolveEncryptedImage() {
        if (!isUnlocked || !controller) { resolvedDataUri = ""; return }
        if (driveFileId.length > 0 && typeof controller.getCachedImageDataUri === "function") {
            var uri = controller.getCachedImageDataUri(driveFileId)
            if (uri && uri.length > 0) { resolvedDataUri = uri; return }
        }
        resolvedDataUri = rawSrc
    }

    function savePatch(patch) {
        attrsUpdated(Object.assign({}, attrs, patch))
    }

    Component.onCompleted: resolveEncryptedImage()
    onIsUnlockedChanged: resolveEncryptedImage()
    onDriveFileIdChanged: resolveEncryptedImage()

    ImageFrame {
        id: frame
        width: parent.width
        src: encImgWrap.resolvedDataUri
        caption: encImgWrap.caption
        alignMode: encImgWrap.alignMode
        imgWidth: encImgWrap.imageWidth
        showEncryptedBadge: true
        isLocked: !encImgWrap.isUnlocked
        onAlignChanged: function(a) { encImgWrap.savePatch({ "data-align": a }) }
        onWidthCommitted: function(w) { encImgWrap.savePatch({ "data-width": String(w), "width": String(w) }) }
        onCaptionCommitted: function(c) { encImgWrap.savePatch({ "data-caption": c }) }
        onCopyRequested: {
            if (encImgWrap.controller && typeof encImgWrap.controller.copyToClipboard === "function") {
                encImgWrap.controller.copyToClipboard(encImgWrap.resolvedDataUri || encImgWrap.rawSrc)
            }
        }
        onDeleteRequested: encImgWrap.removeRequested()
    }
}
