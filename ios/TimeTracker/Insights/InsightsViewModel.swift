import Combine
import Foundation
import SwiftUI

@MainActor
final class InsightsViewModel: ObservableObject {
    private let api: TimeTrackerSupabase
    private let insightsService: InsightsService

    @Published var insights: [WeeklyInsightRow] = []
    @Published var loading = true
    @Published var generating = false
    @Published var errorMessage: String?

    init(api: TimeTrackerSupabase, baseURL: URL) {
        self.api = api
        insightsService = InsightsService(baseURL: baseURL)
    }

    func load() async {
        guard let uid = api.userId else { return }
        loading = true
        errorMessage = nil
        do {
            insights = try await api.fetchWeeklyInsights(userId: uid)
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }

    func generate() async {
        guard let token = api.accessToken else { return }
        generating = true
        errorMessage = nil
        defer { generating = false }
        do {
            _ = try await insightsService.generateWeeklyInsights(accessToken: token)
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
