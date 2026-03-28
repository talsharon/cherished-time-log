import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if !AppConfig.isConfigured {
                MissingConfigView()
            } else if let api = appState.supabase {
                AuthenticatedRoot(api: api)
            } else {
                Text("Failed to initialize")
            }
        }
    }
}

private struct MissingConfigView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Supabase not configured")
                .font(.headline)
            Text("Copy ios/Config/Secrets.xcconfig.example to Secrets.xcconfig and set SUPABASE_URL and SUPABASE_ANON_KEY.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct AuthenticatedRoot: View {
    @ObservedObject var api: TimeTrackerSupabase

    var body: some View {
        Group {
            if api.authLoading {
                ProgressView("Loading…")
            } else if api.session == nil {
                AuthView(api: api)
            } else {
                MainTabView(api: api)
            }
        }
    }
}
