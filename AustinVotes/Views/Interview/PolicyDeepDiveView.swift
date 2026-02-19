import SwiftUI

struct PolicyDeepDiveView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var currentQuestionIndex = 0
    @State private var answers: [String: String] = [:]

    private var deepDiveQuestions: [InterviewQuestion] {
        var questions: [InterviewQuestion] = []
        var hasEconomy = false
        for issue in store.voterProfile.topIssues.prefix(4) {
            switch issue {
            case .housing: questions.append(InterviewQuestions.housingDeepDive())
            case .safety: questions.append(InterviewQuestions.safetyDeepDive())
            case .economy, .taxes:
                if !hasEconomy {
                    questions.append(InterviewQuestions.economyDeepDive())
                    hasEconomy = true
                }
            case .tech: questions.append(InterviewQuestions.techDeepDive())
            case .education: questions.append(InterviewQuestions.educationDeepDive())
            case .healthcare: questions.append(InterviewQuestions.healthcareDeepDive())
            case .environment: questions.append(InterviewQuestions.environmentDeepDive())
            case .infrastructure: questions.append(InterviewQuestions.infrastructureDeepDive())
            case .transportation: questions.append(InterviewQuestions.transportationDeepDive())
            case .immigration: questions.append(InterviewQuestions.immigrationDeepDive())
            case .civilRights: questions.append(InterviewQuestions.civilRightsDeepDive())
            }
        }
        return questions
    }

    private var currentQuestion: InterviewQuestion? {
        guard currentQuestionIndex < deepDiveQuestions.count else { return nil }
        return deepDiveQuestions[currentQuestionIndex]
    }

    var body: some View {
        VStack(spacing: 0) {
            if let question = currentQuestion {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Sub-progress
                        HStack(spacing: 4) {
                            ForEach(0..<deepDiveQuestions.count, id: \.self) { i in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(i <= currentQuestionIndex ? Theme.primaryBlue : Color.gray.opacity(0.2))
                                    .frame(height: 4)
                            }
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text(question.text)
                                .font(Theme.title)
                                .foregroundColor(Theme.textPrimary)
                            if let subtitle = question.subtitle {
                                Text(subtitle)
                                    .font(Theme.callout)
                                    .foregroundColor(Theme.textSecondary)
                            }
                        }

                        VStack(spacing: 12) {
                            ForEach(question.options) { option in
                                PolicyOptionButton(
                                    label: option.label,
                                    description: option.description,
                                    isSelected: answers[question.text] == option.label
                                ) {
                                    withAnimation(.spring(response: 0.25)) {
                                        answers[question.text] = option.label
                                    }
                                    // Auto-advance after a short delay
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                                        store.setPolicyView(issue: question.text, stance: option.label)
                                        if currentQuestionIndex < deepDiveQuestions.count - 1 {
                                            withAnimation(.easeInOut(duration: 0.3)) {
                                                currentQuestionIndex += 1
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, Theme.paddingLarge)
                    .padding(.top, Theme.paddingLarge)
                    .padding(.bottom, 100)
                }
            } else {
                // No deep dive questions — skip
                VStack(spacing: 16) {
                    Text("Got it!")
                        .font(Theme.title)
                    Text("Moving on...")
                        .font(Theme.callout)
                        .foregroundColor(Theme.textSecondary)
                }
                .onAppear { store.advancePhase() }
            }

            VStack(spacing: 0) {
                Divider()
                HStack {
                    Button("Back") {
                        if currentQuestionIndex > 0 {
                            withAnimation { currentQuestionIndex -= 1 }
                        } else {
                            store.goBackPhase()
                        }
                    }
                    .font(Theme.headline)
                    .foregroundColor(Theme.textSecondary)
                    .frame(width: 80)

                    Button("Continue") {
                        if currentQuestionIndex < deepDiveQuestions.count - 1 {
                            withAnimation { currentQuestionIndex += 1 }
                        } else {
                            store.advancePhase()
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(currentQuestion != nil && answers[currentQuestion!.text] == nil)
                    .opacity(currentQuestion != nil && answers[currentQuestion!.text] == nil ? 0.5 : 1)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

struct PolicyOptionButton: View {
    let label: String
    let description: String?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Circle()
                    .fill(isSelected ? Theme.primaryBlue : Color.clear)
                    .frame(width: 22, height: 22)
                    .overlay(
                        Circle()
                            .strokeBorder(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.35), lineWidth: 2)
                    )
                    .overlay(
                        isSelected ? Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                        : nil
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(Theme.headline)
                        .foregroundColor(Theme.textPrimary)
                    if let description {
                        Text(description)
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                }

                Spacer()
            }
            .padding(14)
            .background(isSelected ? Theme.primaryBlue.opacity(0.06) : Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                    .strokeBorder(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.15), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    PolicyDeepDiveView()
        .environmentObject({
            let store = VotingGuideStore()
            store.voterProfile.topIssues = [.housing, .safety, .economy, .tech]
            return store
        }())
}
