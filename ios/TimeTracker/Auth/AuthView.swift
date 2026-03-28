import SwiftUI

struct AuthView: View {
    @ObservedObject var api: TimeTrackerSupabase
    @State private var email = ""
    @State private var password = ""
    @State private var mode: Mode = .signIn
    @State private var busy = false
    @State private var banner: String?

    private enum Mode: String, CaseIterable {
        case signIn = "Sign In"
        case signUp = "Sign Up"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                brandRow

                VStack(alignment: .leading, spacing: 20) {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { m in
                            Text(m.rawValue).tag(m)
                        }
                    }
                    .pickerStyle(.segmented)
                    .tint(AppTheme.accent)

                    VStack(alignment: .leading, spacing: 12) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .textFieldStyle(ThemedTextFieldStyle())
                        SecureField("Password", text: $password)
                            .textContentType(mode == .signIn ? .password : .newPassword)
                            .textFieldStyle(ThemedTextFieldStyle())
                    }

                    if let banner {
                        Text(banner)
                            .font(.footnote)
                            .foregroundStyle(AppTheme.textMuted)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        if busy {
                            ProgressView()
                                .tint(AppTheme.accentForeground)
                                .frame(maxWidth: .infinity, minHeight: 48)
                        } else {
                            Text(mode == .signIn ? "Sign In" : "Sign Up")
                                .font(.headline)
                                .frame(maxWidth: .infinity, minHeight: 48)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(AppTheme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusButtonLarge, style: .continuous))
                    .disabled(busy || email.isEmpty || password.count < 6)
                }
                .padding(20)
                .background(
                    RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                        .fill(AppTheme.secondary.opacity(0.45))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                        .stroke(AppTheme.border.opacity(0.9), lineWidth: 1)
                )
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
        .overlay {
            if busy { ProgressView().scaleEffect(1.2).tint(AppTheme.accent) }
        }
    }

    private var brandRow: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: AppTheme.radiusBrand, style: .continuous)
                    .fill(AppTheme.accent)
                    .frame(width: 52, height: 52)
                Image(systemName: "clock.fill")
                    .font(.title2)
                    .foregroundStyle(AppTheme.accentForeground)
            }
            Text("Time Tracker")
                .font(.title2.weight(.semibold))
                .foregroundStyle(AppTheme.foreground)
        }
        .frame(maxWidth: .infinity)
    }

    private func submit() async {
        busy = true
        banner = nil
        defer { busy = false }
        do {
            if mode == .signIn {
                try await api.signIn(email: email, password: password)
            } else {
                _ = try await api.signUp(email: email, password: password)
                banner = "Check your email to confirm your account if required."
            }
        } catch {
            banner = error.localizedDescription
        }
    }
}
