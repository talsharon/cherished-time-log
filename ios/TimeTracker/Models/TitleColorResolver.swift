import SwiftUI

enum TitleColorResolver {
    static func color(for title: String, titles: [TitleRow]) -> Color {
        if let t = titles.first(where: { $0.name == title }) {
            return Color(cssColor: t.color) ?? AppTheme.textMuted
        }
        return AppTheme.textMuted
    }
}
