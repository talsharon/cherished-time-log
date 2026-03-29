import Foundation

/// Persists main / tactical timer anchors and session title for the WidgetKit complication extension (App Group).
enum TimerSnapshotStorage {
    static let appGroupId = "group.com.talsharon.TimeTracker"

    private enum Key {
        static let mainStart = "timerSnapshot.mainStart"
        static let tacticalStart = "timerSnapshot.tacticalStart"
        static let currentTitle = "timerSnapshot.currentTitle"
    }

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func persist(mainStart: Date?, tacticalStart: Date?, currentTitle: String) {
        guard let d = defaults else { return }
        if let mainStart {
            d.set(mainStart.timeIntervalSince1970, forKey: Key.mainStart)
        } else {
            d.removeObject(forKey: Key.mainStart)
        }
        if let tacticalStart {
            d.set(tacticalStart.timeIntervalSince1970, forKey: Key.tacticalStart)
        } else {
            d.removeObject(forKey: Key.tacticalStart)
        }
        d.set(currentTitle, forKey: Key.currentTitle)
    }

    static func load() -> (mainStart: Date?, tacticalStart: Date?, currentTitle: String) {
        guard let d = defaults else { return (nil, nil, "Idle") }
        let main: Date? = d.object(forKey: Key.mainStart) != nil
            ? Date(timeIntervalSince1970: d.double(forKey: Key.mainStart))
            : nil
        let tactical: Date? = d.object(forKey: Key.tacticalStart) != nil
            ? Date(timeIntervalSince1970: d.double(forKey: Key.tacticalStart))
            : nil
        let title = d.string(forKey: Key.currentTitle) ?? "Idle"
        return (main, tactical, title)
    }
}
