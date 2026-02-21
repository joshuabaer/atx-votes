import SwiftUI

struct CheatSheetView: View {
    @EnvironmentObject var store: VotingGuideStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Title card
                    VStack(spacing: 8) {
                        Image(systemName: "list.clipboard.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Theme.primaryBlue)
                            .accessibilityHidden(true)

                        Text(String(localized: "Your Ballot Cheat Sheet"))
                            .font(Theme.title2)
                            .foregroundColor(Theme.textPrimary)

                        if let address = store.voterProfile.address {
                            Text(address.formatted)
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                        }

                        Text(store.ballot?.party.localizedName ?? store.selectedParty.localizedName)
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(store.selectedParty == .democrat ? Theme.democrat : Theme.republican)
                            .clipShape(Capsule())

                        Text(Election.dateFormatted)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(Theme.cardBackground)

                    // Contested races table
                    VStack(spacing: 0) {
                        cheatSheetHeader(String(localized: "CONTESTED RACES"))

                        ForEach(Array(store.recommendedRaces.enumerated()), id: \.element.id) { index, race in
                            cheatSheetRow(
                                office: raceLabel(race),
                                vote: race.recommendation?.candidateName ?? "—",
                                isKeyRace: race.isKeyRace,
                                isOdd: index % 2 == 1
                            )
                        }
                    }

                    // Propositions table
                    if let props = store.ballot?.propositions, !props.isEmpty {
                        VStack(spacing: 0) {
                            cheatSheetHeader(String(localized: "PROPOSITIONS"))

                            ForEach(Array(props.enumerated()), id: \.element.id) { index, prop in
                                cheatSheetRow(
                                    office: "Prop \(prop.number): \(prop.title)",
                                    vote: prop.recommendation.localizedName,
                                    isKeyRace: false,
                                    isOdd: index % 2 == 1,
                                    voteColor: propColor(prop.recommendation)
                                )
                            }
                        }
                    }

                    // Uncontested
                    if !store.uncontestedRaces.isEmpty {
                        VStack(spacing: 0) {
                            cheatSheetHeader(String(localized: "UNCONTESTED"))

                            ForEach(Array(store.uncontestedRaces.enumerated()), id: \.element.id) { index, race in
                                cheatSheetRow(
                                    office: raceLabel(race),
                                    vote: race.candidates.first?.name ?? "—",
                                    isKeyRace: false,
                                    isOdd: index % 2 == 1,
                                    voteColor: Theme.textSecondary
                                )
                            }
                        }
                    }

                    // Footer
                    VStack(spacing: 8) {
                        Divider()
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .font(.system(size: 17))
                                .foregroundColor(Theme.accentGold)
                                .accessibilityHidden(true)
                            Text(String(localized: "= Key race where your vote matters most"))
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                        }

                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 17))
                                .foregroundColor(Theme.warning)
                                .accessibilityHidden(true)
                            Text(String(localized: "AI-generated recommendations may contain errors. Do your own research before voting."))
                                .font(.system(size: 18))
                                .foregroundColor(Theme.textSecondary)
                                .multilineTextAlignment(.center)
                        }

                        Text(String(localized: "Built with ATX Votes"))
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(Theme.textSecondary.opacity(0.5))
                    }
                    .padding(Theme.paddingMedium)
                }
                .background(Theme.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
                .shadow(color: Theme.shadow, radius: 12, y: 4)
                .padding(.horizontal, Theme.paddingMedium)
                .padding(.vertical, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("Cheat Sheet")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 16) {
                        ShareLink(item: shareAppMessage) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 18))
                        }
                        .accessibilityLabel("Share app with friends")
                        ShareLink(item: buildCheatSheetText()) {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .accessibilityLabel("Share cheat sheet")
                    }
                }
            }
        }
    }

    // MARK: - Table Components

    private func cheatSheetHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundColor(.white)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(Theme.primaryBlue)
        .accessibilityAddTraits(.isHeader)
    }

    private func cheatSheetRow(office: String, vote: String, isKeyRace: Bool, isOdd: Bool, voteColor: Color = Theme.primaryBlue) -> some View {
        HStack(alignment: .top) {
            HStack(spacing: 4) {
                if isKeyRace {
                    Image(systemName: "star.fill")
                        .font(.system(size: 17))
                        .foregroundColor(Theme.accentGold)
                        .accessibilityHidden(true)
                }
                Text(office)
                    .font(.system(size: 17))
                    .foregroundColor(Theme.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(vote)
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(voteColor)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(isOdd ? Theme.fillTertiary : Color.clear)
        .accessibilityElement(children: .combine)
    }

    private func raceLabel(_ race: Race) -> String {
        if let district = race.district {
            return "\(race.office) \(district)"
        }
        return race.office
    }

    private func propColor(_ rec: Proposition.PropRecommendation) -> Color {
        switch rec {
        case .leanYes: Theme.success
        case .leanNo: Theme.danger
        case .yourCall: Theme.warning
        }
    }

    // MARK: - Share App

    private var shareAppMessage: String {
        String(localized: "I just built my personalized voting guide for the March 2026 Texas primary with ATX Votes! Build yours in 5 minutes and know exactly who to vote for.")
    }

    // MARK: - Share Text

    private func buildCheatSheetText() -> String {
        var lines: [String] = []
        lines.append(String(localized: "MY BALLOT CHEAT SHEET"))
        lines.append(store.voterProfile.address?.formatted ?? "Austin, TX")
        lines.append("\(store.ballot?.party.localizedName ?? store.selectedParty.localizedName) \(String(localized: "Primary")) — \(Election.dateFormatted)")
        lines.append("")

        for race in store.recommendedRaces {
            let star = race.isKeyRace ? " ⭐" : ""
            lines.append("\(raceLabel(race))\(star): \(race.recommendation?.candidateName ?? "—")")
        }

        lines.append("")
        for prop in store.ballot?.propositions ?? [] {
            lines.append("Prop \(prop.number) (\(prop.title)): \(prop.recommendation.localizedName)")
        }

        lines.append("")
        lines.append(String(localized: "⚠️ AI-generated recommendations — do your own research."))
        lines.append(String(localized: "Built with ATX Votes"))
        return lines.joined(separator: "\n")
    }
}

#Preview {
    CheatSheetView()
        .environmentObject(VotingGuideStore.preview)
}
