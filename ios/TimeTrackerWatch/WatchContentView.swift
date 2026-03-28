import SwiftUI

struct WatchContentView: View {
    @EnvironmentObject private var wc: WatchConnectivityModel

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if let err = wc.lastError {
                    Text(err)
                        .font(.caption2)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                TimelineView(.periodic(from: .now, by: 1)) { timeline in
                    let now = timeline.date
                    let main = wc.mainStart.map { Int(now.timeIntervalSince($0)) } ?? 0
                    let tac = (wc.tacticalStart ?? wc.mainStart).map { Int(now.timeIntervalSince($0)) } ?? 0
                    VStack(spacing: 4) {
                        Text(formatHMS(tac))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                        Text(formatHMS(main))
                            .font(.title3.monospacedDigit())
                    }
                }

                Text(wc.currentTitle)
                    .font(.headline)
                    .multilineTextAlignment(.center)

                Picker("Title", selection: Binding(
                    get: { wc.currentTitle },
                    set: { wc.send(WCConstants.actionUpdateTitle, title: $0) }
                )) {
                    ForEach(wc.titles, id: \.self) { Text($0).tag($0) }
                }
                .labelsHidden()

                Button("DONE") {
                    wc.send(WCConstants.actionDone)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)

                Button("Reset tactical") {
                    wc.send(WCConstants.actionResetTactical)
                }
                .buttonStyle(.bordered)
            }
            .padding(.vertical, 4)
        }
    }

    private func formatHMS(_ total: Int) -> String {
        let s = max(0, total)
        let h = s / 3600
        let m = (s % 3600) / 60
        let r = s % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, r) }
        return String(format: "%d:%02d", m, r)
    }
}
