import Foundation

struct LogRow: Codable, Identifiable, Hashable {
    let id: UUID
    let userId: UUID
    let startTime: Date
    let duration: Int
    let title: String
    let comment: String?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case startTime = "start_time"
        case duration
        case title
        case comment
        case createdAt = "created_at"
    }
}

struct LogInsert: Encodable {
    let userId: UUID
    let startTime: String
    let duration: Int
    let title: String
    let comment: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case startTime = "start_time"
        case duration
        case title
        case comment
    }
}

struct LogUpdate: Encodable {
    var title: String?
    var comment: String?
    var startTime: String?
    var duration: Int?
}

struct TitleRow: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let color: String
}

struct TitleInsert: Encodable {
    let userId: UUID
    let name: String
    let color: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case name
        case color
    }
}

struct ActiveSessionRow: Codable {
    let currentStartTime: Date
    let currentTitle: String
    let currentComment: String?
    let tacticalStartTime: Date?

    enum CodingKeys: String, CodingKey {
        case currentStartTime = "current_start_time"
        case currentTitle = "current_title"
        case currentComment = "current_comment"
        case tacticalStartTime = "tactical_start_time"
    }
}

struct ActiveSessionUpdate: Encodable {
    var currentStartTime: String?
    var currentTitle: String?
    var currentComment: String?
    var tacticalStartTime: String?

    enum CodingKeys: String, CodingKey {
        case currentStartTime = "current_start_time"
        case currentTitle = "current_title"
        case currentComment = "current_comment"
        case tacticalStartTime = "tactical_start_time"
    }
}

struct WeeklyInsightRow: Identifiable, Decodable {
    let id: UUID
    let userId: UUID
    let weekStart: String
    let weekEnd: String
    let summary: String
    let insights: String
    let recommendations: String
    let graphs: [InsightGraph]
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case weekStart = "week_start"
        case weekEnd = "week_end"
        case summary
        case insights
        case recommendations
        case graphs
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        userId = try c.decode(UUID.self, forKey: .userId)
        weekStart = try c.decode(String.self, forKey: .weekStart)
        weekEnd = try c.decode(String.self, forKey: .weekEnd)
        summary = try c.decode(String.self, forKey: .summary)
        insights = try c.decode(String.self, forKey: .insights)
        recommendations = try c.decode(String.self, forKey: .recommendations)
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        if let graphsArray = try? c.decode([InsightGraph].self, forKey: .graphs) {
            graphs = graphsArray
        } else {
            graphs = []
        }
    }
}

struct InsightGraph: Codable, Hashable {
    let title: String
    let type: String
    let data: [GraphDataPoint]
}

struct GraphDataPoint: Codable, Hashable {
    let name: String
    let value: Double
    let date: String?
}

struct GenerateInsightsResponse: Decodable {
    let success: Bool?
    let weekStart: String?
    let weekEnd: String?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case weekStart = "week_start"
        case weekEnd = "week_end"
        case error
    }

    init(success: Bool?, weekStart: String?, weekEnd: String?, error: String?) {
        self.success = success
        self.weekStart = weekStart
        self.weekEnd = weekEnd
        self.error = error
    }
}
