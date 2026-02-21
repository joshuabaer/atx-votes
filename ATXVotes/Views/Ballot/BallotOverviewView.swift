import SwiftUI

// MARK: - I Voted Sticker

struct IVotedStickerView: View {
    var size: CGFloat = 200
    var isEarly: Bool = Date() < Election.date

    private var scale: CGFloat { size / 200 }

    private let flagBlue = Color(red: 0.05, green: 0.15, blue: 0.55)
    private let flagRed = Color(red: 0.80, green: 0.10, blue: 0.10)

    var body: some View {
        ZStack {
            // White oval with subtle shadow
            Ellipse()
                .fill(.white)
                .shadow(color: .black.opacity(0.15), radius: 4 * scale, y: 2 * scale)

            // Light gray border
            Ellipse()
                .strokeBorder(Color.gray.opacity(0.25), lineWidth: 1.5 * scale)

            VStack(spacing: 2 * scale) {
                // Waving flag
                WavingFlagShape(scale: scale)
                    .frame(width: 70 * scale, height: 42 * scale)
                    .padding(.top, isEarly ? 14 * scale : 20 * scale)

                // "I Voted" text
                Text("I Voted")
                    .font(.system(size: isEarly ? 38 * scale : 44 * scale, weight: .bold, design: .serif))
                    .italic()
                    .foregroundColor(flagBlue)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                if isEarly {
                    // "Early!" text — only before election day
                    Text("Early!")
                        .font(.system(size: 26 * scale, weight: .bold, design: .serif))
                        .italic()
                        .foregroundColor(flagRed)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12 * scale)
            .padding(.bottom, 12 * scale)
        }
        .frame(width: size, height: size * 0.75)
    }
}

// MARK: - Waving Flag

private struct WavingFlagShape: View {
    let scale: CGFloat

    private let flagBlue = Color(red: 0.05, green: 0.15, blue: 0.55)
    private let flagRed = Color(red: 0.80, green: 0.10, blue: 0.10)

    var body: some View {
        Canvas { context, canvasSize in
            let w = canvasSize.width
            let h = canvasSize.height

            // Draw red and white stripes with a wave effect
            let stripeCount = 13
            let stripeH = h / CGFloat(stripeCount)

            for i in 0..<stripeCount {
                let y = CGFloat(i) * stripeH
                let color: Color = i % 2 == 0 ? flagRed : .white

                var path = Path()
                let steps = 20
                for step in 0...steps {
                    let x = w * CGFloat(step) / CGFloat(steps)
                    let wave = sin(Double(step) / Double(steps) * .pi * 1.2) * Double(h) * 0.08
                    let py = y + CGFloat(wave)
                    let nextY = py + stripeH

                    if step == 0 {
                        path.move(to: CGPoint(x: x, y: py))
                    } else {
                        path.addLine(to: CGPoint(x: x, y: py))
                    }

                    if step == steps {
                        // Close across the bottom of the stripe
                        for backStep in (0...steps).reversed() {
                            let bx = w * CGFloat(backStep) / CGFloat(steps)
                            let bWave = sin(Double(backStep) / Double(steps) * .pi * 1.2) * Double(h) * 0.08
                            let bpy = y + stripeH + CGFloat(bWave)
                            path.addLine(to: CGPoint(x: bx, y: bpy))
                        }
                    }
                }
                path.closeSubpath()
                context.fill(path, with: .color(color))
            }

            // Blue canton (top-left)
            let cantonW = w * 0.42
            let cantonH = h * 0.55
            let cantonWave = sin(0.0) * Double(h) * 0.08

            var cantonPath = Path()
            cantonPath.addRect(CGRect(x: 0, y: CGFloat(cantonWave), width: cantonW, height: cantonH))
            context.fill(cantonPath, with: .color(flagBlue))

            // Stars in canton
            let starRows = 3
            let starCols = 4
            let starSize = min(cantonW / CGFloat(starCols + 1), cantonH / CGFloat(starRows + 1)) * 0.5
            for row in 0..<starRows {
                for col in 0..<starCols {
                    let sx = cantonW * CGFloat(col + 1) / CGFloat(starCols + 1)
                    let sy = CGFloat(cantonWave) + cantonH * CGFloat(row + 1) / CGFloat(starRows + 1)
                    let starPath = starShape(center: CGPoint(x: sx, y: sy), size: starSize)
                    context.fill(starPath, with: .color(.white))
                }
            }
        }
    }

