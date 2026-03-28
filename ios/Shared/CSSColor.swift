import SwiftUI

extension Color {
    /// Parses `#RRGGBB` or `hsl(h, s%, l%)` strings from the database.
    init?(cssColor: String) {
        let t = cssColor.trimmingCharacters(in: .whitespaces)
        if t.hasPrefix("#"), t.count == 7 {
            let s = String(t.dropFirst())
            var n: UInt64 = 0
            guard Scanner(string: s).scanHexInt64(&n) else { return nil }
            let r = Double((n >> 16) & 0xFF) / 255
            let g = Double((n >> 8) & 0xFF) / 255
            let b = Double(n & 0xFF) / 255
            self.init(red: r, green: g, blue: b)
            return
        }
        if t.hasPrefix("hsl("), let c = Self.parseHSLString(t) {
            self = c
            return
        }
        return nil
    }

    private static func parseHSLString(_ raw: String) -> Color? {
        let inner = raw.dropFirst(4).dropLast().replacingOccurrences(of: " ", with: "")
        let parts = inner.split(separator: ",").map(String.init)
        guard parts.count >= 3,
              let h = Double(parts[0]),
              let s = Double(parts[1].replacingOccurrences(of: "%", with: "")),
              let l = Double(parts[2].replacingOccurrences(of: "%", with: "")) else { return nil }
        return Color(hue: h / 360, saturation: s / 100, brightness: l / 100)
    }
}
