import SwiftUI

struct BuildingGuideView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var animateStep = 0

    private let steps = [
        ("magnifyingglass", "Finding your ballot"),
        ("doc.text.magnifyingglass", "Looking up districts"),
        ("person.2.fill", "Researching candidates"),
        ("brain.head.profile", "Matching to your values"),
        ("checkmark.seal.fill", "Building recommendations"),
    ]

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Animated icon
            ZStack {
                Circle()
                    .fill(Theme.primaryBlue.opacity(0.08))
                    .frame(width: 140, height: 140)

                Circle()
                    .fill(Theme.primaryBlue.opacity(0.05))
                    .frame(width: 180, height: 180)
                    .scaleEffect(store.isLoading ? 1.1 : 1.0)
                    .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: store.isLoading)

                if store.guideComplete {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundColor(Theme.success)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.primaryBlue)
                }
            }

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
                        if index < animateStep {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(Theme.success)
                                .transition(.scale)
                        } else if index == animateStep && !store.guideComplete {
                            ProgressView()
                                .scaleEffect(0.8)
                                .frame(width: 20, height: 20)
                        } else {
                            Circle()
                                .fill(Color.gray.opacity(0.15))
                                .frame(width: 20, height: 20)
                        }

                        HStack(spacing: 8) {
                            Image(systemName: step.0)
                                .font(.system(size: 14))
                                .foregroundColor(index <= animateStep ? Theme.primaryBlue : Theme.textSecondary)
                                .frame(width: 20)
                            Text(step.1)
                                .font(Theme.callout)
                                .foregroundColor(index <= animateStep ? Theme.textPrimary : Theme.textSecondary)
                        }
                    }
                }
            }
            .padding(.horizontal, 40)

            Spacer()

            if let error = store.errorMessage {
                VStack(spacing: 12) {
                    Text(error)
                        .font(Theme.callout)
                        .foregroundColor(Theme.danger)
                        .multilineTextAlignment(.center)

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
        .onAppear { startStepAnimation() }
    }

    private func startStepAnimation() {
        // Animate through steps
        for i in 0..<steps.count {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 1.5) {
                withAnimation(.spring(response: 0.3)) {
                    animateStep = i
                }
            }
        }
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
