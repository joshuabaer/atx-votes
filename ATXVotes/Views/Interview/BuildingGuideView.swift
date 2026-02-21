import SwiftUI

/// Self-contained pulse animation that won't be disrupted by parent animation modifiers.
private struct PulseScale: ViewModifier {
    let active: Bool
    @State private var pulsing = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(pulsing ? 1.1 : 1.0)
            .onChange(of: active) {
                if active {
                    withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                        pulsing = true
                    }
                } else {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        pulsing = false
                    }
                }
            }
            .onAppear {
                if active {
                    withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                        pulsing = true
                    }
                }
            }
    }
}

struct BuildingGuideView: View {
    @EnvironmentObject var store: VotingGuideStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var steps: [(icon: String, label: String, emoji: String)] {
        let demFirst = store.demFirstOrder
        let firstParty = (icon: "brain.head.profile",
                          label: demFirst ? "Researching Democrats" : "Researching Republicans",
                          emoji: demFirst ? "🫏" : "🐘")
        let secondParty = (icon: "brain.head.profile",
                           label: demFirst ? "Researching Republicans" : "Researching Democrats",
                           emoji: demFirst ? "🐘" : "🫏")
        return [
            ("magnifyingglass", "Finding your ballot", "🔍"),
            ("doc.text.magnifyingglass", "Looking up districts", "🗺️"),
            ("person.2.fill", "Researching candidates", "👥"),
            firstParty,
            secondParty,
            ("checkmark.seal.fill", "Finalizing recommendations", "✨"),
        ]
    }

    /// Tint color for the pulsing circle behind the current step's emoji.
    private var circleTint: Color {
        let emoji = steps[currentStep].emoji
        if emoji == "🐘" { return Color.red }
        if emoji == "🫏" { return Color.blue }
        return Theme.primaryBlue
    }

    /// Which step we're on, derived from the store's loading message.
    private var currentStep: Int {
        let message = store.loadingMessage
        let demFirst = store.demFirstOrder
        if message.contains("Finalizing") { return 5 }
        if demFirst {
            if message.contains("Republican") { return 4 }
            if message.contains("Democrat") { return 3 }
        } else {
            if message.contains("Democrat") { return 4 }
            if message.contains("Republican") { return 3 }
        }
        if message.contains("Researching") { return 2 }
        if message.contains("districts") { return 1 }
        return 0
    }

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Animated icon
            ZStack {
                Circle()
                    .fill(circleTint.opacity(0.08))
                    .frame(width: 140, height: 140)
                    .animation(.easeInOut(duration: 0.3), value: circleTint)

                Circle()
                    .fill(circleTint.opacity(0.05))
                    .frame(width: 180, height: 180)
                    .modifier(PulseScale(active: store.isLoading && !reduceMotion))
                    .animation(.easeInOut(duration: 0.3), value: circleTint)

                if store.guideComplete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 74))
                        .foregroundColor(Theme.success)
                        .transition(reduceMotion ? .opacity : .scale.combined(with: .opacity))
                        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: store.guideComplete)
                } else {
                    Text(steps[currentStep].emoji)
                        .font(.system(size: 64))
                        .id(currentStep)
                        .transition(.opacity)
                        .animation(.easeInOut(duration: 0.25), value: currentStep)
                }
            }
            .frame(width: 180, height: 180)

            VStack(spacing: 8) {
                Text(store.guideComplete ? "Your guide is ready!" : store.loadingMessage)
                    .font(Theme.title2)
                    .foregroundColor(Theme.textPrimary)
                    .animation(.easeInOut, value: store.loadingMessage)

                if !store.guideComplete {
                    Text("This takes about 30 seconds")
                        .font(Theme.callout)
                        .foregroundColor(Theme.textSecondary)
                }
            }

            // Step checklist
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(spacing: 12) {
                        if store.guideComplete || index < currentStep {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Theme.success)
                                .transition(.scale)
                        } else if index == currentStep {
                            ProgressView()
                                .scaleEffect(0.8)
                                .frame(width: 20, height: 20)
                        } else {
                            Circle()
                                .fill(Color.gray.opacity(0.15))
                                .frame(width: 20, height: 20)
                        }

                        HStack(spacing: 8) {
                            Image(systemName: step.icon)
                                .font(.system(size: 18))
                                .foregroundColor(store.guideComplete || index <= currentStep ? Theme.primaryBlue : Theme.textSecondary)
                                .frame(width: 20)
                            Text(step.label)
                                .font(Theme.callout)
                                .foregroundColor(store.guideComplete || index <= currentStep ? Theme.textPrimary : Theme.textSecondary)
                                .lineLimit(1)
                        }
                    }
                    .animation(.spring(response: 0.3), value: currentStep)
                }
            }
            .padding(.horizontal, 40)

            Spacer()

            if store.guideComplete {
                VStack(spacing: 12) {
                    ShareLink(item: shareAppMessage) {
                        Label("Share ATX Votes", systemImage: "square.and.arrow.up")
                            .font(Theme.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Theme.primaryBlue.opacity(0.1))
                            .foregroundColor(Theme.primaryBlue)
                            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                    }

                    Text("Help your friends vote informed!")
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            if let error = store.errorMessage {
                VStack(spacing: 12) {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundColor(Theme.danger)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .textSelection(.enabled)

                    Button("Try Again") {
                        store.errorMessage = nil
                        Task { await store.buildVotingGuide() }
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.bottom, 40)
            }
        }
    }

    private var shareAppMessage: String {
        "I just built my personalized voting guide for the March 2026 Texas primary with ATX Votes! Build yours in 5 minutes and know exactly who to vote for."
    }
}

#Preview("Loading") {
    BuildingGuideView()
        .environmentObject({
            let store = VotingGuideStore()
            store.isLoading = true
            return store
        }())
}

#Preview("Complete") {
    BuildingGuideView()
        .environmentObject({
            let store = VotingGuideStore()
            store.guideComplete = true
            return store
        }())
}
