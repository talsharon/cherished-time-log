import SwiftUI

struct WatchContentView: View {
    @EnvironmentObject private var wc: WatchConnectivityModel
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack(alignment: .topLeading) {
            VStack(spacing: 8) {
                TimelineView(.periodic(from: .now, by: 1)) { timeline in
                    let now = timeline.date
                    let main = wc.mainStart.map { Int(now.timeIntervalSince($0)) } ?? 0
                    let tac = (wc.tacticalStart ?? wc.mainStart).map { Int(now.timeIntervalSince($0)) } ?? 0
                    let tacticalResetSize: CGFloat = 44
                    let tacticalSpacing: CGFloat = 6
                    VStack(spacing: 4) {
                        HStack(alignment: .center, spacing: tacticalSpacing) {
                            Text(StopwatchFormat.hms(totalSeconds: tac))
                                .font(.caption.monospacedDigit())
                                .foregroundStyle(AppTheme.textMuted)
                            Button {
                                wc.send(WCConstants.actionResetTactical)
                            } label: {
                                Image(systemName: "arrow.counterclockwise")
                                    .font(.title3.weight(.semibold))
                                    .foregroundStyle(AppTheme.textMuted)
                                    .frame(width: tacticalResetSize, height: tacticalResetSize)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Reset tactical timer")
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .offset(x: (tacticalSpacing + tacticalResetSize) / 2)

                        Text(StopwatchFormat.hms(totalSeconds: main))
                            .font(.title2.monospacedDigit().weight(.medium))
                            .foregroundStyle(AppTheme.foreground)
                    }
                }

                Picker("Title", selection: Binding(
                    get: { wc.pickerTitle },
                    set: { wc.setPickerTitleDebounced($0) }
                )) {
                    ForEach(wc.titles, id: \.self) { title in
                        Text(title)
                            .font(.caption)
                            .tag(title)
                    }
                }
                .pickerStyle(.wheel)
                .frame(height: 38)
                .clipped()
                .labelsHidden()
                .tint(AppTheme.accent)

                Spacer(minLength: 0)

                Button("DONE") {
                    wc.send(WCConstants.actionDone)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 4)
            .padding(.top, 10)
            .padding(.bottom, 6)

            if wc.showPhoneConnectionHint {
                Button {
                    // Visual hint only; reachability recovers when the iPhone app is active.
                } label: {
                    Image(systemName: "iphone.slash")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.red)
                        .padding(6)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Open Time Tracker on iPhone")
                .padding(.leading, 2)
                .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                WatchComplicationKind.reloadTimelines()
            }
        }
    }

}
