import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../editor-extensions/image"

// External/standard image block reusing ImageFrame with align, width resize, caption, and retry.
Item {
    id: extImgRoot
    Layout.fillWidth: true
    implicitHeight: frame.implicitHeight

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData && blockData.attrs ? blockData.attrs : ({})
    property string src: attrs["src"] || ""
    property string caption: attrs["data-caption"] || attrs["alt"] || ""
    property string alignMode: attrs["data-align"] || "center"
    property int imgWidth: parseInt(attrs["width"] || "560", 10) || 560

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    function saveAttrs(patch) {
        attrsUpdated(Object.assign({}, attrs, patch))
    }

    ImageFrame {
        id: frame
        width: parent.width
        src: extImgRoot.src
        caption: extImgRoot.caption
        alignMode: extImgRoot.alignMode
        imgWidth: extImgRoot.imgWidth
        isLocked: false
        onAlignChanged: function(a) { extImgRoot.saveAttrs({ "data-align": a }) }
        onWidthCommitted: function(w) { extImgRoot.saveAttrs({ "width": String(w) }) }
        onCaptionCommitted: function(c) { extImgRoot.saveAttrs({ "data-caption": c }) }
        onCopyRequested: {
            if (extImgRoot.controller && typeof extImgRoot.controller.copyToClipboard === "function") {
                extImgRoot.controller.copyToClipboard(extImgRoot.src)
            }
        }
        onDeleteRequested: extImgRoot.removeRequested()
    }
}
