import SwiftUI

// MARK: - I Voted Sticker

struct IVotedStickerView: View {
    var size: CGFloat = 200

    private var scale: CGFloat { size / 200 }

    var body: some View {
        ZStack {
            // Oval background
            Ellipse()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.10, green: 0.25, blue: 0.55),
                            Color(red: 0.15, green: 0.35, blue: 0.65)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )

            // Red border
            Ellipse()
                .strokeBorder(Color(red: 0.80, green: 0.15, blue: 0.15), lineWidth: 6 * scale)

            VStack(spacing: 4 * scale) {
                // Stars row
                HStack(spacing: 6 * scale) {
                    ForEach(0..<5) { _ in
                        Image(systemName: "star.fill")
                            .font(.system(size: 14 * scale))
                            .foregroundColor(.white)
                    }
                }
                .padding(.top, 20 * scale)

                Spacer(minLength: 0)

                // Main text
                Text("I VOTED")
                    .font(.system(size: 44 * scale, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .tracking(2 * scale)

                Spacer(minLength: 0)

                // Subtitle
                Text("TX PRIMARY 2026")
                    .font(.system(size: 12 * scale, weight: .bold, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
                    .tracking(1.5 * scale)
                    .padding(.bottom, 20 * scale)
            }
            .padding(.horizontal, 16 * scale)
        }
        .frame(width: size, height: size * 0.75)
    }
}

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

                    // Cheat Sheet
                    cheatSheetSection

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, Theme.paddingMedium)
                .padding(.top, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("My Ballot")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 16) {
                        Button {
                            printCheatSheet()
                        } label: {
                            Image(systemName: "printer")
                        }
                        .accessibilityLabel("Print cheat sheet")

                        ShareLink(item: cheatSheetText) {
                            Image(systemName: "square.and.arrow.up")
                        }
                        .accessibilityLabel("Share cheat sheet")
                    }
                }
            }
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
                    .font(.system(size: 40))
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

            if store.districtLookupFailed {
                Text("Showing all races — district lookup unavailable")
                    .font(Theme.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .italic()
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
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white.opacity(0.6))
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.system(size: 17, weight: .medium))
                .foregroundColor(.white.opacity(0.9))
        }
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String, icon: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .foregroundColor(color)
                .accessibilityHidden(true)
            Text(title)
                .font(Theme.title2)
                .foregroundColor(Theme.textPrimary)
        }
        .padding(.top, 8)
        .accessibilityAddTraits(.isHeader)
    }

    // MARK: - Cheat Sheet

    private var recommendedRaces: [Race] {
        contestedRaces.filter { $0.recommendation != nil }
    }

    private var cheatSheetSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader("Cheat Sheet", icon: "list.clipboard.fill", color: Theme.primaryBlue)

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text(store.voterProfile.address?.formatted ?? "Austin, TX")
                        .font(Theme.caption)
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Text(ballot?.party.rawValue ?? "Republican")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Theme.primaryBlue)

                // Contested races
                ForEach(Array(recommendedRaces.enumerated()), id: \.element.id) { index, race in
                    cheatSheetRow(
                        office: raceLabel(race),
                        vote: race.recommendation?.candidateName ?? "—",
                        isKeyRace: race.isKeyRace,
                        isOdd: index % 2 == 1
                    )
                }

                // Propositions
                if let props = ballot?.propositions, !props.isEmpty {
                    HStack {
                        Text("PROPOSITIONS")
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Theme.primaryBlue.opacity(0.8))

                    ForEach(Array(props.enumerated()), id: \.element.id) { index, prop in
                        cheatSheetRow(
                            office: "Prop \(prop.number)",
                            vote: prop.recommendation.rawValue,
                            isKeyRace: false,
                            isOdd: index % 2 == 1,
                            voteColor: propColor(prop.recommendation)
                        )
                    }
                }

                // Footer
                VStack(spacing: 6) {
                    Divider()
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.accentGold)
                        Text("= Key race")
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    Text("AI-generated — do your own research.")
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(12)
            }
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
        }
    }

    private func cheatSheetRow(office: String, vote: String, isKeyRace: Bool, isOdd: Bool, voteColor: Color = Theme.primaryBlue) -> some View {
        HStack(alignment: .top) {
            HStack(spacing: 4) {
                if isKeyRace {
                    Image(systemName: "star.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.accentGold)
                }
                Text(office)
                    .font(.system(size: 16))
                    .foregroundColor(Theme.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Text(vote)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(voteColor)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(isOdd ? Color.gray.opacity(0.04) : Color.clear)
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

    private var cheatSheetText: String {
        var lines: [String] = []
        lines.append("MY BALLOT CHEAT SHEET")
        lines.append(store.voterProfile.address?.formatted ?? "Austin, TX")
        lines.append("\(ballot?.party.rawValue ?? "Republican") Primary — March 3, 2026")
        lines.append("")

        for race in recommendedRaces {
            let star = race.isKeyRace ? " *" : ""
            lines.append("\(raceLabel(race))\(star): \(race.recommendation?.candidateName ?? "—")")
        }

        if let props = ballot?.propositions, !props.isEmpty {
            lines.append("")
            for prop in props {
                lines.append("Prop \(prop.number) (\(prop.title)): \(prop.recommendation.rawValue)")
            }
        }

        lines.append("")
        lines.append("AI-generated recommendations — do your own research.")
        lines.append("Built with ATX Votes — atxvotes.app")
        return lines.joined(separator: "\n")
    }

    private func printCheatSheet() {
        let printController = UIPrintInteractionController.shared
        printController.printInfo = {
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = "ATX Votes Cheat Sheet"
            info.outputType = .general
            return info
        }()
        printController.printFormatter = UISimpleTextPrintFormatter(text: cheatSheetText)
        printController.present(animated: true)
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
                                .accessibilityLabel("Key race")
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
                                .font(.system(size: 20, weight: .bold))
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
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Theme.primaryBlue)
                }
            }
        }
        .card()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(race.office)\(race.district.map { ", \($0)" } ?? "")\(race.isKeyRace ? ", Key race" : ""). \(recommendedCandidate.map { "Recommended: \($0.name)" } ?? "\(race.candidates.count) candidates")")
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
                                .font(.system(size: 17, weight: .bold, design: .rounded))
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
                        .accessibilityHidden(true)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Proposition \(proposition.number): \(proposition.title), \(proposition.recommendation.rawValue)")
            .accessibilityHint(isExpanded ? "Double tap to collapse" : "Double tap to expand")

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
