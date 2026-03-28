import SwiftUI

/// Matches Lovable web tokens from `src/index.css` (:root HSL).
enum AppTheme {
    static let radiusCard: CGFloat = 12
    static let radiusButtonLarge: CGFloat = 12
    static let radiusBrand: CGFloat = 16

    static let background = Color(hsl: 222.2, 84, 4.9)
    static let foreground = Color(hsl: 210, 40, 98)
    static let accent = Color(hsl: 142, 76, 36)
    static let accentForeground = Color(hsl: 210, 40, 98)
    static let textMuted = Color(hsl: 215, 20.2, 65.1)
    static let secondary = Color(hsl: 217.2, 32.6, 17.5)
    static let border = Color(hsl: 217.2, 32.6, 17.5)
    static let destructive = Color(hsl: 0, 62.8, 30.6)
    static let card = Color(hsl: 222.2, 84, 4.9)

    static var surfaceSecondary: Color {
        secondary.opacity(0.5)
    }

    static var surfaceGap: Color {
        secondary.opacity(0.3)
    }
}

extension Color {
    init(hsl hue: Double, _ saturation: Double, _ lightness: Double, opacity: Double = 1) {
        let h = hue / 360.0
        let s = min(max(saturation / 100.0, 0), 1)
        let l = min(max(lightness / 100.0, 0), 1)
        let t2 = l < 0.5 ? l * (1 + s) : l + s - l * s
        let t1 = 2 * l - t2
        func channel(_ x: Double) -> Double {
            var v = x
            if v < 0 { v += 1 }
            if v > 1 { v -= 1 }
            if 6 * v < 1 { return t1 + (t2 - t1) * 6 * v }
            if 2 * v < 1 { return t2 }
            if 3 * v < 2 { return t1 + (t2 - t1) * (2.0 / 3.0 - v) * 6 }
            return t1
        }
        let r = channel(h + 1.0 / 3.0)
        let g = channel(h)
        let b = channel(h - 1.0 / 3.0)
        self.init(red: r, green: g, blue: b, opacity: opacity)
    }
}

#if os(iOS)
struct ThemedTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 12)
            .frame(minHeight: 48)
            .background(AppTheme.secondary.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                    .stroke(AppTheme.border.opacity(0.8), lineWidth: 1)
            )
            .foregroundStyle(AppTheme.foreground)
    }
}
#endif
