import Foundation

/// Shared elapsed-time display for iOS clock UI and watch app (`HH:MM:SS`, zero-padded).
enum StopwatchFormat {
    static func hms(totalSeconds: Int) -> String {
        let s = max(0, totalSeconds)
        let h = s / 3600
        let m = (s % 3600) / 60
        let r = s % 60
        return String(format: "%02d:%02d:%02d", h, m, r)
    }

    /// Compact `MM:SS` for small complications; minutes wrap mod 100 (no hour column).
    static func mmssCompact(totalSeconds: Int) -> String {
        let s = max(0, totalSeconds)
        let minutes = (s / 60) % 100
        let seconds = s % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
}
