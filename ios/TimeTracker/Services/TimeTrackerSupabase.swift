import Combine
import Foundation
import Supabase

/// Central Supabase client + data access (mirrors web hooks).
@MainActor
final class TimeTrackerSupabase: ObservableObject {
    let client: SupabaseClient
    @Published private(set) var session: Session?
    @Published private(set) var authLoading = true

    init(url: URL, anonKey: String) {
        client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
        Task { await bootstrapSession() }
    }

    private func bootstrapSession() async {
        do {
            session = try await client.auth.session
        } catch {
            session = nil
        }
        authLoading = false
        listenAuth()
    }

    private func listenAuth() {
        Task { @MainActor in
            for await (_, newSession) in client.auth.authStateChanges {
                self.session = newSession
                self.authLoading = false
            }
        }
    }

    // MARK: Auth

    func signIn(email: String, password: String) async throws {
        _ = try await client.auth.signIn(email: email, password: password)
    }

    @discardableResult
    func signUp(email: String, password: String) async throws -> AuthResponse {
        try await client.auth.signUp(email: email, password: password)
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    var accessToken: String? {
        session?.accessToken
    }

    var userId: UUID? {
        session?.user.id
    }

    // MARK: Logs

    func fetchLogs(userId: UUID) async throws -> [LogRow] {
        try await client
            .from("logs")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("start_time", ascending: false)
            .execute()
            .value
    }

    func fetchRecentLogs(userId: UUID, limit: Int) async throws -> [LogRow] {
        try await client
            .from("logs")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("start_time", ascending: false)
            .limit(limit)
            .execute()
            .value
    }

    func insertLog(userId: UUID, startTime: Date, duration: Int, title: String, comment: String?) async throws {
        let row = LogInsert(
            userId: userId,
            startTime: iso8601String(startTime),
            duration: duration,
            title: title,
            comment: comment
        )
        try await client.from("logs").insert(row).execute()
    }

    func updateLog(userId: UUID, logId: UUID, title: String?, comment: String?, startTime: Date?, duration: Int?) async throws {
        struct LogPatch: Encodable {
            var title: String?
            var comment: String?
            var start_time: String?
            var duration: Int?
        }
        let p = LogPatch(
            title: title,
            comment: comment,
            start_time: startTime.map { iso8601String($0) },
            duration: duration
        )
        try await client
            .from("logs")
            .update(p)
            .eq("id", value: logId.uuidString)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    func deleteLog(userId: UUID, logId: UUID) async throws {
        try await client
            .from("logs")
            .delete()
            .eq("id", value: logId.uuidString)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    // MARK: Active session

    func fetchActiveSession(userId: UUID) async throws -> ActiveSessionRow? {
        let rows: [ActiveSessionRow] = try await client
            .from("active_sessions")
            .select("current_start_time, current_title, current_comment, tactical_start_time")
            .eq("user_id", value: userId.uuidString)
            .limit(1)
            .execute()
            .value
        return rows.first
    }

    func updateActiveSessionTitle(userId: UUID, title: String) async throws {
        let u = ActiveSessionUpdate(currentTitle: title)
        try await client
            .from("active_sessions")
            .update(u)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    func updateActiveSessionComment(userId: UUID, comment: String) async throws {
        let u = ActiveSessionUpdate(currentComment: comment)
        try await client
            .from("active_sessions")
            .update(u)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    /// Matches web `resetSession`: Idle title, cleared comment, new main + tactical start.
    func resetActiveSession(userId: UUID) async throws {
        let now = Date()
        let iso = iso8601String(now)
        let payload: [String: AnyJSON] = [
            "current_start_time": .string(iso),
            "current_title": .string("Idle"),
            "current_comment": .null,
            "tactical_start_time": .string(iso),
        ]
        try await client
            .from("active_sessions")
            .update(payload)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    func resetTacticalTimer(userId: UUID) async throws {
        let u = ActiveSessionUpdate(tacticalStartTime: iso8601String(Date()))
        try await client
            .from("active_sessions")
            .update(u)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    func updateActiveSessionStartTime(userId: UUID, start: Date) async throws {
        let u = ActiveSessionUpdate(currentStartTime: iso8601String(start))
        try await client
            .from("active_sessions")
            .update(u)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    // MARK: Titles

    func fetchTitles(userId: UUID) async throws -> [TitleRow] {
        try await client
            .from("titles")
            .select("id, name, color")
            .eq("user_id", value: userId.uuidString)
            .order("name")
            .execute()
            .value
    }

    func insertTitle(userId: UUID, name: String, color: String) async throws -> TitleRow? {
        let row = TitleInsert(userId: userId, name: name, color: color)
        do {
            return try await client
                .from("titles")
                .insert(row)
                .select()
                .single()
                .execute()
                .value
        } catch {
            let all = try await fetchTitles(userId: userId)
            if let existing = all.first(where: { $0.name == name }) {
                return existing
            }
            throw error
        }
    }

    func updateTitleColor(userId: UUID, titleId: UUID, color: String) async throws {
        struct C: Encodable { let color: String }
        try await client
            .from("titles")
            .update(C(color: color))
            .eq("id", value: titleId.uuidString)
            .eq("user_id", value: userId.uuidString)
            .execute()
    }

    // MARK: Weekly insights

    func fetchWeeklyInsights(userId: UUID) async throws -> [WeeklyInsightRow] {
        try await client
            .from("weekly_insights")
            .select()
            .eq("user_id", value: userId.uuidString)
            .order("week_start", ascending: false)
            .execute()
            .value
    }

    private func iso8601String(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: date)
    }
}
