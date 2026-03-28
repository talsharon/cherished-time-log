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
                    .foregroundStyle(AppTheme.foreground)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
    }
}

private struct MissingConfigView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Supabase not configured")
                .font(.headline)
                .foregroundStyle(AppTheme.foreground)
            Text("Copy ios/Config/Secrets.xcconfig.example to Secrets.xcconfig and set SUPABASE_URL and SUPABASE_ANON_KEY.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.textMuted)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
    }
}

private struct AuthenticatedRoot: View {
    @ObservedObject var api: TimeTrackerSupabase

    var body: some View {
        Group {
            if api.authLoading {
                ProgressView("Loading…")
                    .tint(AppTheme.accent)
            } else if api.session == nil {
                AuthView(api: api)
            } else {
                MainTabView(api: api)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
    }
}
