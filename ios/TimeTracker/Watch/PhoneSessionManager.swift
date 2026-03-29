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
        #if targetEnvironment(simulator)
        // Simulator often reports isWatchAppInstalled == false even with a paired watch sim; still push context for dev.
        guard s.activationState == .activated else { return }
        #else
        guard s.isPaired, s.isWatchAppInstalled else { return }
        #endif
        do {
            try WCSession.default.updateApplicationContext(context)
        } catch {
            // Best-effort sync
        }
        #if targetEnvironment(simulator)
        // Application context delivery is flaky between simulators; push over the interactive channel when possible.
        if s.isReachable {
            s.sendMessage(context, replyHandler: { _ in }, errorHandler: { _ in })
        }
        #endif
    }

    /// Re-push after activation or reachability changes so early syncs (before `.activated`) are not lost.
    private func replayLatestContextToWatch() {
        Task { @MainActor in
            guard let handler = commandHandler else { return }
            pushContextToWatch(handler.snapshotForWatch())
        }
    }
}

extension PhoneSessionManager: WCSessionDelegate {
    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        guard activationState == .activated, error == nil else { return }
        replayLatestContextToWatch()
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        #if targetEnvironment(simulator)
        guard session.activationState == .activated, session.isReachable else { return }
        replayLatestContextToWatch()
        #endif
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
