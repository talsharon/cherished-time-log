import Combine
import Foundation
import WatchConnectivity

/// Relays Watch actions to the iPhone app (single auth + Supabase stack).
final class PhoneSessionManager: NSObject, ObservableObject {
    static let shared = PhoneSessionManager()

    weak var commandHandler: WatchCommandHandler?

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func pushContextToWatch(_ context: [String: Any]) {
        let s = WCSession.default
        guard s.isPaired, s.isWatchAppInstalled else { return }
        do {
            try WCSession.default.updateApplicationContext(context)
        } catch {
            // Best-effort sync
        }
    }
}

extension PhoneSessionManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let action = message[WCConstants.action] as? String else {
            replyHandler([:])
            return
        }
        Task {
            switch action {
            case WCConstants.actionDone:
                await commandHandler?.handleDoneFromWatch()
            case WCConstants.actionResetTactical:
                await commandHandler?.handleResetTacticalFromWatch()
            case WCConstants.actionUpdateTitle:
                if let t = message[WCConstants.title] as? String {
                    await commandHandler?.handleTitleFromWatch(t)
                }
            default:
                break
            }
            await MainActor.run {
                replyHandler(commandHandler?.snapshotForWatch() ?? [:])
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {}
}

/// Implemented by `ClockViewModel` on the main actor.
@MainActor
protocol WatchCommandHandler: AnyObject {
    func handleDoneFromWatch() async
    func handleResetTacticalFromWatch() async
    func handleTitleFromWatch(_ title: String) async
    func snapshotForWatch() -> [String: Any]
}
