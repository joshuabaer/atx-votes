import SwiftUI

struct QualitiesPickerView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var selected: Set<CandidateQuality> = []

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("What do you value\nin a candidate?")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("Pick 2-3 that matter most to you.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    VStack(spacing: 12) {
                        ForEach(CandidateQuality.allCases) { quality in
                            QualityOption(
                                quality: quality,
                                isSelected: selected.contains(quality)
                            ) {
                                withAnimation(.spring(response: 0.25)) {
                                    if selected.contains(quality) {
                                        selected.remove(quality)
                                    } else {
                                        selected.insert(quality)
                                    }
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
                        store.selectQualities(Array(selected))
                        store.advancePhase()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(selected.count < 2)
                    .opacity(selected.count < 2 ? 0.5 : 1)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

struct QualityOption: View {
    let quality: CandidateQuality
    let isSelected: Bool
    let action: () -> Void

    private var icon: String {
        switch quality {
        case .competence: "chart.line.uptrend.xyaxis"
        case .integrity: "shield.checkered"
        case .independence: "figure.stand"
        case .experience: "briefcase"
        case .freshPerspective: "lightbulb"
        case .bipartisan: "arrow.left.arrow.right"
        case .strongLeader: "flag"
        case .communityTies: "person.3"
        }
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.08))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(isSelected ? .white : Theme.primaryBlue)
                }

                Text(quality.rawValue)
                    .font(Theme.headline)
                    .foregroundColor(Theme.textPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Theme.primaryBlue)
                        .font(.title3)
                }
            }
            .padding(12)
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
    QualitiesPickerView()
        .environmentObject(VotingGuideStore())
}
