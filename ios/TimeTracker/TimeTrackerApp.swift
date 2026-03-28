import Combine
import SwiftUI

@main
struct TimeTrackerApp: App {
    @StateObject private var appState: AppState

    init() {
        PhoneSessionManager.shared.activate()
        if let url = AppConfig.supabaseURL, let key = AppConfig.supabaseAnonKey {
            _appState = StateObject(wrappedValue: AppState(supabase: TimeTrackerSupabase(url: url, anonKey: key)))
        } else {
            _appState = StateObject(wrappedValue: AppState(supabase: nil))
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
    }
}

@MainActor
final class AppState: ObservableObject {
    let supabase: TimeTrackerSupabase?

    init(supabase: TimeTrackerSupabase?) {
        self.supabase = supabase
    }
}
