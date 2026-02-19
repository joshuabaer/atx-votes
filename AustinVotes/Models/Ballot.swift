import Foundation

struct Ballot: Codable, Identifiable {
    let id: UUID
    var party: PrimaryBallot
    var electionDate: Date
    var electionName: String
    var districts: Districts
    var races: [Race]
    var propositions: [Proposition]

    struct Districts: Codable {
        var congressional: String?      // e.g. "District 37"
        var stateSenate: String?        // e.g. "District 14"
        var stateHouse: String?         // e.g. "District 48"
        var countyCommissioner: String? // e.g. "Precinct 2"
        var schoolBoard: String?        // e.g. "District 5"
    }
}

struct Race: Codable, Identifiable {
    let id: UUID
    var office: String                  // e.g. "U.S. Senator"
    var district: String?               // e.g. "District 37" — nil for statewide
    var candidates: [Candidate]
    var isContested: Bool
    var isKeyRace: Bool                 // star badge
    var recommendation: RaceRecommendation?

    var sortOrder: Int {
        // Federal > State > County > Local
        if office.contains("U.S. Senator") { return 0 }
        if office.contains("U.S. Rep") { return 1 }
        if office.contains("Governor") { return 10 }
        if office.contains("Lt. Governor") || office.contains("Lieutenant") { return 11 }
        if office.contains("Attorney General") { return 12 }
        if office.contains("Comptroller") { return 13 }
        if office.contains("Agriculture") { return 14 }
        if office.contains("Land") { return 15 }
        if office.contains("Railroad") { return 16 }
        if office.contains("State Rep") { return 20 }
        if office.contains("Supreme Court") { return 30 }
        if office.contains("Criminal Appeals") { return 31 }
        if office.contains("Court of Appeals") { return 32 }
        if office.contains("Board of Education") { return 40 }
        return 50
    }
}

struct Candidate: Codable, Identifiable {
    let id: UUID
    var name: String
    var party: String?
    var isIncumbent: Bool
    var isRecommended: Bool
    var summary: String                 // 1-2 sentence bio
    var background: String?             // detailed background
    var keyPositions: [String]
    var endorsements: [String]
    var pros: [String]
    var cons: [String]
    var fundraising: String?
    var polling: String?
}

struct RaceRecommendation: Codable {
    var candidateId: UUID
    var candidateName: String
    var reasoning: String               // why this candidate fits the voter's profile
    var strategicNotes: String?
    var caveats: String?
    var confidence: Confidence

    enum Confidence: String, Codable {
        case strong = "Strong Match"
        case moderate = "Good Match"
        case weak = "Best Available"
        case symbolic = "Symbolic Race"
    }
}

struct Proposition: Codable, Identifiable {
    let id: UUID
    var number: Int
    var title: String
    var description: String             // plain language explanation
    var recommendation: PropRecommendation
    var reasoning: String

    enum PropRecommendation: String, Codable {
        case leanYes = "Lean Yes"
        case leanNo = "Lean No"
        case yourCall = "Your Call"
    }
}
