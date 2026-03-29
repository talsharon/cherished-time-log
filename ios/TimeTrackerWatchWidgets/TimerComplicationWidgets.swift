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
    static let notchCount = 12
    static let notchPeriodSeconds = 900
}

private func categoryFilledNotchCount(at now: Date, mainStart: Date?) -> Int {
    guard let mainStart else { return 0 }
    let elapsed = max(0, Int(now.timeIntervalSince(mainStart)))
    return min(TimerTimelineConstants.notchCount, 1 + (elapsed / TimerTimelineConstants.notchPeriodSeconds))
}

struct TimerTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> TimerEntry {
        TimerEntry(date: .now, mainStart: nil, tacticalStart: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TimerEntry) -> Void) {
        let (m, t, _, _) = TimerSnapshotStorage.load()
        completion(TimerEntry(date: Date(), mainStart: m, tacticalStart: t))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TimerEntry>) -> Void) {
        let (mainStart, tacticalStart, _, _) = TimerSnapshotStorage.load()
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
    let mainStart: Date?
    let titleColor: String
}

struct CategoryTitleTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> CategoryTitleEntry {
        CategoryTitleEntry(date: .now, title: "Idle", mainStart: nil, titleColor: "hsl(0, 0%, 55%)")
    }

    func getSnapshot(in context: Context, completion: @escaping (CategoryTitleEntry) -> Void) {
        let (mainStart, _, title, titleColor) = TimerSnapshotStorage.load()
        completion(CategoryTitleEntry(date: Date(), title: title, mainStart: mainStart, titleColor: titleColor))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CategoryTitleEntry>) -> Void) {
        let (mainStart, _, title, titleColor) = TimerSnapshotStorage.load()
        let now = Date()
        var entries: [CategoryTitleEntry] = [
            CategoryTitleEntry(date: now, title: title, mainStart: mainStart, titleColor: titleColor),
        ]

        if let mainStart {
            let currentFilled = categoryFilledNotchCount(at: now, mainStart: mainStart)
            if currentFilled < TimerTimelineConstants.notchCount {
                for targetFilled in (currentFilled + 1)...TimerTimelineConstants.notchCount {
                    let boundaryDate = mainStart.addingTimeInterval(TimeInterval((targetFilled - 1) * TimerTimelineConstants.notchPeriodSeconds))
                    if boundaryDate > now {
                        entries.append(CategoryTitleEntry(date: boundaryDate, title: title, mainStart: mainStart, titleColor: titleColor))
                    }
                }
            }
        }

        let fallbackReloadDate = Calendar.current.date(byAdding: .minute, value: TimerTimelineConstants.reloadMinutes, to: now)
            ?? now.addingTimeInterval(TimeInterval(TimerTimelineConstants.reloadMinutes * 60))
        let policy: TimelineReloadPolicy
        if let last = entries.last {
            policy = .after(max(last.date.addingTimeInterval(60), fallbackReloadDate))
        } else {
            policy = .after(fallbackReloadDate)
        }
        completion(Timeline(entries: entries, policy: policy))
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

    private var activeNotchColor: Color {
        Color(cssColor: entry.titleColor) ?? AppTheme.accent
    }

    var body: some View {
        GeometryReader { proxy in
            let size = min(proxy.size.width, proxy.size.height)
            let ringInset = size * 0.1
            let radius = (size / 2) - ringInset
            let lineWidth = max(2, size * 0.055)
            let filled = categoryFilledNotchCount(at: entry.date, mainStart: entry.mainStart)
            let slotDegrees = 360.0 / Double(TimerTimelineConstants.notchCount)
            let segmentSweep = 16.0

            ZStack {
                ForEach(0..<filled, id: \.self) { index in
                    let startAngle = Angle(degrees: -90 + (Double(index) * slotDegrees))
                    let endAngle = Angle(degrees: startAngle.degrees + segmentSweep)
                    Path { path in
                        path.addArc(
                            center: CGPoint(x: proxy.size.width / 2, y: proxy.size.height / 2),
                            radius: radius,
                            startAngle: startAngle,
                            endAngle: endAngle,
                            clockwise: false
                        )
                    }
                    .stroke(activeNotchColor, style: StrokeStyle(lineWidth: lineWidth, lineCap: .butt))
                }

                Text(entry.title)
                    .font(.system(.caption2, design: .rounded))
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.45)
                    .padding(size * 0.26)
            }
        }
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
