import SwiftUI

struct RaceDetailView: View {
    let race: Race
    @State private var selectedCandidate: Candidate?
    @State private var shuffledCandidates: [Candidate]

    init(race: Race) {
        self.race = race
        _shuffledCandidates = State(initialValue: race.candidates.shuffled())
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Race header
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Text(race.office)
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        if race.isKeyRace {
                            StarBadge()
                        }
                    }
                    if let district = race.district {
                        Text(district)
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }
                    Text("\(race.candidates.count) candidates")
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                }

                // Recommendation box
                if let rec = race.recommendation {
                    recommendationBox(rec)
                }

                // Candidates
                ForEach(shuffledCandidates) { candidate in
                    CandidateCard(
                        candidate: candidate,
                        isExpanded: selectedCandidate?.id == candidate.id
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            if selectedCandidate?.id == candidate.id {
                                selectedCandidate = nil
                            } else {
                                selectedCandidate = candidate
                            }
                        }
                    }
                }

                // Strategic notes
                if let notes = race.recommendation?.strategicNotes {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(Theme.warning)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Strategic Notes")
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)
                            Text(notes)
                                .font(Theme.callout)
                                .foregroundColor(Theme.textSecondary)
                        }
                    }
                    .padding(Theme.paddingMedium)
                    .background(Theme.warning.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                }

                // Disclaimer
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 15))
                        .foregroundColor(Theme.warning)
                    Text("AI-generated recommendations may contain errors. Do your own research before voting.")
                        .font(.system(size: 16))
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(.top, 4)

                Spacer(minLength: 40)
            }
            .padding(.horizontal, Theme.paddingMedium)
            .padding(.top, Theme.paddingSmall)
        }
        .background(Theme.backgroundCream)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Recommendation Box

    private func recommendationBox(_ rec: RaceRecommendation) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(Theme.success)
                    .font(.title3)
                Text("Our Pick: \(rec.candidateName)")
                    .font(.system(size: 21, weight: .bold))
                    .foregroundColor(Theme.textPrimary)
            }

            Text(rec.reasoning)
                .font(Theme.callout)
                .foregroundColor(Theme.textSecondary)

            if let caveats = rec.caveats {
                HStack(alignment: .top, spacing: 6) {
                    Image(systemName: "info.circle")
                        .foregroundColor(Theme.warning)
                        .font(.caption)
                    Text(caveats)
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                        .italic()
                }
            }

            HStack {
                Text(rec.confidence.rawValue)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Theme.primaryBlue)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Theme.primaryBlue.opacity(0.1))
                    .clipShape(Capsule())
            }
        }
        .padding(Theme.paddingMedium)
        .background(Theme.success.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.cornerRadius)
                .strokeBorder(Theme.success.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Candidate Card

struct CandidateCard: View {
    let candidate: Candidate
    let isExpanded: Bool
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header (always visible)
            Button(action: onTap) {
                HStack(spacing: 12) {
                    // Avatar circle
                    ZStack {
                        Circle()
                            .fill(candidate.isRecommended ? Theme.primaryBlue : Color.gray.opacity(0.12))
                            .frame(width: 44, height: 44)
                        Text(candidate.name.prefix(1))
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(candidate.isRecommended ? .white : Theme.textSecondary)
                    }

                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 6) {
                            Text(candidate.name)
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)
                            if candidate.isRecommended {
                                RecommendationBadge(style: .recommended)
                            }
                            if candidate.isIncumbent {
                                Text("Incumbent")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(Theme.textSecondary)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.gray.opacity(0.1))
                                    .clipShape(Capsule())
                            }
                        }
                        Text(candidate.summary)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(isExpanded ? nil : 2)
                    }

                    Spacer()

                    Image(systemName: "chevron.down")
                        .rotationEffect(.degrees(isExpanded ? 180 : 0))
                        .foregroundColor(Theme.textSecondary)
                        .font(.caption)
                }
            }
            .buttonStyle(.plain)

            // Expanded details
            if isExpanded {
                VStack(alignment: .leading, spacing: 14) {
                    Divider()
                        .padding(.vertical, 4)

                    // Pros
                    if !candidate.pros.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Label("Strengths", systemImage: "plus.circle.fill")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Theme.success)

                            ForEach(candidate.pros, id: \.self) { pro in
                                HStack(alignment: .top, spacing: 8) {
                                    Text("+")
                                        .font(.system(size: 17, weight: .bold, design: .monospaced))
                                        .foregroundColor(Theme.success)
                                    Text(pro)
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.textPrimary)
                                }
                            }
                        }
                    }

                    // Cons
                    if !candidate.cons.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Label("Concerns", systemImage: "minus.circle.fill")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Theme.danger)

                            ForEach(candidate.cons, id: \.self) { con in
                                HStack(alignment: .top, spacing: 8) {
                                    Text("-")
                                        .font(.system(size: 17, weight: .bold, design: .monospaced))
                                        .foregroundColor(Theme.danger)
                                    Text(con)
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.textPrimary)
                                }
                            }
                        }
                    }

                    // Key positions
                    if !candidate.keyPositions.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Key Positions")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(Theme.textSecondary)
                            FlowLayout(spacing: 6) {
                                ForEach(candidate.keyPositions, id: \.self) { position in
                                    Text(position)
                                        .font(.system(size: 16))
                                        .foregroundColor(Theme.textPrimary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 5)
                                        .background(Color.gray.opacity(0.08))
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }

                    // Fundraising & Polling
                    HStack(spacing: 16) {
                        if let funds = candidate.fundraising {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Fundraising")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(Theme.textSecondary)
                                Text(funds)
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundColor(Theme.textPrimary)
                            }
                        }
                        if let polling = candidate.polling {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Polling")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(Theme.textSecondary)
                                Text(polling)
                                    .font(.system(size: 17, weight: .semibold))
                                    .foregroundColor(Theme.textPrimary)
                            }
                        }
                    }

                    // Endorsements
                    if !candidate.endorsements.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Endorsements")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(Theme.textSecondary)
                            Text(candidate.endorsements.joined(separator: ", "))
                                .font(Theme.caption)
                                .foregroundColor(Theme.textPrimary)
                        }
                    }
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .card()
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(candidate.name)\(candidate.isRecommended ? ", Recommended" : "")\(candidate.isIncumbent ? ", Incumbent" : ""). \(candidate.summary)")
        .accessibilityHint(isExpanded ? "Double tap to collapse" : "Double tap to expand details")
    }
}

#Preview {
    NavigationStack {
        RaceDetailView(race: Ballot.sampleRepublican.races[1])
    }
    .environmentObject(VotingGuideStore.preview)
}
