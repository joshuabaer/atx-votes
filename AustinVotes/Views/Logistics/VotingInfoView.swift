import SwiftUI

struct VotingInfoView: View {
    @State private var expandedSection: InfoSection?

    enum InfoSection: String, CaseIterable, Identifiable {
        case dates = "Key Dates"
        case earlyVoting = "Early Voting"
        case electionDay = "Election Day"
        case voterID = "Voter ID"
        case whatToBring = "What to Bring"
        case resources = "Resources"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .dates: "calendar"
            case .earlyVoting: "clock.fill"
            case .electionDay: "building.columns.fill"
            case .voterID: "person.text.rectangle"
            case .whatToBring: "bag.fill"
            case .resources: "link"
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Countdown card
                    countdownCard

                    // Info sections
                    ForEach(InfoSection.allCases) { section in
                        InfoAccordion(
                            section: section,
                            isExpanded: expandedSection == section
                        ) {
                            withAnimation(.spring(response: 0.3)) {
                                expandedSection = expandedSection == section ? nil : section
                            }
                        }
                    }

                    // Contact
                    contactCard

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, Theme.paddingMedium)
                .padding(.top, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("Vote Info")
            .navigationBarTitleDisplayMode(.large)
        }
    }

    // MARK: - Countdown

    private var countdownCard: some View {
        let electionDay = DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date!
        let today = Date()
        let daysUntil = Calendar.current.dateComponents([.day], from: today, to: electionDay).day ?? 0

        return VStack(spacing: 8) {
            if daysUntil > 0 {
                Text("\(daysUntil)")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundColor(Theme.primaryBlue)
                Text("days until Election Day")
                    .font(Theme.headline)
                    .foregroundColor(Theme.textSecondary)
            } else if daysUntil == 0 {
                Text("TODAY")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundColor(Theme.success)
                Text("is Election Day!")
                    .font(Theme.headline)
                    .foregroundColor(Theme.textSecondary)
            } else {
                Text("Election Complete")
                    .font(Theme.title2)
                    .foregroundColor(Theme.textSecondary)
            }
            Text("Tuesday, March 3, 2026")
                .font(Theme.caption)
                .foregroundColor(Theme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Theme.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    // MARK: - Contact

    private var contactCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Travis County Elections")
                .font(Theme.headline)
                .foregroundColor(Theme.textPrimary)
            HStack(spacing: 12) {
                Link(destination: URL(string: "tel:5122388683")!) {
                    Label("(512) 238-8683", systemImage: "phone.fill")
                        .font(Theme.caption)
                }
                Link(destination: URL(string: "https://votetravis.gov")!) {
                    Label("votetravis.gov", systemImage: "globe")
                        .font(Theme.caption)
                }
            }
        }
        .card()
    }
}

// MARK: - Accordion Section

