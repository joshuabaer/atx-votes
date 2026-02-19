import SwiftUI

struct BallotOverviewView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var expandedRaceId: UUID?
    @State private var showDisclaimer = true

    private var ballot: Ballot? { store.ballot }

    private var contestedRaces: [Race] {
        (ballot?.races ?? [])
            .filter { $0.isContested }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    private var uncontestedRaces: [Race] {
        (ballot?.races ?? [])
            .filter { !$0.isContested }
            .sorted { $0.sortOrder < $1.sortOrder }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Sample data warning
                    if !ClaudeService.hasAPIKey {
                        SampleDataBanner()
                    }

                    // Disclaimer banner
                    if showDisclaimer {
                        DisclaimerBanner { showDisclaimer = false }
                    }

                    // Header card
                    headerCard

                    // Key Races
                    if !contestedRaces.filter(\.isKeyRace).isEmpty {
                        sectionHeader("Key Races", icon: "star.fill", color: Theme.accentGold)

                        ForEach(contestedRaces.filter(\.isKeyRace)) { race in
                            NavigationLink(destination: RaceDetailView(race: race)) {
                                RaceCard(race: race)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Other Contested Races
                    let otherContested = contestedRaces.filter { !$0.isKeyRace }
                    if !otherContested.isEmpty {
                        sectionHeader("Other Contested Races", icon: "person.2.fill", color: Theme.primaryBlue)

                        ForEach(otherContested) { race in
                            NavigationLink(destination: RaceDetailView(race: race)) {
                                RaceCard(race: race)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Propositions
                    if let props = ballot?.propositions, !props.isEmpty {
                        sectionHeader("Propositions", icon: "doc.text", color: Theme.primaryBlue)

                        ForEach(props) { prop in
                            PropositionCard(proposition: prop)
                        }
                    }

                    // Uncontested
                    if !uncontestedRaces.isEmpty {
                        uncontestedSection
                    }

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, Theme.paddingMedium)
                .padding(.top, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("My Ballot")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(ballot?.electionName ?? "March 2026 Primary")
                        .font(Theme.headline)
                        .foregroundColor(.white)
                    Text(ballot?.electionDate.formatted(date: .long, time: .omitted) ?? "March 3, 2026")
                        .font(Theme.callout)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.white.opacity(0.3))
            }

            if let districts = ballot?.districts {
                Divider().background(.white.opacity(0.2))
                VStack(alignment: .leading, spacing: 4) {
                    if let cd = districts.congressional {
                        districtRow("Congress", cd)
                    }
                    if let sh = districts.stateHouse {
                        districtRow("State House", sh)
                    }
                    if let ss = districts.stateSenate {
                        districtRow("State Senate", "\(ss) (not on ballot)")
                    }
                }
            }
        }
        .padding(Theme.paddingMedium)
        .background(
            LinearGradient(
                colors: [Theme.primaryBlue, Theme.primaryBlue.opacity(0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
    }

    private func districtRow(_ label: String, _ value: String) -> some View {
        HStack(spacing: 8) {
            Text(label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
        }
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(title)
                .font(Theme.title2)
                .foregroundColor(Theme.textPrimary)
        }
        .padding(.top, 8)
    }

    // MARK: - Uncontested Section

    private var uncontestedSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("Uncontested Races", icon: "checkmark.circle", color: Theme.textSecondary)

            VStack(spacing: 0) {
                ForEach(Array(uncontestedRaces.enumerated()), id: \.element.id) { index, race in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(race.office)
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                            Text(race.candidates.first?.name ?? "")
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)
                        }
                        Spacer()
                        Image(systemName: "checkmark")
                            .foregroundColor(Theme.textSecondary)
                            .font(.caption)
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, Theme.paddingMedium)

                    if index < uncontestedRaces.count - 1 {
                        Divider().padding(.horizontal, Theme.paddingMedium)
                    }
                }
            }
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .shadow(color: .black.opacity(0.04), radius: 4, y: 1)
        }
    }
}

// MARK: - Race Card

struct RaceCard: View {
    let race: Race

    private var recommendedCandidate: Candidate? {
        race.candidates.first { $0.isRecommended }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title row
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(race.office)
                            .font(Theme.headline)
                            .foregroundColor(Theme.textPrimary)
                        if race.isKeyRace {
                            StarBadge()
                        }
                    }
                    if let district = race.district {
                        Text(district)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(Theme.textSecondary)
                    .font(.caption)
            }

            // Recommendation
            if let rec = race.recommendation, let candidate = recommendedCandidate {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            RecommendationBadge(style: .recommended)
                            Text(candidate.name)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(Theme.primaryBlue)
                        }
                        Text(rec.reasoning)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(2)
                    }
                }
            }

            // Candidate count
            HStack(spacing: 4) {
                Text("\(race.candidates.count) candidates")
                    .font(Theme.caption)
                    .foregroundColor(Theme.textSecondary)
                if let rec = race.recommendation {
                    Text("·")
                        .foregroundColor(Theme.textSecondary)
                    Text(rec.confidence.rawValue)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.primaryBlue)
                }
            }
        }
        .card()
    }
}

// MARK: - Proposition Card

struct PropositionCard: View {
    let proposition: Proposition
    @State private var isExpanded = false

    private var badgeStyle: RecommendationBadge.Style {
        switch proposition.recommendation {
        case .leanYes: .leanYes
        case .leanNo: .leanNo
        case .yourCall: .yourCall
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                withAnimation(.spring(response: 0.3)) { isExpanded.toggle() }
            } label: {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text("Prop \(proposition.number)")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(Theme.primaryBlue)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Theme.primaryBlue.opacity(0.1))
                                .clipShape(Capsule())

                            RecommendationBadge(style: badgeStyle)
                        }

                        Text(proposition.title)
                            .font(Theme.headline)
                            .foregroundColor(Theme.textPrimary)
                            .multilineTextAlignment(.leading)
                    }
                    Spacer()
                    Image(systemName: "chevron.down")
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .foregroundColor(Theme.textSecondary)
                        .font(.caption)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    Text(proposition.description)
                        .font(Theme.callout)
                        .foregroundColor(Theme.textPrimary)

                    Divider()

                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "brain.head.profile")
                            .foregroundColor(Theme.primaryBlue)
                            .font(.caption)
                        Text(proposition.reasoning)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .card()
    }
}

#Preview {
    BallotOverviewView()
        .environmentObject(VotingGuideStore.preview)
}
