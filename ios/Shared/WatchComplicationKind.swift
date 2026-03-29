import WidgetKit

/// Widget `kind` strings for watch complications; keep in sync with `TimerComplicationWidgets`.
enum WatchComplicationKind {
    static let rectangularTimer = "TimeTrackerRectangularTimer"
    static let tacticalTimer = "TimeTrackerCornerTimer"

    private static var all: [String] {
        [rectangularTimer, tacticalTimer]
    }

    /// Ask WidgetKit to reload timelines after App Group snapshot changes.
    static func reloadTimelines() {
        for kind in all {
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
        }
    }
}
