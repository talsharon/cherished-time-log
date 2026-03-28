import Foundation

enum InsightsServiceError: LocalizedError {
    case notConfigured
    case notSignedIn
    case server(String)
    case decoding

    var errorDescription: String? {
        switch self {
        case .notConfigured: return "Supabase URL missing"
        case .notSignedIn: return "Not signed in"
        case .server(let m): return m
        case .decoding: return "Invalid response"
        }
    }
}

/// POST `/functions/v1/generate-insights` with user JWT (same as web `useGenerateInsights`).
struct InsightsService {
    let baseURL: URL

    func generateWeeklyInsights(accessToken: String) async throws -> GenerateInsightsResponse {
        let url = baseURL.appendingPathComponent("functions/v1/generate-insights")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        req.httpBody = Data("{}".utf8)

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw InsightsServiceError.decoding }

        let decoded = try? JSONDecoder().decode(GenerateInsightsResponse.self, from: data)
        if (200 ... 299).contains(http.statusCode) {
            return decoded ?? GenerateInsightsResponse(success: true, weekStart: nil, weekEnd: nil, error: nil)
        }
        let message = decoded?.error ?? String(data: data, encoding: .utf8) ?? "Request failed"
        throw InsightsServiceError.server(message)
    }
}
