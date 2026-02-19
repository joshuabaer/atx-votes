import Foundation

struct InterviewQuestion: Identifiable {
    let id: Int
    let phase: InterviewPhase
    let text: String
    let subtitle: String?
    let type: QuestionType
    let options: [QuestionOption]
    let allowsMultiple: Bool
    let allowsCustom: Bool

    struct QuestionOption: Identifiable {
        let id = UUID()
        let label: String
        let icon: String?
        let description: String?
    }

    enum QuestionType {
        case singleChoice
        case multipleChoice
        case freeText
        case address
        case politicianPicker
    }
}

enum InterviewPhase: Int, CaseIterable {
    case welcome = 0
    case issues = 1
    case spectrum = 2
    case policyDeepDive = 3
    case politicians = 4
    case qualities = 5
    case primaryChoice = 6
    case address = 7
    case building = 8

    var title: String {
        switch self {
        case .welcome: "Welcome"
        case .issues: "Your Issues"
        case .spectrum: "Your Approach"
        case .policyDeepDive: "Your Views"
        case .politicians: "Politicians"
        case .qualities: "What Matters"
        case .primaryChoice: "Your Primary"
        case .address: "Your Address"
        case .building: "Building Guide"
        }
    }

    var stepNumber: Int { rawValue }
    var totalSteps: Int { Self.allCases.count - 2 } // exclude welcome and building
}

// MARK: - Interview Question Bank

enum InterviewQuestions {
    static let topIssues = InterviewQuestion(
        id: 1,
        phase: .issues,
        text: "What issues matter most to you?",
        subtitle: "Pick your top 3-5. We'll dig deeper on these.",
        type: .multipleChoice,
        options: Issue.allCases.map { issue in
            InterviewQuestion.QuestionOption(
                label: issue.rawValue,
                icon: issue.icon,
                description: nil
            )
        },
        allowsMultiple: true,
        allowsCustom: true
    )

    static let politicalSpectrum = InterviewQuestion(
        id: 2,
        phase: .spectrum,
        text: "How would you describe your political approach?",
        subtitle: "There's no wrong answer. This helps us understand your lens.",
        type: .singleChoice,
        options: PoliticalSpectrum.allCases.map { spectrum in
            InterviewQuestion.QuestionOption(
                label: spectrum.rawValue,
                icon: nil,
                description: spectrumDescription(spectrum)
            )
        },
        allowsMultiple: false,
        allowsCustom: true
    )

    static let candidateQualities = InterviewQuestion(
        id: 5,
        phase: .qualities,
        text: "What do you value most in a candidate?",
        subtitle: "Pick 2-3 that matter most.",
        type: .multipleChoice,
        options: CandidateQuality.allCases.map { quality in
            InterviewQuestion.QuestionOption(
                label: quality.rawValue,
                icon: nil,
                description: nil
            )
        },
        allowsMultiple: true,
        allowsCustom: false
    )

    static let primaryChoice = InterviewQuestion(
        id: 6,
        phase: .primaryChoice,
        text: "Which primary ballot will you take?",
        subtitle: "Texas has open primaries — you choose at the polls. You can only vote in one.",
        type: .singleChoice,
        options: [
            InterviewQuestion.QuestionOption(
                label: "Republican",
                icon: "r.circle.fill",
                description: "Vote in Republican primary races"
            ),
            InterviewQuestion.QuestionOption(
                label: "Democrat",
                icon: "d.circle.fill",
                description: "Vote in Democratic primary races"
            ),
            InterviewQuestion.QuestionOption(
                label: "Not Sure Yet",
                icon: "questionmark.circle",
                description: "We'll help you think through the strategic considerations"
            ),
        ],
        allowsMultiple: false,
        allowsCustom: false
    )

    // Deep-dive questions generated based on top issues
    static func housingDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 100,
            phase: .policyDeepDive,
            text: "On housing, where do you land?",
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: "Build, build, build", icon: nil, description: "Ease zoning, encourage density, let the market work"),
                .init(label: "Smart growth", icon: nil, description: "More housing with affordability guardrails"),
                .init(label: "Protect neighborhoods", icon: nil, description: "Preserve character, limit density changes"),
                .init(label: "It's complicated", icon: nil, description: "Case by case — depends on the neighborhood"),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func safetyDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 101,
            phase: .policyDeepDive,
            text: "On public safety, what's your approach?",
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: "Fully fund police", icon: nil, description: "Hire more officers, strong prosecution"),
                .init(label: "Reform + fund", icon: nil, description: "Fund police but invest in alternatives too"),
                .init(label: "Redirect funding", icon: nil, description: "Move money toward prevention and social services"),
                .init(label: "Major overhaul needed", icon: nil, description: "Fundamental changes to how we approach safety"),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func economyDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 102,
            phase: .policyDeepDive,
            text: "On taxes and government spending?",
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: "Cut taxes & spending", icon: nil, description: "Government does too much, let people keep their money"),
                .init(label: "Redirect spending", icon: nil, description: "Same budget, better priorities"),
                .init(label: "Invest more if it works", icon: nil, description: "Willing to pay more for effective programs"),
                .init(label: "Tax the wealthy more", icon: nil, description: "Fund services through progressive taxation"),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func techDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 103,
            phase: .policyDeepDive,
            text: "On tech and AI regulation?",
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: "Hands off", icon: nil, description: "Let innovation lead, regulate later if needed"),
                .init(label: "Light touch", icon: nil, description: "Basic guardrails but don't slow things down"),
                .init(label: "Proactive regulation", icon: nil, description: "Get ahead of problems before they happen"),
                .init(label: "Strong oversight", icon: nil, description: "Tech companies have too much unchecked power"),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    private static func spectrumDescription(_ s: PoliticalSpectrum) -> String {
        switch s {
        case .progressive: "Bold systemic change, social justice focused"
        case .liberal: "Expand rights and services, government as a force for good"
        case .moderate: "Pragmatic center, best ideas from both sides"
        case .conservative: "Limited government, traditional values, fiscal discipline"
        case .libertarian: "Maximum freedom, minimal government"
        case .independent: "I decide issue by issue, not by party"
        }
    }
}
