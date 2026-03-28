import Combine
import Foundation
import WatchConnectivity

@MainActor
final class WatchConnectivityModel: NSObject, ObservableObject {
    @Published var currentTitle: String = "Idle"
    @Published var mainStart: Date?
    @Published var tacticalStart: Date?
    @Published var titles: [String] = ["Idle"]
    @Published var reachable = false
    @Published var lastError: String?

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func applyContext(_ dict: [String: Any]) {
        if let t = dict[WCConstants.stateTitle] as? String {
            currentTitle = t
        }
        if let ts = dict[WCConstants.stateMainStart] as? TimeInterval {
            mainStart = Date(timeIntervalSince1970: ts)
        }
        if let ts = dict[WCConstants.stateTacticalStart] as? TimeInterval {
            tacticalStart = Date(timeIntervalSince1970: ts)
        }
        if let arr = dict["titles"] as? [String], !arr.isEmpty {
            titles = arr
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
                    self.applyContext(reply)
                }
            }, errorHandler: { err in
                Task { @MainActor in
                    self.lastError = err.localizedDescription
                }
            })
        } else {
            lastError = "Open Time Tracker on iPhone"
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
            applyContext(session.receivedApplicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            applyContext(applicationContext)
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in
            reachable = session.isReachable
        }
    }
}
