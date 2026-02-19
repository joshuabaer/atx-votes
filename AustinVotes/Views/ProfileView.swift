import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var showResetConfirmation = false
    @State private var apiKeyInput = ""
    @State private var showAPIKey = false
    @State private var apiKeySaved = KeychainHelper.load(key: "claude_api_key") != nil

    private var profile: VoterProfile { store.voterProfile }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Profile summary card
                    if let summary = profile.summaryText {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 10) {
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(Theme.primaryBlue)
                                VStack(alignment: .leading) {
                                    Text("Your Voter Profile")
                                        .font(Theme.headline)
                                        .foregroundColor(Theme.textPrimary)
                                    Text(profile.politicalSpectrum.rawValue)
                                        .font(Theme.caption)
                                        .foregroundColor(Theme.textSecondary)
                                }
                            }
                            Text(summary)
                                .font(Theme.callout)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .card()
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
                                        .font(.system(size: 12))
                                    Text(issue.rawValue)
                                        .font(.system(size: 13, weight: .medium))
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
                                        .font(.system(size: 14, weight: .medium))
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
                                    .font(.system(size: 16))
                                Text("Send Feedback")
                                    .font(Theme.headline)
                            }
                            .foregroundColor(Theme.primaryBlue)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Theme.primaryBlue.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                        }
                        .padding(.top, 8)
                    }

                    // API Key Settings
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Claude API Key")
                            .font(Theme.headline)
                            .foregroundColor(Theme.textPrimary)

                        Text(apiKeySaved
                             ? "API key saved. Your guide will use personalized AI recommendations."
                             : "Add an API key to get personalized recommendations powered by Claude.")
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)

                        HStack(spacing: 8) {
                            Group {
                                if showAPIKey {
                                    TextField("sk-ant-...", text: $apiKeyInput)
                                } else {
                                    SecureField("sk-ant-...", text: $apiKeyInput)
                                }
                            }
                            .textFieldStyle(.roundedBorder)
                            .font(.system(size: 14, design: .monospaced))
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)

                            Button {
                                showAPIKey.toggle()
                            } label: {
                                Image(systemName: showAPIKey ? "eye.slash" : "eye")
                                    .foregroundColor(Theme.textSecondary)
                            }
                        }

                        HStack(spacing: 12) {
                            Button("Save") {
                                let trimmed = apiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines)
                                guard !trimmed.isEmpty else { return }
                                KeychainHelper.save(key: "claude_api_key", value: trimmed)
                                apiKeySaved = true
                                apiKeyInput = ""
                                showAPIKey = false
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Theme.primaryBlue)
                            .disabled(apiKeyInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                            if apiKeySaved {
                                Button("Remove", role: .destructive) {
                                    KeychainHelper.delete(key: "claude_api_key")
                                    apiKeySaved = false
                                    apiKeyInput = ""
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                    }
                    .card()

                    // Reset button
                    Button("Start Over") {
                        showResetConfirmation = true
                    }
                    .buttonStyle(SecondaryButtonStyle())

                    // Credits
                    VStack(spacing: 4) {
                        Text("Built with ATX Votes")
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                        Text("Powered by Claude (Anthropic)")
                            .font(.system(size: 11))
                            .foregroundColor(Theme.textSecondary.opacity(0.6))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)

                    Spacer(minLength: 40)
                }
                .padding(.horizontal, Theme.paddingMedium)
                .padding(.top, Theme.paddingSmall)
            }
            .background(Theme.backgroundCream)
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
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
}

#Preview {
    ProfileView()
        .environmentObject(VotingGuideStore.preview)
}
