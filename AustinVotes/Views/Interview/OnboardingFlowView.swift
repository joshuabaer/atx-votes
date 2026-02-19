import SwiftUI

struct OnboardingFlowView: View {
    @EnvironmentObject var store: VotingGuideStore

    var body: some View {
        ZStack {
            Theme.backgroundCream.ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress bar (hidden on welcome and building)
                if store.currentPhase != .welcome && store.currentPhase != .building {
                    ProgressBarView(progress: store.progressFraction, phase: store.currentPhase)
                        .padding(.horizontal, Theme.paddingLarge)
                        .padding(.top, 8)
                }

                // Phase content
                Group {
                    switch store.currentPhase {
                    case .welcome:
                        WelcomeView()
                    case .issues:
                        IssuesPickerView()
                    case .spectrum:
                        SpectrumPickerView()
                    case .policyDeepDive:
                        PolicyDeepDiveView()
                    case .politicians:
                        PoliticianPickerView()
                    case .qualities:
                        QualitiesPickerView()
                    case .primaryChoice:
                        PrimaryPickerView()
                    case .address:
                        AddressEntryView()
                    case .building:
                        BuildingGuideView()
                    }
                }
                .id(store.currentPhase)
            }
        }
    }
}

// MARK: - Progress Bar

struct ProgressBarView: View {
    let progress: Double
    let phase: InterviewPhase

    var body: some View {
        VStack(spacing: 6) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.gray.opacity(0.15))
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(Theme.primaryBlue)
                        .frame(width: geo.size.width * progress, height: 6)
                        .animation(.spring(response: 0.4), value: progress)
                }
            }
            .frame(height: 6)

            HStack {
                Text(phase.title)
                    .font(Theme.caption)
                    .foregroundColor(Theme.textSecondary)
                Spacer()
                Text("Step \(phase.stepNumber) of \(phase.totalSteps)")
                    .font(Theme.caption)
                    .foregroundColor(Theme.textSecondary)
            }
        }
    }
}

// MARK: - Welcome Screen

struct WelcomeView: View {
    @EnvironmentObject var store: VotingGuideStore

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 24) {
                // Icon
                ZStack {
                    Circle()
                        .fill(Theme.primaryBlue.opacity(0.1))
                        .frame(width: 120, height: 120)
                    Image(systemName: "checkmark.seal.fill")
                        .font(.system(size: 56))
                        .foregroundColor(Theme.primaryBlue)
                }

                VStack(spacing: 12) {
                    Text("ATX Votes")
                        .font(Theme.largeTitle)
                        .foregroundColor(Theme.textPrimary)

                    Text("Your personalized Austin\nvoting guide in 5 minutes")
                        .font(Theme.title2)
                        .foregroundColor(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                }

                VStack(alignment: .leading, spacing: 16) {
                    WelcomeFeatureRow(icon: "person.fill.questionmark", text: "Quick interview about your values")
                    WelcomeFeatureRow(icon: "doc.text.magnifyingglass", text: "We research every race on your ballot")
                    WelcomeFeatureRow(icon: "star.fill", text: "Personalized recommendations")
                    WelcomeFeatureRow(icon: "list.clipboard.fill", text: "Printable cheat sheet for the polls")
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, Theme.paddingLarge)

            Spacer()

            VStack(spacing: 12) {
                Button("Build My Voting Guide") {
                    store.advancePhase()
                }
                .buttonStyle(PrimaryButtonStyle())

                Text("March 3, 2026 Primary Election")
                    .font(Theme.caption)
                    .foregroundColor(Theme.textSecondary)
            }
            .padding(.horizontal, Theme.paddingLarge)
            .padding(.bottom, 40)
        }
    }
}

struct WelcomeFeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(Theme.primaryBlue)
                .frame(width: 28)
            Text(text)
                .font(Theme.body)
                .foregroundColor(Theme.textPrimary)
        }
    }
}

#Preview {
    OnboardingFlowView()
        .environmentObject(VotingGuideStore())
}
