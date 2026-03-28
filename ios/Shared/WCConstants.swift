import Foundation

/// WatchConnectivity payload keys shared by iOS and watchOS targets.
enum WCConstants {
    static let action = "action"
    static let title = "title"

    static let actionDone = "done"
    static let actionResetTactical = "resetTactical"
    static let actionRequestSync = "requestSync"
    static let actionUpdateTitle = "updateTitle"

    static let stateTitle = "currentTitle"
    static let stateMainStart = "mainStart"
    static let stateTacticalStart = "tacticalStart"
}
