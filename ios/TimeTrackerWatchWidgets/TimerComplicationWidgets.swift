import SwiftUI
import WidgetKit

struct TimerEntry: TimelineEntry {
    let date: Date
    let mainStart: Date?
    let tacticalStart: Date?
}

/// Upper bound for `Text(timerInterval:)` so the interval stays open-ended for a running stopwatch.
private func stopwatchInterval(from start: Date) -> ClosedRange<Date> {
    let end = Calendar.current.date(byAdding: .year, value: 10, to: start) ?? start.addingTimeInterval(3600 * 24 * 365)
    return start...end
}

private enum TimerTimelineConstants {
    static let reloadMinutes = 30
}

struct TimerTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimerEntry {
        TimerEntry(date: .now, mainStart: nil, tacticalStart: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TimerEntry) -> Void) {
        let (m, t, _) = TimerSnapshotStorage.load()
        completion(TimerEntry(date: Date(), mainStart: m, tacticalStart: t))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimerEntry>) -> Void) {
        let (mainStart, tacticalStart, _) = TimerSnapshotStorage.load()
        let now = Date()
        let entry = TimerEntry(date: now, mainStart: mainStart, tacticalStart: tacticalStart)
        let reloadDate = Calendar.current.date(byAdding: .minute, value: TimerTimelineConstants.reloadMinutes, to: now)
            ?? now.addingTimeInterval(TimeInterval(TimerTimelineConstants.reloadMinutes * 60))
        let policy = TimelineReloadPolicy.after(reloadDate)
        completion(Timeline(entries: [entry], policy: policy))
    }
}

// MARK: - Category title (small circular)

struct CategoryTitleEntry: TimelineEntry {
    let date: Date
    let title: String
}

struct CategoryTitleTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> CategoryTitleEntry {
        CategoryTitleEntry(date: .now, title: "Idle")
    }

    func getSnapshot(in context: Context, completion: @escaping (CategoryTitleEntry) -> Void) {
        let (_, _, title) = TimerSnapshotStorage.load()
        completion(CategoryTitleEntry(date: Date(), title: title))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CategoryTitleEntry>) -> Void) {
        let (_, _, title) = TimerSnapshotStorage.load()
        let now = Date()
        let entry = CategoryTitleEntry(date: now, title: title)
        let reloadDate = Calendar.current.date(byAdding: .minute, value: TimerTimelineConstants.reloadMinutes, to: now)
            ?? now.addingTimeInterval(TimeInterval(TimerTimelineConstants.reloadMinutes * 60))
        completion(Timeline(entries: [entry], policy: TimelineReloadPolicy.after(reloadDate)))
    }
}

private let widgetOpenURL = URL(string: "timetracker://open")!

struct RectangularTimerView: View {
    var entry: TimerEntry

    var body: some View {
        HStack(alignment: .center, spacing: 4) {
            if let main = entry.mainStart {
                Text(timerInterval: stopwatchInterval(from: main), pauseTime: nil, countsDown: false)
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
            } else {
                Text("--:--:--")
                    .font(.system(.title3, design: .monospaced))
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            if let tac = entry.tacticalStart ?? entry.mainStart {
                Text(timerInterval: stopwatchInterval(from: tac), pauseTime: nil, countsDown: false)
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(AppTheme.complicationTacticalPink)
                    .minimumScaleFactor(0.65)
                    .lineLimit(1)
            } else {
                Text("--:--")
                    .font(.system(.caption2, design: .monospaced))
                    .foregroundStyle(AppTheme.complicationTacticalPink)
                    .minimumScaleFactor(0.65)
                    .lineLimit(1)
            }
        }
        .widgetURL(widgetOpenURL)
    }
}

struct CornerTimerView: View {
    var entry: TimerEntry
    @Environment(\.widgetFamily) private var family

    private var tacticalFont: Font {
        switch family {
        case .accessoryInline:
            return .system(.caption2, design: .monospaced)
        case .accessoryCircular, .accessoryCorner:
            return .system(.caption, design: .monospaced)
        default:
            return .system(.caption, design: .monospaced)
        }
    }

    private var minimumTacticalScale: CGFloat {
        switch family {
        case .accessoryInline: return 0.4
        case .accessoryCircular: return 0.4
        default: return 0.45
        }
    }

    var body: some View {
        Group {
            if let tac = entry.tacticalStart ?? entry.mainStart {
                Text(timerInterval: stopwatchInterval(from: tac), pauseTime: nil, countsDown: false)
                    .font(tacticalFont)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.complicationTacticalPink)
                    .minimumScaleFactor(minimumTacticalScale)
                    .lineLimit(1)
            } else {
                Text("--:--")
                    .font(tacticalFont)
                    .fontWeight(.medium)
                    .foregroundStyle(AppTheme.complicationTacticalPink)
                    .minimumScaleFactor(minimumTacticalScale)
                    .lineLimit(1)
            }
        }
        .widgetURL(widgetOpenURL)
    }
}

struct CategoryTitleCircularView: View {
    var entry: CategoryTitleEntry

    var body: some View {
        Text(entry.title)
            .font(.system(.caption, design: .rounded))
            .fontWeight(.semibold)
            .foregroundStyle(.primary)
            .multilineTextAlignment(.center)
            .minimumScaleFactor(0.35)
            .lineLimit(3)
            .widgetURL(widgetOpenURL)
    }
}

struct RectangularTimerWidget: Widget {
    let kind: String = WatchComplicationKind.rectangularTimer

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TimerTimelineProvider()) { entry in
            RectangularTimerView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .supportedFamilies([.accessoryRectangular])
        .configurationDisplayName("Timers")
        .description("Main and tactical elapsed time.")
    }
}

struct CornerTimerWidget: Widget {
    let kind: String = WatchComplicationKind.tacticalTimer

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TimerTimelineProvider()) { entry in
            CornerTimerView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .supportedFamilies([
            .accessoryCorner,
            .accessoryCircular,
            .accessoryInline,
        ])
        .configurationDisplayName("Tactical")
        .description("Tactical timer for corner, circular, and inline slots.")
    }
}

struct CategoryTitleWidget: Widget {
    let kind: String = WatchComplicationKind.categoryTitleCircular

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CategoryTitleTimelineProvider()) { entry in
            CategoryTitleCircularView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .supportedFamilies([.accessoryCircular])
        .configurationDisplayName("Category")
        .description("Current session category title.")
    }
}

@main
struct TimeTrackerWatchWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RectangularTimerWidget()
        CornerTimerWidget()
        CategoryTitleWidget()
    }
}
