import Foundation

struct VoterProfile: Codable, Equatable {
    var topIssues: [Issue]
    var politicalSpectrum: PoliticalSpectrum
    var policyViews: [String: String]        // issue -> stance
    var admiredPoliticians: [String]
    var dislikedPoliticians: [String]
    var candidateQualities: [CandidateQuality]
    var primaryBallot: PrimaryBallot
    var address: Address?
    var summaryText: String?
    var districts: Ballot.Districts?

    static let empty = VoterProfile(
        topIssues: [],
        politicalSpectrum: .moderate,
        policyViews: [:],
        admiredPoliticians: [],
        dislikedPoliticians: [],
        candidateQualities: [],
        primaryBallot: .undecided,
        address: nil,
        summaryText: nil,
        districts: nil
    )
}

enum Issue: String, Codable, CaseIterable, Identifiable {
    case economy = "Economy & Cost of Living"
    case housing = "Housing"
    case safety = "Community Safety"
    case education = "Education"
    case healthcare = "Healthcare"
    case environment = "Environment & Climate"
    case infrastructure = "Grid & Infrastructure"
    case tech = "Tech & Innovation"
    case transportation = "Transportation"
    case immigration = "Immigration"
    case taxes = "Taxes"
    case civilRights = "Civil Rights"

    var id: String { rawValue }

    var localizedName: String {
        String(localized: String.LocalizationValue(rawValue))
    }

    var icon: String {
        switch self {
        case .economy: "dollarsign.circle"
        case .housing: "house"
        case .safety: "shield.checkered"
        case .education: "graduationcap"
        case .healthcare: "heart.circle"
        case .environment: "leaf"
        case .infrastructure: "bolt"
        case .tech: "cpu"
        case .transportation: "car"
        case .immigration: "globe.americas"
        case .taxes: "banknote"
        case .civilRights: "figure.2"
        }
    }
}

enum PoliticalSpectrum: String, Codable, CaseIterable, Identifiable {
    case progressive = "Progressive"
    case liberal = "Liberal"
    case moderate = "Moderate"
    case conservative = "Conservative"
    case libertarian = "Libertarian"
    case independent = "Independent / Issue-by-Issue"

    var id: String { rawValue }

    var localizedName: String {
        String(localized: String.LocalizationValue(rawValue))
    }

    var localizedDescription: String {
        switch self {
        case .progressive: String(localized: "Bold systemic change, social justice focused")
        case .liberal: String(localized: "Expand rights and services, government as a force for good")
        case .moderate: String(localized: "Pragmatic center, best ideas from both sides")
        case .conservative: String(localized: "Limited government, traditional values, fiscal discipline")
        case .libertarian: String(localized: "Maximum freedom, minimal government")
        case .independent: String(localized: "I decide issue by issue, not by party")
        }
    }
}

enum CandidateQuality: String, Codable, CaseIterable, Identifiable {
    case competence = "Competence & Track Record"
    case integrity = "Integrity & Honesty"
    case independence = "Independence"
    case experience = "Experience"
    case freshPerspective = "Fresh Perspective"
    case bipartisan = "Bipartisan / Works Across Aisle"
    case strongLeader = "Strong Leadership"
    case communityTies = "Community Ties"

    var id: String { rawValue }

    var localizedName: String {
        String(localized: String.LocalizationValue(rawValue))
    }
}

enum PrimaryBallot: String, Codable, CaseIterable, Identifiable {
    case republican = "Republican"
    case democrat = "Democrat"
    case undecided = "Not Sure Yet"

    var id: String { rawValue }

    var localizedName: String {
        String(localized: String.LocalizationValue(rawValue))
    }
}

struct Address: Codable, Equatable {
    var street: String
    var city: String
    var state: String
    var zip: String

    var formatted: String {
        "\(street), \(city), \(state) \(zip)"
    }
}
