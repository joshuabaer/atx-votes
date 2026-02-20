import SwiftUI

struct SpectrumPickerView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var selected: PoliticalSpectrum?
    @State private var shuffledOptions = PoliticalSpectrum.allCases.shuffled()

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("How would you describe\nyour approach?")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("No wrong answers. This helps us understand your lens.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    VStack(spacing: 12) {
                        ForEach(shuffledOptions) { spectrum in
                            SpectrumOption(
                                spectrum: spectrum,
                                isSelected: selected == spectrum
                            ) {
                                withAnimation(.spring(response: 0.25)) {
                                    selected = spectrum
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.top, Theme.paddingLarge)
                .padding(.bottom, 100)
            }

            VStack(spacing: 0) {
                Divider()
                HStack {
                    Button("Back") { store.goBackPhase() }
                        .font(Theme.headline)
                        .foregroundColor(Theme.textSecondary)
                        .frame(width: 80)

                    Button("Continue") {
                        if let selected {
                            store.selectSpectrum(selected)
                            store.advancePhase()
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(selected == nil)
                    .opacity(selected == nil ? 0.5 : 1)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

struct SpectrumOption: View {
    let spectrum: PoliticalSpectrum
    let isSelected: Bool
    let action: () -> Void

    private var description: String {
        switch spectrum {
        case .progressive: "Bold systemic change, social justice focused"
        case .liberal: "Expand rights and services, government as a force for good"
        case .moderate: "Pragmatic center, best ideas from both sides"
        case .conservative: "Limited government, traditional values, fiscal discipline"
        case .libertarian: "Maximum freedom, minimal government"
        case .independent: "I decide issue by issue, not by party"
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Circle()
                    .fill(isSelected ? Theme.primaryBlue : Color.clear)
                    .frame(width: 24, height: 24)
                    .overlay(
                        Circle()
                            .strokeBorder(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.35), lineWidth: 2)
                    )
                    .overlay(
                        isSelected ? Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        : nil
                    )

                VStack(alignment: .leading, spacing: 3) {
                    Text(spectrum.rawValue)
                        .font(Theme.headline)
                        .foregroundColor(Theme.textPrimary)
                    Text(description)
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                }

                Spacer()
            }
            .padding(Theme.paddingMedium)
            .background(isSelected ? Theme.primaryBlue.opacity(0.06) : Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                    .strokeBorder(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.15), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    SpectrumPickerView()
        .environmentObject(VotingGuideStore())
}
