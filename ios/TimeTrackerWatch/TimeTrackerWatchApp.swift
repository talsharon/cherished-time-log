import SwiftUI

@main
struct TimeTrackerWatchApp: App {
    @StateObject private var wc = WatchConnectivityModel()

    var body: some Scene {
        WindowGroup {
            WatchContentView()
                .environmentObject(wc)
        }
    }
}