struct InfoAccordion: View {
    let section: VotingInfoView.InfoSection
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onTap) {
                HStack(spacing: 12) {
                    Image(systemName: section.icon)
                        .font(.system(size: 18))
                        .foregroundColor(Theme.primaryBlue)
                        .frame(width: 28)

                    Text(section.rawValue)
                        .font(Theme.headline)
                        .foregroundColor(Theme.textPrimary)

                    Spacer()

                    Image(systemName: "chevron.down")
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .foregroundColor(Theme.textSecondary)
                        .font(.caption)
                }
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(alignment: .leading, spacing: 10) {
                    Divider()
                        .padding(.vertical, 6)

                    sectionContent
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .card()
    }

    @ViewBuilder
    private var sectionContent: some View {
        switch section {
        case .dates:
            InfoRow(label: "Registration deadline", value: "Feb 2, 2026", isPast: true)
            InfoRow(label: "Mail ballot application", value: "Feb 20, 2026")
            InfoRow(label: "Early voting", value: "Feb 17 - 27, 2026", highlight: true)
            InfoRow(label: "Election Day", value: "March 3, 2026", highlight: true)

        case .earlyVoting:
            Text("Vote at any early voting location in Travis County")
                .font(Theme.callout)
                .foregroundColor(Theme.textSecondary)
            InfoRow(label: "Feb 17 - 21", value: "7:00 AM - 7:00 PM")
            InfoRow(label: "Feb 22 (Sun)", value: "12:00 PM - 6:00 PM")
            InfoRow(label: "Feb 23 - 25", value: "7:00 AM - 7:00 PM")
            InfoRow(label: "Feb 26 - 27", value: "7:00 AM - 10:00 PM")

            Link(destination: URL(string: "https://votetravis.gov")!) {
                Label("Find early voting locations", systemImage: "map.fill")
                    .font(Theme.callout)
                    .foregroundColor(Theme.primaryBlue)
            }

        case .electionDay:
            InfoRow(label: "Hours", value: "7:00 AM - 7:00 PM")
            Text("Vote at any Vote Center in Travis County with a \"Vote Here / Aqui\" sign.")
                .font(Theme.callout)
                .foregroundColor(Theme.textSecondary)
            Text("Texas has open primaries — tell the poll worker which party's primary you want. You can only vote in one.")
                .font(Theme.caption)
                .foregroundColor(Theme.textSecondary)

        case .voterID:
            Text("Texas requires photo ID to vote in person:")
                .font(Theme.callout)
                .foregroundColor(Theme.textSecondary)

            VStack(alignment: .leading, spacing: 6) {
                idItem("Texas driver's license or DPS ID")
                idItem("Texas Election ID Certificate (EIC)")
                idItem("Texas concealed handgun license")
                idItem("U.S. military ID with photo")
                idItem("U.S. citizenship certificate with photo")
                idItem("U.S. passport (book or card)")
            }

            Text("Expired IDs accepted if expired less than 4 years. No expiration limit for voters 70+.")
                .font(Theme.caption)
                .foregroundColor(Theme.textSecondary)
                .italic()

        case .whatToBring:
            VStack(alignment: .leading, spacing: 10) {
                bringItem("Photo ID", icon: "person.text.rectangle", required: true)
                bringItem("Your cheat sheet (printed)", icon: "doc.text", required: false)
                bringItem("Voter registration card", icon: "creditcard", required: false)

                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(Theme.warning)
                        .font(.caption)
                    Text("Travis County: You may NOT use your phone in the voting booth. Print your cheat sheet before you go!")
                        .font(Theme.caption)
                        .foregroundColor(Theme.warning)
                }
                .padding(10)
                .background(Theme.warning.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

        case .resources:
            VStack(alignment: .leading, spacing: 10) {
                resourceLink("League of Women Voters Guide", url: "https://lwvaustin.org/voters-guide")
                resourceLink("VOTE411 — Personalized ballot", url: "https://vote411.org")
                resourceLink("VoteTravis.gov — Official info", url: "https://votetravis.gov")
                resourceLink("VoteTexas.gov — State info", url: "https://votetexas.gov")
                resourceLink("KUT Austin Voter Guide", url: "https://www.kut.org")
            }
        }
    }

    private func idItem(_ text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 12))
                .foregroundColor(Theme.success)
            Text(text)
                .font(Theme.caption)
                .foregroundColor(Theme.textPrimary)
        }
    }

    private func bringItem(_ text: String, icon: String, required: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(Theme.primaryBlue)
                .frame(width: 24)
            Text(text)
                .font(Theme.callout)
                .foregroundColor(Theme.textPrimary)
            if required {
                Text("Required")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Theme.danger)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.danger.opacity(0.1))
                    .clipShape(Capsule())
            }
        }
    }

    private func resourceLink(_ title: String, url: String) -> some View {
        Link(destination: URL(string: url)!) {
            HStack {
                Text(title)
                    .font(Theme.callout)
                    .foregroundColor(Theme.primaryBlue)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.caption)
                    .foregroundColor(Theme.textSecondary)
            }
        }
    }
}

// MARK: - Info Row

struct InfoRow: View {
    let label: String
    let value: String
    var isPast: Bool = false
    var highlight: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(Theme.caption)
                .foregroundColor(isPast ? Theme.textSecondary.opacity(0.5) : Theme.textSecondary)
                .strikethrough(isPast)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: highlight ? .bold : .medium))
                .foregroundColor(isPast ? Theme.textSecondary.opacity(0.5) : (highlight ? Theme.primaryBlue : Theme.textPrimary))
        }
    }
}

#Preview {
    VotingInfoView()
}
