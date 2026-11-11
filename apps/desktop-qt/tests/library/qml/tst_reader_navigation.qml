import QtQuick
import QtTest
import "../../../qml/library" as Library

TestCase {
    name: "ReaderNavigation"
    when: windowShown
    width: 320
    height: 200

    Library.LibraryReaderNavigationShortcuts {
        id: navigation
        enabledForReading: true
        canGoBack: false
        canGoForward: true
    }
    SignalSpy { id: previous; target: navigation; signalName: "previousRequested" }
    SignalSpy { id: next; target: navigation; signalName: "nextRequested" }

    function test_navigationAndGuards() {
        keyClick(Qt.Key_Right)
        compare(next.count, 1)
        keyClick(Qt.Key_Left)
        compare(previous.count, 0)
        navigation.canGoBack = true
        keyClick(Qt.Key_Left)
        compare(previous.count, 1)
        navigation.enabledForReading = false
        keyClick(Qt.Key_Right)
        compare(next.count, 1)
    }
}
