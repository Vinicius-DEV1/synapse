import QtQuick 2.15
import QtQuick.Window 2.15

Item {
    id: shortcutRoot

    property var activeVideo: null
    property var mediaPlayer: null
    property var hostWindow: null
    property bool menusOpen: false
    property double playbackRate: 1.0
    property double loopA: -1
    property double loopB: -1

    signal playPauseRequested()
    signal seekRelativeRequested(int seconds)
    signal vocabDrawerRequested()
    signal speedRequested(double speed)
    signal fullscreenRequested()

    function textEntryHasFocus() {
        var window = shortcutRoot.Window.window
        var focused = window ? window.activeFocusItem : null
        return focused instanceof TextInput || focused instanceof TextEdit
    }

    function canUsePlaybackShortcuts() {
        return activeVideo !== null && !menusOpen && !textEntryHasFocus()
    }

    function toggleFullscreen() {
        fullscreenRequested()
    }

    function stepPlaybackRate(delta) {
        var nextRate = Math.max(0.25, Math.min(2.5, playbackRate + delta))
        speedRequested(Number(nextRate.toFixed(2)))
    }

    function updateLoop() {
        if (!mediaPlayer) return
        if (loopA >= 0 && loopB > loopA) mediaPlayer.setLoopAB(loopA, loopB)
        else mediaPlayer.clearLoopAB()
    }

    function markLoopA() {
        if (!mediaPlayer) return
        loopA = mediaPlayer.position
        updateLoop()
    }

    function markLoopB() {
        if (!mediaPlayer) return
        loopB = mediaPlayer.position
        updateLoop()
    }

    function clearLoop() {
        loopA = -1
        loopB = -1
        if (mediaPlayer) mediaPlayer.clearLoopAB()
    }

    onActiveVideoChanged: if (activeVideo === null) clearLoop()

    Shortcut {
        sequence: "Space"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.playPauseRequested()
    }
    Shortcut {
        sequence: "Left"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.seekRelativeRequested(-5)
    }
    Shortcut {
        sequence: "J"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.seekRelativeRequested(-5)
    }
    Shortcut {
        sequence: "Right"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.seekRelativeRequested(5)
    }
    Shortcut {
        sequence: "L"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.seekRelativeRequested(5)
    }
    Shortcut {
        sequence: "Esc"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.hostWindow &&
                 shortcutRoot.hostWindow.visibility === Window.FullScreen
        onActivated: shortcutRoot.fullscreenRequested()
    }
    Shortcut {
        sequence: "F"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.hostWindow !== null
        onActivated: shortcutRoot.toggleFullscreen()
    }
    Shortcut {
        sequence: "B"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.vocabDrawerRequested()
    }
    Shortcut {
        sequence: "I"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.markLoopA()
    }
    Shortcut {
        sequence: "O"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.markLoopB()
    }
    Shortcut {
        sequence: "P"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.clearLoop()
    }
    Shortcut {
        sequence: "Shift+>"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.stepPlaybackRate(0.25)
    }
    Shortcut {
        sequence: "Shift+<"
        enabled: shortcutRoot.canUsePlaybackShortcuts()
        onActivated: shortcutRoot.stepPlaybackRate(-0.25)
    }
    Shortcut {
        sequence: "A"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.mediaPlayer.cycleAudioTrack()
    }
    Shortcut {
        sequence: "S"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.mediaPlayer.cycleSubtitleTrack()
    }
    Shortcut {
        sequence: "["
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.mediaPlayer.adjustSubtitleDelay(-0.1)
    }
    Shortcut {
        sequence: "]"
        enabled: shortcutRoot.canUsePlaybackShortcuts() && shortcutRoot.mediaPlayer !== null
        onActivated: shortcutRoot.mediaPlayer.adjustSubtitleDelay(0.1)
    }
}
