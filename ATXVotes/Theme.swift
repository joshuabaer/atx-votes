import SwiftUI
import UIKit

enum Theme {
    // Austin-inspired palette — adaptive light/dark
    static let primary = Color("AccentColor", bundle: nil)

    static let primaryBlue = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.40, green: 0.60, blue: 0.85, alpha: 1)
            : UIColor(red: 0.13, green: 0.35, blue: 0.56, alpha: 1)
    })

    static let accentGold = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.95, green: 0.75, blue: 0.25, alpha: 1)
            : UIColor(red: 0.85, green: 0.65, blue: 0.13, alpha: 1)
    })

    static let backgroundCream = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1)
            : UIColor(red: 0.98, green: 0.97, blue: 0.94, alpha: 1)
    })

    static let cardBackground = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.17, green: 0.17, blue: 0.18, alpha: 1)
            : UIColor.white
    })

    static let textPrimary = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.93, green: 0.93, blue: 0.94, alpha: 1)
            : UIColor(red: 0.12, green: 0.12, blue: 0.14, alpha: 1)
    })

    static let textSecondary = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.60, green: 0.60, blue: 0.65, alpha: 1)
            : UIColor(red: 0.45, green: 0.45, blue: 0.50, alpha: 1)
    })

    static let success = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.30, green: 0.78, blue: 0.42, alpha: 1)
            : UIColor(red: 0.20, green: 0.65, blue: 0.32, alpha: 1)
    })

    static let warning = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 1.00, green: 0.65, blue: 0.20, alpha: 1)
            : UIColor(red: 0.90, green: 0.55, blue: 0.10, alpha: 1)
    })

    static let danger = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 1.00, green: 0.35, blue: 0.35, alpha: 1)
            : UIColor(red: 0.82, green: 0.20, blue: 0.20, alpha: 1)
    })

    // Party colors
    static let republican = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 1.00, green: 0.30, blue: 0.30, alpha: 1)
            : UIColor(red: 0.85, green: 0.15, blue: 0.15, alpha: 1)
    })

    static let democrat = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.35, green: 0.50, blue: 0.95, alpha: 1)
            : UIColor(red: 0.15, green: 0.30, blue: 0.75, alpha: 1)
    })

    // Semantic colors for borders, fills, and shadows
    static let border = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.15)
            : UIColor(white: 0.5, alpha: 0.15)
    })

    static let borderStrong = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.20)
            : UIColor(white: 0.5, alpha: 0.25)
    })

    static let fillTertiary = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.08)
            : UIColor(white: 0.5, alpha: 0.08)
    })

    static let fillDisabled = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.08)
            : UIColor(white: 0.5, alpha: 0.05)
    })

    static let shadow = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 0, alpha: 0.30)
            : UIColor(white: 0, alpha: 0.06)
    })

    static let shadowStrong = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 0, alpha: 0.45)
            : UIColor(white: 0, alpha: 0.15)
    })

    static let progressTrack = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.15)
            : UIColor(white: 0.5, alpha: 0.15)
    })

    // Typography — Semantic text styles for Dynamic Type scaling
    static let largeTitle: Font = .system(.largeTitle, design: .rounded, weight: .bold)
    static let title: Font = .system(.title, design: .rounded, weight: .bold)
    static let title2: Font = .system(.title2, design: .rounded, weight: .semibold)
    static let headline: Font = .system(.headline, weight: .semibold)
    static let body: Font = .system(.body)
    static let callout: Font = .system(.callout)
    static let caption: Font = .system(.caption)

    // Spacing
    static let paddingSmall: CGFloat = 8
    static let paddingMedium: CGFloat = 16
    static let paddingLarge: CGFloat = 24
    static let cornerRadius: CGFloat = 16
    static let cornerRadiusSmall: CGFloat = 10
}

// MARK: - Reusable Components

struct CardModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Theme.paddingMedium)
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .shadow(color: Theme.shadow, radius: 8, x: 0, y: 2)
    }
}

extension View {
    func card() -> some View {
        modifier(CardModifier())
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.headline)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.primaryBlue)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.headline)
            .foregroundColor(Theme.primaryBlue)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Theme.primaryBlue.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .opacity(configuration.isPressed ? 0.7 : 1.0)
    }
}

struct ChoiceChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(Theme.callout)
                .foregroundColor(isSelected ? .white : Theme.textPrimary)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(isSelected ? Theme.primaryBlue : Theme.fillTertiary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .strokeBorder(isSelected ? Theme.primaryBlue : Theme.borderStrong, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

struct StarBadge: View {
    var body: some View {
        Image(systemName: "star.fill")
            .font(.caption2)
            .foregroundColor(Theme.accentGold)
            .padding(4)
            .background(Theme.accentGold.opacity(0.15))
            .clipShape(Circle())
            .accessibilityLabel(String(localized: "Key race"))
    }
}

// MARK: - Disclaimer Banner

struct DisclaimerBanner: View {
    var onDismiss: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(Theme.warning)
                .font(.title3)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text("AI-Generated Recommendations")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(Theme.textPrimary)
                Text("These recommendations are generated by AI based on your stated values. They may contain errors. Always do your own research before voting.")
                    .font(Theme.caption)
                    .foregroundColor(Theme.textSecondary)
            }

            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textSecondary)
                        .padding(4)
                }
                .accessibilityLabel("Dismiss disclaimer")
            }
        }
        .accessibilityElement(children: .combine)
        .padding(12)
        .background(Theme.warning.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                .strokeBorder(Theme.warning.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Party Switcher

struct PartySwitcher: View {
    @Binding var selectedParty: PrimaryBallot

    var body: some View {
        HStack(spacing: 12) {
            partyButton(
                party: .republican,
                label: String(localized: "Republican"),
                emoji: "\u{1F418}",
                color: Theme.republican
            )
            partyButton(
                party: .democrat,
                label: String(localized: "Democrat"),
                emoji: "\u{1FACF}",
                color: Theme.democrat
            )
        }
    }

    private func partyButton(party: PrimaryBallot, label: String, emoji: String, color: Color) -> some View {
        let isSelected = selectedParty == party

        return Button {
            withAnimation(.spring(response: 0.3)) {
                selectedParty = party
            }
        } label: {
            HStack(spacing: 8) {
                Text(emoji)
                    .font(.system(size: 28))
                Text(label)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundColor(isSelected ? .white : color)
            .background(isSelected ? color : color.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                    .strokeBorder(color.opacity(isSelected ? 0 : 0.3), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? color.opacity(0.3) : .clear, radius: 6, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(label) primary")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Feedback

enum FeedbackHelper {
    static let email = "feedback@atxvotes.app"
    static let subject = "ATX Votes Feedback"

    static var mailtoURL: URL? {
        let subject = subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? subject
        return URL(string: "mailto:\(email)?subject=\(subject)")
    }
}

struct RecommendationBadge: View {
    enum Style { case recommended, leanYes, leanNo, yourCall }

    let style: Style

    var label: String {
        switch style {
        case .recommended: String(localized: "Recommended")
        case .leanYes: String(localized: "Lean Yes")
        case .leanNo: String(localized: "Lean No")
        case .yourCall: String(localized: "Your Call")
        }
    }

    var color: Color {
        switch style {
        case .recommended: Theme.success
        case .leanYes: Theme.success.opacity(0.8)
        case .leanNo: Theme.danger.opacity(0.8)
        case .yourCall: Theme.warning
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
            .accessibilityLabel(label)
    }
}