    private func starShape(center: CGPoint, size: CGFloat) -> Path {
        var path = Path()
        let points = 5
        let outerRadius = size
        let innerRadius = size * 0.4

        for i in 0..<(points * 2) {
            let angle = Double(i) * .pi / Double(points) - .pi / 2
            let radius = i % 2 == 0 ? outerRadius : innerRadius
            let x = center.x + CGFloat(cos(angle)) * radius
            let y = center.y + CGFloat(sin(angle)) * radius
            if i == 0 {
                path.move(to: CGPoint(x: x, y: y))
            } else {
                path.addLine(to: CGPoint(x: x, y: y))
            }
        }
        path.closeSubpath()
        return path
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

                    // Party switcher
                    PartySwitcher(selectedParty: $store.selectedParty)

                    if ballot == nil {
                        VStack(spacing: 12) {
                            Image(systemName: "hand.tap.fill")
                                .font(.system(size: 36))
                                .foregroundColor(Theme.textSecondary)
                            Text("Choose a primary above to see your picks")
                                .font(Theme.callout)
                                .foregroundColor(Theme.textSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 60)
                    }

                    // Header card
                    headerCard

                    // Cheat Sheet
                    cheatSheetSection

                    // Key Races
                    if !contestedRaces.filter(\.isKeyRace).isEmpty {
                        sectionHeader(String(localized: "Key Races"), icon: "star.fill", color: Theme.accentGold)

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
                        sectionHeader(String(localized: "Other Contested Races"), icon: "person.2.fill", color: Theme.primaryBlue)

                        ForEach(otherContested) { race in
                            NavigationLink(destination: RaceDetailView(race: race)) {
                                RaceCard(race: race)
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Propositions
                    if let props = ballot?.propositions, !props.isEmpty {
                        sectionHeader(String(localized: "Propositions"), icon: "doc.text", color: Theme.primaryBlue)

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
                    Text(ballot?.electionDate.formatted(date: .long, time: .omitted) ?? Election.dateFormatted)
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
            HStack {
                sectionHeader(String(localized: "Cheat Sheet"), icon: "list.clipboard.fill", color: Theme.primaryBlue)
                Spacer()
                HStack(spacing: 16) {
                    Button {
                        UIPasteboard.general.string = cheatSheetText
                    } label: {
                        Image(systemName: "doc.on.doc")
                    }
                    .accessibilityLabel("Copy cheat sheet")

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
                .foregroundColor(Theme.primaryBlue)
            }

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text(store.voterProfile.address?.formatted ?? "Austin, TX")
                        .font(Theme.caption)
                        .foregroundColor(.white.opacity(0.8))
                    Spacer()
                    Text(ballot?.party.localizedName ?? store.selectedParty.localizedName)
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
                        Text(String(localized: "PROPOSITIONS"))
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
                            vote: prop.recommendation.localizedName,
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
                        Text(String(localized: "= Key race"))
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    Text(String(localized: "AI-generated — do your own research."))
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
        lines.append(String(localized: "MY BALLOT CHEAT SHEET"))
        lines.append(store.voterProfile.address?.formatted ?? "Austin, TX")
        lines.append("\(ballot?.party.localizedName ?? store.selectedParty.localizedName) \(String(localized: "Primary")) — \(Election.dateFormatted)")
        lines.append("")

        for race in recommendedRaces {
            let star = race.isKeyRace ? " *" : ""
            lines.append("\(raceLabel(race))\(star): \(race.recommendation?.candidateName ?? "—")")
        }

        if let props = ballot?.propositions, !props.isEmpty {
            lines.append("")
            for prop in props {
                lines.append("Prop \(prop.number) (\(prop.title)): \(prop.recommendation.localizedName)")
            }
        }

        lines.append("")
        lines.append(String(localized: "AI-generated recommendations — do your own research."))
        lines.append(String(localized: "Built with ATX Votes — atxvotes.app"))
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
            sectionHeader(String(localized: "Uncontested Races"), icon: "checkmark.circle", color: Theme.textSecondary)

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
            if let rec = race.recommendation {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            RecommendationBadge(style: .recommended)
                            Text(recommendedCandidate?.name ?? rec.candidateName)
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
                    Text(rec.confidence.localizedName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Theme.primaryBlue)
                }
            }
        }
        .card()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(race.office)\(race.district.map { ", \($0)" } ?? "")\(race.isKeyRace ? ", Key race" : ""). \(race.recommendation.map { "Recommended: \(recommendedCandidate?.name ?? $0.candidateName)" } ?? "\(race.candidates.count) candidates")")
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
            .accessibilityLabel("Proposition \(proposition.number): \(proposition.title), \(proposition.recommendation.localizedName)")
            .accessibilityHint(isExpanded ? "Double tap to collapse" : "Double tap to expand")

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    Text(proposition.description)
                        .font(Theme.callout)
                        .foregroundColor(Theme.textPrimary)

                    // Background
                    if let background = proposition.background {
                        Text(background)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }

                    // Supporters / Opponents
                    if !proposition.supporters.isEmpty || !proposition.opponents.isEmpty {
                        HStack(alignment: .top, spacing: 12) {
                            if !proposition.supporters.isEmpty {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Supporters")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Theme.success)
                                    ForEach(proposition.supporters, id: \.self) { s in
                                        Text("· \(s)")
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            if !proposition.opponents.isEmpty {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Opponents")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Theme.danger)
                                    ForEach(proposition.opponents, id: \.self) { o in
                                        Text("· \(o)")
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }

                    // Fiscal impact
                    if let fiscal = proposition.fiscalImpact {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "dollarsign.circle")
                                .foregroundColor(Theme.warning)
                                .font(.caption)
                            Text(fiscal)
                                .font(.system(size: 12))
                                .foregroundColor(Theme.textSecondary)
                        }
                    }

                    // If Passes / If Fails
                    if proposition.ifPasses != nil || proposition.ifFails != nil {
                        VStack(alignment: .leading, spacing: 6) {
                            if let passes = proposition.ifPasses {
                                HStack(alignment: .top, spacing: 6) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(Theme.success)
                                        .font(.caption2)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("If it passes")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(Theme.success)
                                        Text(passes)
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                            }
                            if let fails = proposition.ifFails {
                                HStack(alignment: .top, spacing: 6) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(Theme.danger)
                                        .font(.caption2)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("If it fails")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(Theme.danger)
                                        Text(fails)
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                            }
                        }
                        .padding(10)
                        .background(Color.gray.opacity(0.06))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    Divider()

                    // Claude reasoning
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "brain.head.profile")
                            .foregroundColor(Theme.primaryBlue)
                            .font(.caption)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(proposition.reasoning)
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                            if let confidence = proposition.confidence {
                                Text(confidence.localizedName)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(Theme.primaryBlue)
                            }
                        }
                    }

                    // Caveats
                    if let caveats = proposition.caveats {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "info.circle")
                                .foregroundColor(Theme.warning)
                                .font(.caption)
                            Text(caveats)
                                .font(Theme.caption)
                                .italic()
                                .foregroundColor(Theme.textSecondary)
                        }
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
