import Foundation

enum AppConfig {
    static var supabaseURL: URL? {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "SupabaseURL") as? String,
              let url = URL(string: s),
              !s.contains("placeholder"),
              !s.contains("YOUR_PROJECT") else { return nil }
        return url
    }

    static var supabaseAnonKey: String? {
        guard let k = Bundle.main.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
              !k.isEmpty,
              k != "placeholder",
              !k.contains("your_anon") else { return nil }
        return k
    }

    static var isConfigured: Bool {
        supabaseURL != nil && supabaseAnonKey != nil
    }
}
