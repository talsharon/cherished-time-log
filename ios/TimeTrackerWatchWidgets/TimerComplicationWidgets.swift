import SwiftUI
import WidgetKit

struct TimerEntry: TimelineEntry {
    let date: Date
    let mainText: String
    let tacticalCompact: String
}

struct TimerTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimerEntry {
        TimerEntry(date: .now, mainText: "00:00:00", tacticalCompact: "00:00")
    }

    func getSnapshot(in context: Context, completion: @escaping (TimerEntry) -> Void) {
        completion(makeEntry(for: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimerEntry>) -> Void) {
        let (mainStart, tacticalStart) = TimerSnapshotStorage.load()
        let now = Date()
        var entries: [TimerEntry] = []
        for i in 0 ..< 60 {
            guard let d = Calendar.current.date(byAdding: .second, value: i, to: now) else { continue }
            entries.append(makeEntry(at: d, mainStart: mainStart, tacticalStart: tacticalStart))
        }
        if entries.isEmpty {
            entries.append(makeEntry(at: now, mainStart: mainStart, tacticalStart: tacticalStart))
        }
        let policy = TimelineReloadPolicy.after(entries.last!.date.addingTimeInterval(1))
        completion(Timeline(entries: entries, policy: policy))
    }

    private func makeEntry(for date: Date) -> TimerEntry {
        let (m, t) = TimerSnapshotStorage.load()
        return makeEntry(at: date, mainStart: m, tacticalStart: t)
    }

    private func makeEntry(at date: Date, mainStart: Date?, tacticalStart: Date?) -> TimerEntry {
        let tacRef = tacticalStart ?? mainStart
        let mainSec = mainStart.map { max(0, Int(date.timeIntervalSince($0))) }
        let tacSec = tacRef.map { max(0, Int(date.timeIntervalSince($0))) }

        let mainText = mainSec.map { StopwatchFormat.hms(totalSeconds: $0) } ?? "--:--:--"
        let tacticalCompact = tacSec.map { StopwatchFormat.mmssCompact(totalSeconds: $0) } ?? "--:--"
        return TimerEntry(date: date, mainText: mainText, tacticalCompact: tacticalCompact)
    }
}

private let widgetOpenURL = URL(string: "timetracker://open")!

struct RectangularTimerView: View {
    var entry: TimerEntry

    var body: some View {
        HStack(alignment: .center, spacing: 4) {
            Text(entry.mainText)
                .font(.system(.title3, design: .monospaced))
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            Spacer(minLength: 0)
            Text(entry.tacticalCompact)
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(AppTheme.complicationTacticalPink)
                .minimumScaleFactor(0.65)
                .lineLimit(1)
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
        Text(entry.tacticalCompact)
            .font(tacticalFont)
            .fontWeight(.medium)
            .foregroundStyle(AppTheme.complicationTacticalPink)
            .minimumScaleFactor(minimumTacticalScale)
            .lineLimit(1)
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

@main
struct TimeTrackerWatchWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RectangularTimerWidget()
        CornerTimerWidget()
    }
}
