import SwiftUI

private enum ShellTab: Int, CaseIterable {
    case clock, logs, insights

    var title: String {
        switch self {
        case .clock: "Clock"
        case .logs: "Logs"
        case .insights: "Insights"
        }
    }

    var systemImage: String {
        switch self {
        case .clock: "clock"
        case .logs: "list.bullet"
        case .insights: "lightbulb.fill"
        }
    }
}

struct MainTabView: View {
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject var api: TimeTrackerSupabase
    @StateObject private var clockVM: ClockViewModel
    @StateObject private var logsVM: LogsViewModel
    @StateObject private var insightsVM: InsightsViewModel
    @State private var tab: ShellTab = .clock
    @State private var hasCompletedInitialActivation = false

    init(api: TimeTrackerSupabase) {
        self.api = api
        let url = AppConfig.supabaseURL!
        _clockVM = StateObject(wrappedValue: ClockViewModel(api: api, insightsBaseURL: url))
        _logsVM = StateObject(wrappedValue: LogsViewModel(api: api))
        _insightsVM = StateObject(wrappedValue: InsightsViewModel(api: api, baseURL: url))
    }

    var body: some View {
        VStack(spacing: 0) {
            shellHeader
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)

            Group {
                switch tab {
                case .clock:
                    ClockTabView(viewModel: clockVM)
                case .logs:
                    LogsTabView(viewModel: logsVM)
                case .insights:
                    InsightsTabView(viewModel: insightsVM)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            shellTabBar
        }
        .background(AppTheme.background.ignoresSafeArea())
        .tint(AppTheme.accent)
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onChange(of: scenePhase) { oldPhase, newPhase in
            guard newPhase == .active else { return }
            if !hasCompletedInitialActivation {
                hasCompletedInitialActivation = true
                return
            }
            guard oldPhase == .background || oldPhase == .inactive else { return }
            Task {
                async let clockLoad: Void = clockVM.load()
                async let logsLoad: Void = logsVM.load()
                async let insightsLoad: Void = insightsVM.load()
                _ = await (clockLoad, logsLoad, insightsLoad)
            }
        }
        .task(id: api.userId) {
            await clockVM.loadCommentAutocompleteCorpusIfNeeded()
        }
    }

    private var shellHeader: some View {
        HStack(alignment: .center) {
            Text("Time Tracker")
                .font(.headline.weight(.semibold))
                .foregroundStyle(AppTheme.foreground)
            Spacer()
            Button {
                Task { try? await api.signOut() }
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.body)
                    .foregroundStyle(AppTheme.textMuted)
            }
            .accessibilityLabel("Sign out")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppTheme.background)
    }

    private var shellTabBar: some View {
        HStack(spacing: 0) {
            ForEach(ShellTab.allCases, id: \.rawValue) { item in
                Button {
                    tab = item
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: item.systemImage)
                            .font(.system(size: 20))
                        Text(item.title)
                            .font(.caption2)
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(tab == item ? AppTheme.accent : AppTheme.textMuted)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 10)
        .padding(.bottom, 4)
        .background(AppTheme.background)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(AppTheme.border)
                .frame(height: 1)
        }
    }
}
