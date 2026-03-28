import SwiftUI
import UIKit

/// Solid circle images for use in `Menu` / `UIMenu` rows. SwiftUI `Shape` labels are often stripped there.
enum TitleDotUIImage {
    static func dotImage(color: Color, diameter: CGFloat = 12) -> UIImage {
        let uiColor = UIColor(color)
        let size = CGSize(width: diameter, height: diameter)
        let format = UIGraphicsImageRendererFormat()
        format.scale = UIScreen.main.scale
        format.opaque = false
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            uiColor.setFill()
            UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).fill()
        }
    }
}
