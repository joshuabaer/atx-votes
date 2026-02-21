import Foundation

struct InterviewQuestion: Identifiable {
    let id: Int
    let phase: InterviewPhase
    let key: String             // stable English key for persistence/API
    let text: String            // localized display text
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
    case qualities = 4
    case address = 5
    case building = 6

    var title: String {
        switch self {
        case .welcome: String(localized: "Welcome")
        case .issues: String(localized: "Your Issues")
        case .spectrum: String(localized: "Your Approach")
        case .policyDeepDive: String(localized: "Your Views")
        case .qualities: String(localized: "What Matters")
        case .address: String(localized: "Your Address")
        case .building: String(localized: "Building Guide")
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
        key: "top_issues",
        text: String(localized: "What issues matter most to you?"),
        subtitle: String(localized: "Pick your top 3-5. We'll dig deeper on these."),
        type: .multipleChoice,
        options: Issue.allCases.map { issue in
            InterviewQuestion.QuestionOption(
                label: issue.localizedName,
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
        key: "political_spectrum",
        text: String(localized: "How would you describe your political approach?"),
        subtitle: String(localized: "There's no wrong answer. This helps us understand your lens."),
        type: .singleChoice,
        options: PoliticalSpectrum.allCases.map { spectrum in
            InterviewQuestion.QuestionOption(
                label: spectrum.localizedName,
                icon: nil,
                description: spectrum.localizedDescription
            )
        },
        allowsMultiple: false,
        allowsCustom: true
    )

    static let candidateQualities = InterviewQuestion(
        id: 5,
        phase: .qualities,
        key: "candidate_qualities",
        text: String(localized: "What do you value most in a candidate?"),
        subtitle: String(localized: "Pick 2-3 that matter most."),
        type: .multipleChoice,
        options: CandidateQuality.allCases.map { quality in
            InterviewQuestion.QuestionOption(
                label: quality.localizedName,
                icon: nil,
                description: nil
            )
        },
        allowsMultiple: true,
        allowsCustom: false
    )

    // Deep-dive questions generated based on top issues
    static func housingDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 100,
            phase: .policyDeepDive,
            key: "On housing, where do you land?",
            text: String(localized: "On housing, where do you land?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Build, build, build"), icon: nil, description: String(localized: "Ease zoning, encourage density, let the market work")),
                .init(label: String(localized: "Smart growth"), icon: nil, description: String(localized: "More housing with affordability guardrails")),
                .init(label: String(localized: "Protect neighborhoods"), icon: nil, description: String(localized: "Preserve character, limit density changes")),
                .init(label: String(localized: "It's complicated"), icon: nil, description: String(localized: "Case by case — depends on the neighborhood")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func safetyDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 101,
            phase: .policyDeepDive,
            key: "On public safety, what's your approach?",
            text: String(localized: "On public safety, what's your approach?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Fully fund police"), icon: nil, description: String(localized: "Hire more officers, strong prosecution")),
                .init(label: String(localized: "Reform + fund"), icon: nil, description: String(localized: "Fund police but invest in alternatives too")),
                .init(label: String(localized: "Redirect funding"), icon: nil, description: String(localized: "Move money toward prevention and social services")),
                .init(label: String(localized: "Major overhaul needed"), icon: nil, description: String(localized: "Fundamental changes to how we approach safety")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func economyDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 102,
            phase: .policyDeepDive,
            key: "On taxes and government spending?",
            text: String(localized: "On taxes and government spending?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Cut taxes & spending"), icon: nil, description: String(localized: "Government does too much, let people keep their money")),
                .init(label: String(localized: "Redirect spending"), icon: nil, description: String(localized: "Same budget, better priorities")),
                .init(label: String(localized: "Invest more if it works"), icon: nil, description: String(localized: "Willing to pay more for effective programs")),
                .init(label: String(localized: "Tax the wealthy more"), icon: nil, description: String(localized: "Fund services through progressive taxation")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func techDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 103,
            phase: .policyDeepDive,
            key: "On tech and AI regulation?",
            text: String(localized: "On tech and AI regulation?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Hands off"), icon: nil, description: String(localized: "Let innovation lead, regulate later if needed")),
                .init(label: String(localized: "Light touch"), icon: nil, description: String(localized: "Basic guardrails but don't slow things down")),
                .init(label: String(localized: "Proactive regulation"), icon: nil, description: String(localized: "Get ahead of problems before they happen")),
                .init(label: String(localized: "Strong oversight"), icon: nil, description: String(localized: "Tech companies have too much unchecked power")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func educationDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 104,
            phase: .policyDeepDive,
            key: "On public education, what's your priority?",
            text: String(localized: "On public education, what's your priority?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "School choice first"), icon: nil, description: String(localized: "Vouchers, charters, let parents decide")),
                .init(label: String(localized: "Fix public schools"), icon: nil, description: String(localized: "More funding and support for neighborhood schools")),
                .init(label: String(localized: "Teacher-focused"), icon: nil, description: String(localized: "Raise pay, reduce class sizes, trust educators")),
                .init(label: String(localized: "Back to basics"), icon: nil, description: String(localized: "Focus on core academics, less politics in schools")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func healthcareDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 105,
            phase: .policyDeepDive,
            key: "On healthcare, where do you stand?",
            text: String(localized: "On healthcare, where do you stand?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Free market"), icon: nil, description: String(localized: "Less regulation, more competition to lower costs")),
                .init(label: String(localized: "Expand Medicaid"), icon: nil, description: String(localized: "Texas should accept federal Medicaid expansion")),
                .init(label: String(localized: "Universal coverage"), icon: nil, description: String(localized: "Everyone deserves healthcare regardless of income")),
                .init(label: String(localized: "Local solutions"), icon: nil, description: String(localized: "Community health centers and county programs")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func environmentDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 106,
            phase: .policyDeepDive,
            key: "On environment and climate?",
            text: String(localized: "On environment and climate?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Don't overreact"), icon: nil, description: String(localized: "Protect energy jobs, market-driven solutions")),
                .init(label: String(localized: "All of the above"), icon: nil, description: String(localized: "Renewables and fossil fuels, pragmatic transition")),
                .init(label: String(localized: "Go green fast"), icon: nil, description: String(localized: "Aggressive renewable targets and climate action")),
                .init(label: String(localized: "Local focus"), icon: nil, description: String(localized: "Clean air and water in Austin, green spaces, urban heat")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func infrastructureDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 107,
            phase: .policyDeepDive,
            key: "On the power grid and infrastructure?",
            text: String(localized: "On the power grid and infrastructure?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Deregulate more"), icon: nil, description: String(localized: "Competition drives reliability, less ERCOT control")),
                .init(label: String(localized: "Weatherize & invest"), icon: nil, description: String(localized: "Mandate upgrades, spend what it takes to prevent outages")),
                .init(label: String(localized: "Connect the grid"), icon: nil, description: String(localized: "Link Texas to national grid for backup")),
                .init(label: String(localized: "Local resilience"), icon: nil, description: String(localized: "Microgrids, batteries, community-level solutions")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func transportationDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 108,
            phase: .policyDeepDive,
            key: "On Austin transportation, what's the priority?",
            text: String(localized: "On Austin transportation, what's the priority?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Build more roads"), icon: nil, description: String(localized: "Expand highways and reduce congestion for drivers")),
                .init(label: String(localized: "Public transit"), icon: nil, description: String(localized: "Light rail, better buses, less car dependence")),
                .init(label: String(localized: "Balanced approach"), icon: nil, description: String(localized: "Roads, transit, bikes, and walkability together")),
                .init(label: String(localized: "Remote work first"), icon: nil, description: String(localized: "Reduce the need to commute in the first place")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func immigrationDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 109,
            phase: .policyDeepDive,
            key: "On immigration, what's your view?",
            text: String(localized: "On immigration, what's your view?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Secure the border"), icon: nil, description: String(localized: "Enforcement first, then talk about reform")),
                .init(label: String(localized: "Enforce but reform"), icon: nil, description: String(localized: "Secure borders AND create legal pathways")),
                .init(label: String(localized: "Welcoming approach"), icon: nil, description: String(localized: "Immigrants strengthen Austin, expand protections")),
                .init(label: String(localized: "Local isn't federal"), icon: nil, description: String(localized: "City shouldn't spend resources on federal immigration enforcement")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }

    static func civilRightsDeepDive() -> InterviewQuestion {
        InterviewQuestion(
            id: 110,
            phase: .policyDeepDive,
            key: "On civil rights and equality?",
            text: String(localized: "On civil rights and equality?"),
            subtitle: nil,
            type: .singleChoice,
            options: [
                .init(label: String(localized: "Equal treatment"), icon: nil, description: String(localized: "Same rules for everyone, no special categories")),
                .init(label: String(localized: "Protect what we have"), icon: nil, description: String(localized: "Maintain current protections, don't roll them back")),
                .init(label: String(localized: "Expand protections"), icon: nil, description: String(localized: "Stronger anti-discrimination laws and enforcement")),
                .init(label: String(localized: "Systemic change"), icon: nil, description: String(localized: "Address root causes of inequality, not just symptoms")),
            ],
            allowsMultiple: false,
            allowsCustom: true
        )
    }
}
