import SwiftUI

struct MainTabView: View {
    @ObservedObject var api: TimeTrackerSupabase
    @StateObject private var clockVM: ClockViewModel
    @StateObject private var logsVM: LogsViewModel
    @StateObject private var insightsVM: InsightsViewModel

    init(api: TimeTrackerSupabase) {
        self.api = api
        let url = AppConfig.supabaseURL!
        _clockVM = StateObject(wrappedValue: ClockViewModel(api: api, insightsBaseURL: url))
        _logsVM = StateObject(wrappedValue: LogsViewModel(api: api))
        _insightsVM = StateObject(wrappedValue: InsightsViewModel(api: api, baseURL: url))
    }

    var body: some View {
        TabView {
            ClockTabView(viewModel: clockVM) {
                Task { try? await api.signOut() }
            }
            .tabItem { Label("Clock", systemImage: "clock") }
            LogsTabView(viewModel: logsVM)
                .tabItem { Label("Logs", systemImage: "list.bullet") }
            InsightsTabView(viewModel: insightsVM)
                .tabItem { Label("Insights", systemImage: "lightbulb") }
        }
    }
}
