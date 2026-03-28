import Combine
import Foundation
import SwiftUI

@MainActor
final class ClockViewModel: ObservableObject, WatchCommandHandler {
    private let api: TimeTrackerSupabase
    private let insights: InsightsService

    @Published var startTime: Date?
    @Published var tacticalStartTime: Date?
    @Published var currentTitle: String = "Idle"
    @Published var currentComment: String = ""
    @Published var sessionLoading = true
    @Published var isSaving = false
    @Published var errorMessage: String?
    @Published var logs: [LogRow] = []
    @Published var titles: [TitleRow] = []
    @Published var isGeneratingInsights = false

    init(api: TimeTrackerSupabase, insightsBaseURL: URL) {
        self.api = api
        insights = InsightsService(baseURL: insightsBaseURL)
    }

    func load() async {
        guard let uid = api.userId else { return }
        sessionLoading = true
        errorMessage = nil
        do {
            async let logsTask = api.fetchLogs(userId: uid)
            async let titlesTask = api.fetchTitles(userId: uid)
            async let sessionTask = api.fetchActiveSession(userId: uid)
            logs = try await logsTask
            titles = try await titlesTask
            if let row = try await sessionTask {
                startTime = row.currentStartTime
                tacticalStartTime = row.tacticalStartTime ?? row.currentStartTime
                currentTitle = row.currentTitle
                currentComment = row.currentComment ?? ""
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        sessionLoading = false
        syncWatchContext()
    }

    func updateTitle(_ name: String) async {
        currentTitle = name
        guard let uid = api.userId else { return }
        do {
            try await api.updateActiveSessionTitle(userId: uid, title: name)
        } catch {
            errorMessage = error.localizedDescription
        }
        syncWatchContext()
    }

    func updateComment(_ text: String) async {
        currentComment = text
        guard let uid = api.userId else { return }
        do {
            try await api.updateActiveSessionComment(userId: uid, comment: text)
        } catch {
            errorMessage = error.localizedDescription
        }
        syncWatchContext()
    }

    func createTitle(name: String) async {
        guard let uid = api.userId else { return }
        let hue = Double.random(in: 0 ..< 360)
        let color = "hsl(\(Int(hue)), 70%, 50%)"
        do {
            if let row = try await api.insertTitle(userId: uid, name: name, color: color) {
                titles = try await api.fetchTitles(userId: uid)
                await updateTitle(row.name)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetTactical() async {
        guard let uid = api.userId else { return }
        tacticalStartTime = Date()
        do {
            try await api.resetTacticalTimer(userId: uid)
        } catch {
            errorMessage = error.localizedDescription
        }
        syncWatchContext()
    }

    func done() async {
        guard let uid = api.userId, let start = startTime, !isSaving else { return }
        isSaving = true
        errorMessage = nil
        let duration = Int(Date().timeIntervalSince(start))
        do {
            try await api.insertLog(
                userId: uid,
                startTime: start,
                duration: max(0, duration),
                title: currentTitle,
                comment: currentComment.isEmpty ? nil : currentComment
            )
            try await api.resetActiveSession(userId: uid)
            startTime = Date()
            tacticalStartTime = startTime
            currentTitle = "Idle"
            currentComment = ""
            logs = try await api.fetchLogs(userId: uid)
        } catch {
            errorMessage = error.localizedDescription
        }
        isSaving = false
        syncWatchContext()
    }

    func updateStartTime(_ newStart: Date) async {
        guard let uid = api.userId else { return }
        if newStart > Date() {
            errorMessage = "Start time cannot be in the future"
            return
        }
        do {
            if let last = logs.first {
                let lastStart = last.startTime
                if newStart > lastStart {
                    let newDuration = Int(newStart.timeIntervalSince(lastStart))
                    try await api.updateLog(
                        userId: uid,
                        logId: last.id,
                        title: nil,
                        comment: nil,
                        startTime: nil,
                        duration: max(0, newDuration)
                    )
                    logs = try await api.fetchLogs(userId: uid)
                }
            }
            try await api.updateActiveSessionStartTime(userId: uid, start: newStart)
            startTime = newStart
        } catch {
            errorMessage = error.localizedDescription
        }
        syncWatchContext()
    }

    func generateInsights() async {
        guard let token = api.accessToken else { return }
        isGeneratingInsights = true
        errorMessage = nil
        do {
            _ = try await insights.generateWeeklyInsights(accessToken: token)
        } catch {
            errorMessage = error.localizedDescription
        }
        isGeneratingInsights = false
    }

    func color(for title: String) -> Color {
        TitleColorResolver.color(for: title, titles: titles)
    }

    // MARK: - Watch

    func handleDoneFromWatch() async {
        await done()
    }

    func handleResetTacticalFromWatch() async {
        await resetTactical()
    }

    func handleTitleFromWatch(_ title: String) async {
        await updateTitle(title)
    }

    func snapshotForWatch() -> [String: Any] {
        var d: [String: Any] = [
            WCConstants.stateTitle: currentTitle,
        ]
        if let s = startTime {
            d[WCConstants.stateMainStart] = s.timeIntervalSince1970
        }
        if let t = tacticalStartTime {
            d[WCConstants.stateTacticalStart] = t.timeIntervalSince1970
        }
        d["titles"] = titles.map(\.name)
        return d
    }

    func syncWatchContext() {
        PhoneSessionManager.shared.pushContextToWatch(snapshotForWatch())
    }
}
