import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var showResetConfirmation = false
    @State private var isRegeneratingSummary = false
    @State private var summaryError: String?

    private var profile: VoterProfile { store.voterProfile }

    private var shareableProfileText: String {
        var lines: [String] = []
        lines.append("My Voter Profile — ATX Votes")
        lines.append("")

        lines.append("Political Outlook: \(profile.politicalSpectrum.rawValue)")
        lines.append("")

        if let summary = profile.summaryText {
            lines.append(summary)
            lines.append("")
        }

        if !profile.topIssues.isEmpty {
            lines.append("Top Issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))")
        }

        if !profile.candidateQualities.isEmpty {
            lines.append("I value: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))")
        }

        if !profile.policyViews.isEmpty {
            lines.append("")
            lines.append("Policy Stances:")
            for key in profile.policyViews.keys.sorted() {
                lines.append("  \(key): \(profile.policyViews[key] ?? "")")
            }
        }

        if !profile.admiredPoliticians.isEmpty {
            lines.append("")
            lines.append("Politicians I admire: \(profile.admiredPoliticians.joined(separator: ", "))")
        }
        if !profile.dislikedPoliticians.isEmpty {
            lines.append("Politicians I dislike: \(profile.dislikedPoliticians.joined(separator: ", "))")
        }

        lines.append("")
        lines.append("Built with ATX Votes — atxvotes.app")
        return lines.joined(separator: "\n")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Profile summary card
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 10) {
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 40))
                                .foregroundColor(Theme.primaryBlue)
                            VStack(alignment: .leading) {
                                Text("How you might describe your politics to a friend")
                                    .font(Theme.headline)
                                    .foregroundColor(Theme.textPrimary)
                                Text(profile.politicalSpectrum.rawValue)
                                    .font(Theme.caption)
                                    .foregroundColor(Theme.textSecondary)
                            }
                            Spacer()
                            if isRegeneratingSummary {
                                ProgressView()
                            } else {
                                Button {
                                    Task { await regenerateSummary() }
                                } label: {
                                    Image(systemName: "arrow.trianglehead.2.clockwise")
                                        .font(.system(size: 20))
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                        }
                        if let summary = profile.summaryText {
                            Text(summary)
                                .font(Theme.callout)
                                .foregroundColor(Theme.textSecondary)
                        }
                    }
                    .card()

                    if let summaryError {
                        Text(summaryError)
                            .font(Theme.caption)
                            .foregroundColor(Theme.danger)
                            .padding(.horizontal, 4)
                    }

                    // Top Issues
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Your Top Issues")
                            .font(Theme.headline)
                            .foregroundColor(Theme.textPrimary)

                        FlowLayout(spacing: 8) {
                            ForEach(profile.topIssues) { issue in
                                HStack(spacing: 6) {
                                    Image(systemName: issue.icon)
                                        .font(.system(size: 16))
                                    Text(issue.rawValue)
                                        .font(.system(size: 17, weight: .medium))
                                }
                                .foregroundColor(Theme.primaryBlue)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Theme.primaryBlue.opacity(0.08))
                                .clipShape(Capsule())
                            }
                        }
                    }
                    .card()

                    // Candidate Qualities
                    VStack(alignment: .leading, spacing: 10) {
                        Text("What You Value in Candidates")
                            .font(Theme.headline)
                            .foregroundColor(Theme.textPrimary)

                        ForEach(profile.candidateQualities) { quality in
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(Theme.success)
                                    .font(.caption)
                                Text(quality.rawValue)
                                    .font(Theme.callout)
                                    .foregroundColor(Theme.textPrimary)
                            }
                        }
                    }
                    .card()

                    // Policy Views
                    if !profile.policyViews.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Your Policy Stances")
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)

                            ForEach(Array(profile.policyViews.keys.sorted()), id: \.self) { key in
                                HStack(alignment: .top) {
                                    Text(key)
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.textSecondary)
                                        .frame(width: 100, alignment: .leading)
                                    Text(profile.policyViews[key] ?? "")
                                        .font(.system(size: 18, weight: .medium))
                                        .foregroundColor(Theme.textPrimary)
                                }
                            }
                        }
                        .card()
                    }

                    // Politicians
                    if !profile.admiredPoliticians.isEmpty || !profile.dislikedPoliticians.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            if !profile.admiredPoliticians.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Label("Admire", systemImage: "hand.thumbsup.fill")
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.success)
                                    Text(profile.admiredPoliticians.joined(separator: ", "))
                                        .font(Theme.callout)
                                        .foregroundColor(Theme.textPrimary)
                                }
                            }
                            if !profile.dislikedPoliticians.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Label("Dislike", systemImage: "hand.thumbsdown.fill")
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.danger)
                                    Text(profile.dislikedPoliticians.joined(separator: ", "))
                                        .font(Theme.callout)
                                        .foregroundColor(Theme.textPrimary)
                                }
                            }
                        }
                        .card()
                    }

                    // Address
                    if let address = profile.address {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your Address")
                                .font(Theme.headline)
                                .foregroundColor(Theme.textPrimary)
                            Text(address.formatted)
                                .font(Theme.callout)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .card()
                    }

                    // Send Feedback
                    if let url = FeedbackHelper.mailtoURL {
                        Link(destination: url) {
                            HStack(spacing: 10) {
                                Image(systemName: "envelope.fill")
                                    .font(.system(size: 20))
                                Text("Send Feedback")
                                    .font(Theme.headline)
                            }
                            .foregroundColor(Theme.primaryBlue)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Theme.primaryBlue.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                        }
                        .padding(.horizontal, Theme.paddingMedium)
                        .padding(.top, 8)
                    }

                    // Reset button
                    Button("Start Over") {
                        showResetConfirmation = true
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .padding(.horizontal, Theme.paddingMedium)

                    // Credits
                    VStack(spacing: 4) {
                        Text("Built with ATX Votes")
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                        Text("Powered by Claude (Anthropic)")
                            .font(.system(size: 15))
                            .foregroundColor(Theme.textSecondary.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)

                    Spacer(minLength: 40)
                }
                .padding(.top, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    ShareLink(item: shareableProfileText) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .accessibilityLabel("Share voter profile")
                }
            }
            .alert("Start Over?", isPresented: $showResetConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Reset", role: .destructive) {
                    store.resetGuide()
                }
            } message: {
                Text("This will erase your voter profile and recommendations. You'll need to go through the interview again.")
            }
        }
    }

    private func regenerateSummary() async {
        isRegeneratingSummary = true
        summaryError = nil
        do {
            let summary = try await store.claudeService.generateProfileSummary(profile: store.voterProfile)
            store.voterProfile.summaryText = summary
            store.saveProfile()
        } catch {
            summaryError = "Could not refresh summary. Check your connection and try again."
        }
        isRegeneratingSummary = false
    }
}

#Preview {
    ProfileView()
        .environmentObject(VotingGuideStore.preview)
}
