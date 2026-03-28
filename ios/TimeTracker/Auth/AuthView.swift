import SwiftUI

struct AuthView: View {
    @ObservedObject var api: TimeTrackerSupabase
    @State private var email = ""
    @State private var password = ""
    @State private var mode: Mode = .signIn
    @State private var busy = false
    @State private var banner: String?

    private enum Mode {
        case signIn, signUp
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    SecureField("Password", text: $password)
                        .textContentType(mode == .signIn ? .password : .newPassword)
                }
                if let banner {
                    Section {
                        Text(banner)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
                Section {
                    Button(mode == .signIn ? "Sign In" : "Sign Up") {
                        Task { await submit() }
                    }
                    .disabled(busy || email.isEmpty || password.count < 6)
                    Button(mode == .signIn ? "Need an account? Sign Up" : "Have an account? Sign In") {
                        mode = mode == .signIn ? .signUp : .signIn
                        banner = nil
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Time Tracker")
            .overlay {
                if busy { ProgressView().scaleEffect(1.2) }
            }
        }
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
