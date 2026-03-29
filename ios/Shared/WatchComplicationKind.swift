import WidgetKit

/// Widget `kind` strings for watch complications; keep in sync with `TimerComplicationWidgets`.
enum WatchComplicationKind {
    static let rectangularTimer = "TimeTrackerRectangularTimer"
    static let tacticalTimer = "TimeTrackerCornerTimer"
    static let categoryTitleCircular = "TimeTrackerCategoryTitle"

    private static var all: [String] {
        [rectangularTimer, tacticalTimer, categoryTitleCircular]
    }

    /// Ask WidgetKit to reload timelines after App Group snapshot changes.
    static func reloadTimelines() {
        for kind in all {
            WidgetCenter.shared.reloadTimelines(ofKind: kind)
        }
    }
}
