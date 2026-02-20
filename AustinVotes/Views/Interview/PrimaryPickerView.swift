import SwiftUI

struct PrimaryPickerView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var selected: PrimaryBallot?

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Which primary\nwill you vote in?")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("Texas has open primaries — you choose at the polls. You can only vote in one party's primary.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    VStack(spacing: 16) {
                        PrimaryCard(
                            title: "Republican Primary",
                            color: Theme.republican,
                            icon: "r.circle.fill",
                            description: "U.S. Senate, Governor, AG, Comptroller, Ag Commissioner, and more",
                            isSelected: selected == .republican
                        ) {
                            withAnimation(.spring(response: 0.25)) {
                                selected = .republican
                            }
                        }

                        PrimaryCard(
                            title: "Democratic Primary",
                            color: Theme.democrat,
                            icon: "d.circle.fill",
                            description: "U.S. Representative (CD-37), County Commissioner, and more",
                            isSelected: selected == .democrat
                        ) {
                            withAnimation(.spring(response: 0.25)) {
                                selected = .democrat
                            }
                        }

                        PrimaryCard(
                            title: "Not Sure Yet",
                            color: Theme.textSecondary,
                            icon: "questionmark.circle.fill",
                            description: "We'll help you think through which primary has more impact for your values",
                            isSelected: selected == .undecided
                        ) {
                            withAnimation(.spring(response: 0.25)) {
                                selected = .undecided
                            }
                        }
                    }

                    // Info callout
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "info.circle.fill")
                            .foregroundColor(Theme.primaryBlue)
                            .font(.title3)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("How Texas primaries work")
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)
                            Text("You don't register with a party in Texas. At the polls, you tell them which primary you want. You'll only see races from that party. In the general election (November), you can vote for anyone.")
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                        }
                    }
                    .padding(Theme.paddingMedium)
                    .background(Theme.primaryBlue.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
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
                            store.selectPrimary(selected)
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

struct PrimaryCard: View {
    let title: String
    let color: Color
    let icon: String
    let description: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundColor(color)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(Theme.headline)
                        .foregroundColor(Theme.textPrimary)
                    Text(description)
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(3)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(color)
                        .font(.title2)
                }
            }
            .padding(Theme.paddingMedium)
            .background(isSelected ? color.opacity(0.06) : Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .strokeBorder(isSelected ? color : Color.gray.opacity(0.15), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PrimaryPickerView()
        .environmentObject(VotingGuideStore())
}
