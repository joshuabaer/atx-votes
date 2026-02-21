import Foundation
import os

private let logger = Logger(subsystem: "app.atxvotes", category: "ElectionData")

// MARK: - Election Data Loader
// Loads ballot data from bundled JSON files in ElectionData/.
// To update for a new election: edit or replace the JSON files — no Swift changes needed.

enum ElectionDataLoader {
    static func loadBallot(from filename: String) -> Ballot? {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        do {
            let raw = try JSONDecoder().decode(RawBallot.self, from: data)
            return raw.toBallot()
        } catch {
            logger.error("Failed to decode \(filename).json — \(error.localizedDescription)")
            return nil
        }
    }
}

// MARK: - JSON-friendly models (no UUIDs, simple strings for enums/dates)

private struct RawBallot: Decodable {
    let electionName: String
    let electionDate: String        // "2026-03-03"
    let party: String               // "republican" or "democrat"
    let districts: RawDistricts
    let races: [RawRace]
    let propositions: [RawProposition]

    func toBallot() -> Ballot {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let date = dateFormatter.date(from: electionDate) ?? Date()

        let primaryBallot: PrimaryBallot = switch party {
        case "democrat": .democrat
        case "republican": .republican
        default: .undecided
        }

        return Ballot(
            id: UUID(),
            party: primaryBallot,
            electionDate: date,
            electionName: electionName,
            districts: Ballot.Districts(
                congressional: districts.congressional,
                stateSenate: districts.stateSenate,
                stateHouse: districts.stateHouse,
                countyCommissioner: districts.countyCommissioner,
                schoolBoard: districts.schoolBoard
            ),
            races: races.map { $0.toRace() },
            propositions: propositions.map { $0.toProposition() }
        )
    }
}

private struct RawDistricts: Decodable {
    let congressional: String?
    let stateSenate: String?
    let stateHouse: String?
    let countyCommissioner: String?
    let schoolBoard: String?
}

private struct RawRace: Decodable {
    let office: String
    let district: String?
    let isContested: Bool
    let isKeyRace: Bool
    let candidates: [RawCandidate]
    let recommendation: RawRecommendation?

    func toRace() -> Race {
        Race(
            id: UUID(),
            office: office,
            district: district,
            candidates: candidates.map { $0.toCandidate() },
            isContested: isContested,
            isKeyRace: isKeyRace,
            recommendation: recommendation?.toRecommendation()
        )
    }
}

private struct RawCandidate: Decodable {
    let name: String
    let party: String?
    let isIncumbent: Bool
    let isRecommended: Bool
    let summary: String
    let background: String?
    let keyPositions: [String]
    let endorsements: [String]
    let pros: [String]
    let cons: [String]
    let fundraising: String?
    let polling: String?

    func toCandidate() -> Candidate {
        Candidate(
            id: UUID(),
            name: name,
            party: party,
            isIncumbent: isIncumbent,
            isRecommended: isRecommended,
            summary: summary,
            background: background,
            keyPositions: keyPositions,
            endorsements: endorsements,
            pros: pros,
            cons: cons,
            fundraising: fundraising,
            polling: polling
        )
    }
}

private struct RawRecommendation: Decodable {
    let candidateName: String
    let reasoning: String
    let strategicNotes: String?
    let caveats: String?
    let confidence: String          // "Strong Match", "Good Match", etc.

    func toRecommendation() -> RaceRecommendation {
        RaceRecommendation(
            candidateId: UUID(),
            candidateName: candidateName,
            reasoning: reasoning,
            strategicNotes: strategicNotes,
            caveats: caveats,
            confidence: RaceRecommendation.Confidence(rawValue: confidence) ?? .moderate
        )
    }
}

private struct RawProposition: Decodable {
    let number: Int
    let title: String
    let description: String
    let recommendation: String      // "Lean Yes", "Lean No", "Your Call"
    let reasoning: String
    let background: String?
    let fiscalImpact: String?
    let supporters: [String]?
    let opponents: [String]?
    let ifPasses: String?
    let ifFails: String?

    func toProposition() -> Proposition {
        Proposition(
            id: UUID(),
            number: number,
            title: title,
            description: description,
            recommendation: Proposition.PropRecommendation(rawValue: recommendation) ?? .yourCall,
            reasoning: reasoning,
            background: background,
            fiscalImpact: fiscalImpact,
            supporters: supporters ?? [],
            opponents: opponents ?? [],
            ifPasses: ifPasses,
            ifFails: ifFails
        )
    }
}

// MARK: - Ballot Extension (sample data accessors)

extension Ballot {
    static var sampleRepublican: Ballot {
        ElectionDataLoader.loadBallot(from: "republican_primary_2026") ?? fallbackRepublican
    }

    static var sampleDemocrat: Ballot {
        ElectionDataLoader.loadBallot(from: "democrat_primary_2026") ?? fallbackDemocrat
    }

    // Minimal fallbacks in case JSON fails to load
    private static var fallbackRepublican: Ballot {
        Ballot(
            id: UUID(),
            party: .republican,
            electionDate: DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date ?? Date(),
            electionName: "March 2026 Republican Primary",
            districts: Districts(),
            races: [],
            propositions: []
        )
    }

    private static var fallbackDemocrat: Ballot {
        Ballot(
            id: UUID(),
            party: .democrat,
            electionDate: DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date ?? Date(),
            electionName: "March 2026 Democratic Primary",
            districts: Districts(),
            races: [],
            propositions: []
        )
    }
}
