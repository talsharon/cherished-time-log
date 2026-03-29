import Combine
import Foundation
import WatchConnectivity

@MainActor
final class WatchConnectivityModel: NSObject, ObservableObject {
    @Published var currentTitle: String = "Idle"
    /// Wheel updates immediately; phone sync runs after the crown stops (debounced).
    @Published var pickerTitle: String = "Idle"
    @Published var mainStart: Date?
    @Published var tacticalStart: Date?
    @Published var titles: [String] = ["Idle"]
    @Published var reachable = false
    @Published var lastError: String?
    /// Shown when the user triggers an action while the iPhone app is not reachable.
    @Published var showPhoneConnectionHint = false

    private var titleCommitTask: Task<Void, Never>?
    private static let titleCommitDebounceNs: UInt64 = 400_000_000

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func applyContext(_ dict: [String: Any]) {
        if let t = dict[WCConstants.stateTitle] as? String {
            titleCommitTask?.cancel()
            titleCommitTask = nil
            currentTitle = t
            pickerTitle = t
        }
        // Only merge timer anchors from a real phone snapshot (`snapshotForWatch` always
        // includes `stateTitle`). Empty `[:]` fallback replies must not wipe timers.
        if dict[WCConstants.stateTitle] as? String != nil {
            mainStart = Self.date(fromPlistValue: dict[WCConstants.stateMainStart])
            tacticalStart = Self.date(fromPlistValue: dict[WCConstants.stateTacticalStart])
        }
        let currentTitleColor = (dict[WCConstants.stateTitleColor] as? String) ?? "hsl(0, 0%, 55%)"
        if let arr = dict["titles"] as? [String], !arr.isEmpty {
            titles = arr
        }
        TimerSnapshotStorage.persist(
            mainStart: mainStart,
            tacticalStart: tacticalStart,
            currentTitle: currentTitle,
            currentTitleColor: currentTitleColor
        )
        WatchComplicationKind.reloadTimelines()
    }

    private static func date(fromPlistValue value: Any?) -> Date? {
        guard let value else { return nil }
        if let t = value as? TimeInterval {
            return Date(timeIntervalSince1970: t)
        }
        if let i = value as? Int {
            return Date(timeIntervalSince1970: TimeInterval(i))
        }
        if let n = value as? NSNumber {
            return Date(timeIntervalSince1970: n.doubleValue)
        }
        return nil
    }

    func setPickerTitleDebounced(_ title: String) {
        pickerTitle = title
        titleCommitTask?.cancel()
        let pending = title
        titleCommitTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: Self.titleCommitDebounceNs)
            guard !Task.isCancelled else { return }
            send(WCConstants.actionUpdateTitle, title: pending)
        }
    }

    func send(_ action: String, title: String? = nil) {
        guard WCSession.default.activationState == .activated else { return }
        var msg: [String: Any] = [WCConstants.action: action]
        if let title {
            msg[WCConstants.title] = title
        }
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(msg, replyHandler: { reply in
                Task { @MainActor in
                    self.showPhoneConnectionHint = false
                    self.applyContext(reply)
                }
            }, errorHandler: { err in
                Task { @MainActor in
                    self.lastError = err.localizedDescription
                }
            })
        } else {
            showPhoneConnectionHint = true
        }
    }
}

extension WatchConnectivityModel: WCSessionDelegate {
    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        Task { @MainActor in
            if let error {
                lastError = error.localizedDescription
            }
            reachable = session.isReachable
            if session.isReachable {
                showPhoneConnectionHint = false
            }
            applyContext(session.receivedApplicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            applyContext(applicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        Task { @MainActor in
            applyContext(message)
            replyHandler([:])
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            reachable = session.isReachable
            if session.isReachable {
                showPhoneConnectionHint = false
            }
        }
    }
}
