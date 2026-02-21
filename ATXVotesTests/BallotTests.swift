import XCTest
@testable import ATXVotes

final class BallotTests: XCTestCase {

    // MARK: - Sample Data Loading

    func testSampleRepublicanLoads() {
        let ballot = Ballot.sampleRepublican
        XCTAssertFalse(ballot.races.isEmpty)
        XCTAssertFalse(ballot.propositions.isEmpty)
        XCTAssertEqual(ballot.party, .republican)
    }

    func testSampleDemocratLoads() {
        let ballot = Ballot.sampleDemocrat
        XCTAssertFalse(ballot.races.isEmpty)
        XCTAssertFalse(ballot.propositions.isEmpty)
        XCTAssertEqual(ballot.party, .democrat)
    }

    // MARK: - District Filtering

    func testFilteredKeepsStatewideRaces() {
        let ballot = Ballot.sampleRepublican
        let districts = Ballot.Districts(
            congressional: "District 99",
            stateSenate: nil,
            stateHouse: nil,
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)

        // Statewide races (district == nil) should be kept
        let statewideRaces = filtered.races.filter { $0.district == nil }
        XCTAssertFalse(statewideRaces.isEmpty, "Statewide races should be kept after filtering")
    }

    func testFilteredRemovesNonMatchingDistricts() {
        let ballot = Ballot.sampleRepublican
        let districts = Ballot.Districts(
            congressional: "District 99",
            stateSenate: nil,
            stateHouse: "District 99",
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)

        // District races that don't match should be removed
        let districtRaces = filtered.races.filter { $0.district != nil }
        for race in districtRaces {
            XCTAssertTrue(
                race.district == "District 99",
                "Race '\(race.office)' with district '\(race.district ?? "nil")' should have been filtered out"
            )
        }
    }

    func testFilteredKeepsMatchingDistricts() {
        let ballot = Ballot.sampleRepublican
        // Find an actual district from the ballot
        guard let districtRace = ballot.races.first(where: { $0.district != nil }) else {
            return // Skip if no district races
        }

        let districts = Ballot.Districts(
            congressional: districtRace.district,
            stateSenate: nil,
            stateHouse: nil,
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)

        let matchingRaces = filtered.races.filter { $0.district == districtRace.district }
        XCTAssertFalse(matchingRaces.isEmpty, "Matching district races should be kept")
    }

    func testFilteredUpdatesDistricts() {
        let ballot = Ballot.sampleRepublican
        let districts = Ballot.Districts(
            congressional: "District 37",
            stateSenate: "District 14",
            stateHouse: "District 48",
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)
        XCTAssertEqual(filtered.districts.congressional, "District 37")
        XCTAssertEqual(filtered.districts.stateSenate, "District 14")
        XCTAssertEqual(filtered.districts.stateHouse, "District 48")
    }

    func testFilteredPreservesPropositions() {
        let ballot = Ballot.sampleRepublican
        let districts = Ballot.Districts(
            congressional: "District 99",
            stateSenate: nil,
            stateHouse: nil,
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)
        XCTAssertEqual(filtered.propositions.count, ballot.propositions.count)
    }

    // MARK: - Codable

    func testBallotEncodeDecode() throws {
        let ballot = Ballot.sampleRepublican
        let data = try JSONEncoder().encode(ballot)
        let decoded = try JSONDecoder().decode(Ballot.self, from: data)
        XCTAssertEqual(decoded.electionName, ballot.electionName)
        XCTAssertEqual(decoded.races.count, ballot.races.count)
        XCTAssertEqual(decoded.propositions.count, ballot.propositions.count)
    }

    // MARK: - Race Sort Order

    func testRaceSortOrder() {
        let ballot = Ballot.sampleRepublican
        let sorted = ballot.races.sorted { $0.sortOrder < $1.sortOrder }

        // Federal races should come before state races
        if let senatorIdx = sorted.firstIndex(where: { $0.office.contains("Senator") }),
           let stateRepIdx = sorted.firstIndex(where: { $0.office.contains("State Rep") }) {
            XCTAssertLessThan(senatorIdx, stateRepIdx)
        }
    }

    // MARK: - Contested Races Parity

    func testRepublicanBallotHasContestedRaces() {
        let ballot = Ballot.sampleRepublican
        let contested = ballot.races.filter { $0.isContested }
        XCTAssertFalse(contested.isEmpty, "Republican ballot should have contested races")

        for race in contested {
            XCTAssertGreaterThan(race.candidates.count, 1,
                                 "Contested race '\(race.office)' should have multiple candidates")
        }
    }

    func testDemocratBallotHasContestedRaces() {
        let ballot = Ballot.sampleDemocrat
        let contested = ballot.races.filter { $0.isContested }
        XCTAssertFalse(contested.isEmpty, "Democrat ballot should have contested races")

        for race in contested {
            XCTAssertGreaterThan(race.candidates.count, 1,
                                 "Contested race '\(race.office)' should have multiple candidates")
        }
    }

    func testBothBallotsHaveComparableRaceCounts() {
        let rep = Ballot.sampleRepublican
        let dem = Ballot.sampleDemocrat

        // Both ballots should have a reasonable number of races
        XCTAssertGreaterThan(rep.races.count, 0, "Republican ballot should have races")
        XCTAssertGreaterThan(dem.races.count, 0, "Democrat ballot should have races")

        // Neither should be drastically smaller than the other
        let ratio = Double(min(rep.races.count, dem.races.count)) / Double(max(rep.races.count, dem.races.count))
        XCTAssertGreaterThan(ratio, 0.3,
                             "Ballots should have roughly comparable race counts (rep: \(rep.races.count), dem: \(dem.races.count))")
    }

    // MARK: - Encode/Decode Parity

    func testDemocratBallotEncodeDecode() throws {
        let ballot = Ballot.sampleDemocrat
        let data = try JSONEncoder().encode(ballot)
        let decoded = try JSONDecoder().decode(Ballot.self, from: data)
        XCTAssertEqual(decoded.electionName, ballot.electionName)
        XCTAssertEqual(decoded.races.count, ballot.races.count)
        XCTAssertEqual(decoded.propositions.count, ballot.propositions.count)
        XCTAssertEqual(decoded.party, .democrat)
    }

    // MARK: - District Filtering Parity

    func testDemocratFilteredKeepsStatewideRaces() {
        let ballot = Ballot.sampleDemocrat
        let districts = Ballot.Districts(
            congressional: "District 99",
            stateSenate: nil,
            stateHouse: nil,
            countyCommissioner: nil,
            schoolBoard: nil
        )
        let filtered = ballot.filtered(to: districts)

        let statewideRaces = filtered.races.filter { $0.district == nil }
        XCTAssertFalse(statewideRaces.isEmpty, "Democrat statewide races should be kept after filtering")
    }

    // MARK: - Proposition Enrichment Fields

    func testRepublicanPropositionsHaveEnrichmentFields() {
        let ballot = Ballot.sampleRepublican
        for prop in ballot.propositions {
            XCTAssertNotNil(prop.background,
                            "Republican Prop \(prop.number) missing background")
            XCTAssertNotNil(prop.fiscalImpact,
                            "Republican Prop \(prop.number) missing fiscalImpact")
            XCTAssertFalse(prop.supporters.isEmpty,
                           "Republican Prop \(prop.number) has no supporters")
            XCTAssertFalse(prop.opponents.isEmpty,
                           "Republican Prop \(prop.number) has no opponents")
            XCTAssertNotNil(prop.ifPasses,
                            "Republican Prop \(prop.number) missing ifPasses")
            XCTAssertNotNil(prop.ifFails,
                            "Republican Prop \(prop.number) missing ifFails")
        }
    }

    func testDemocratPropositionsHaveEnrichmentFields() {
        let ballot = Ballot.sampleDemocrat
        for prop in ballot.propositions {
            XCTAssertNotNil(prop.background,
                            "Democrat Prop \(prop.number) missing background")
            XCTAssertNotNil(prop.fiscalImpact,
                            "Democrat Prop \(prop.number) missing fiscalImpact")
            XCTAssertFalse(prop.supporters.isEmpty,
                           "Democrat Prop \(prop.number) has no supporters")
            XCTAssertFalse(prop.opponents.isEmpty,
                           "Democrat Prop \(prop.number) has no opponents")
            XCTAssertNotNil(prop.ifPasses,
                            "Democrat Prop \(prop.number) missing ifPasses")
            XCTAssertNotNil(prop.ifFails,
                            "Democrat Prop \(prop.number) missing ifFails")
        }
    }

    // MARK: - Candidate Required Fields

    func testRepublicanCandidatesHaveRequiredFields() {
        let ballot = Ballot.sampleRepublican
        for race in ballot.races {
            for candidate in race.candidates {
                XCTAssertFalse(candidate.name.isEmpty,
                               "\(race.office): candidate has empty name")
                XCTAssertFalse(candidate.summary.isEmpty,
                               "\(race.office): \(candidate.name) has empty summary")
            }
        }
    }

    func testDemocratCandidatesHaveRequiredFields() {
        let ballot = Ballot.sampleDemocrat
        for race in ballot.races {
            for candidate in race.candidates {
                XCTAssertFalse(candidate.name.isEmpty,
                               "\(race.office): candidate has empty name")
                XCTAssertFalse(candidate.summary.isEmpty,
                               "\(race.office): \(candidate.name) has empty summary")
            }
        }
    }

    // MARK: - Proposition Numbers Unique & Sequential

    func testRepublicanPropositionNumbersAreUnique() {
        let ballot = Ballot.sampleRepublican
        let numbers = ballot.propositions.map(\.number)
        XCTAssertEqual(numbers.count, Set(numbers).count,
                       "Republican proposition numbers should be unique")
    }

    func testDemocratPropositionNumbersAreUnique() {
        let ballot = Ballot.sampleDemocrat
        let numbers = ballot.propositions.map(\.number)
        XCTAssertEqual(numbers.count, Set(numbers).count,
                       "Democrat proposition numbers should be unique")
    }

    // MARK: - Backwards Compatibility (cached ballots without new fields)

    func testPropositionDecodesWithoutEnrichmentFields() throws {
        // Simulate a ballot cached before the enrichment fields were added
        let legacyJSON = """
        {
            "id": "00000000-0000-0000-0000-000000000000",
            "number": 1,
            "title": "Test Proposition",
            "description": "A test proposition",
            "recommendation": "Lean Yes",
            "reasoning": "Because testing"
        }
        """
        let data = legacyJSON.data(using: .utf8)!
        let prop = try JSONDecoder().decode(Proposition.self, from: data)
        XCTAssertEqual(prop.number, 1)
        XCTAssertEqual(prop.title, "Test Proposition")
        XCTAssertNil(prop.background)
        XCTAssertNil(prop.fiscalImpact)
        XCTAssertTrue(prop.supporters.isEmpty, "Supporters should default to []")
        XCTAssertTrue(prop.opponents.isEmpty, "Opponents should default to []")
        XCTAssertNil(prop.ifPasses)
        XCTAssertNil(prop.ifFails)
        XCTAssertNil(prop.caveats)
        XCTAssertNil(prop.confidence)
    }

    func testLegacyBallotDecodes() throws {
        // A full ballot encoded before enrichment fields existed
        let ballot = Ballot(
            id: UUID(),
            party: .republican,
            electionDate: Date(),
            electionName: "Test",
            districts: Ballot.Districts(),
            races: [],
            propositions: [
                Proposition(
                    id: UUID(), number: 1, title: "Test", description: "Desc",
                    recommendation: .leanYes, reasoning: "Reason"
                )
            ]
        )
        let encoded = try JSONEncoder().encode(ballot)
        let decoded = try JSONDecoder().decode(Ballot.self, from: encoded)
        XCTAssertEqual(decoded.propositions.count, 1)
        XCTAssertTrue(decoded.propositions[0].supporters.isEmpty)
        XCTAssertTrue(decoded.propositions[0].opponents.isEmpty)
    }

    // MARK: - Enrichment Field Encode/Decode Round-trip

    func testPropositionEnrichmentRoundTrip() throws {
        let prop = Proposition(
            id: UUID(), number: 5, title: "Test",
            description: "Desc", recommendation: .yourCall,
            reasoning: "Because",
            background: "Some background",
            fiscalImpact: "Non-binding",
            supporters: ["Org A", "Org B"],
            opponents: ["Org C"],
            ifPasses: "Good things",
            ifFails: "Nothing changes",
            caveats: "Watch out for X",
            confidence: .lean
        )
        let data = try JSONEncoder().encode(prop)
        let decoded = try JSONDecoder().decode(Proposition.self, from: data)
        XCTAssertEqual(decoded.background, "Some background")
        XCTAssertEqual(decoded.fiscalImpact, "Non-binding")
        XCTAssertEqual(decoded.supporters, ["Org A", "Org B"])
        XCTAssertEqual(decoded.opponents, ["Org C"])
        XCTAssertEqual(decoded.ifPasses, "Good things")
        XCTAssertEqual(decoded.ifFails, "Nothing changes")
        XCTAssertEqual(decoded.caveats, "Watch out for X")
        XCTAssertEqual(decoded.confidence, .lean)
    }

    // MARK: - JSON Data Integrity

    func testAllContestedRacesHaveRecommendations() {
        for (label, ballot) in [("Republican", Ballot.sampleRepublican), ("Democrat", Ballot.sampleDemocrat)] {
            for race in ballot.races where race.isContested {
                XCTAssertNotNil(race.recommendation,
                                "\(label) contested race '\(race.office)' missing recommendation")
            }
        }
    }

    func testUncontestedRacesHaveSingleCandidate() {
        for (label, ballot) in [("Republican", Ballot.sampleRepublican), ("Democrat", Ballot.sampleDemocrat)] {
            for race in ballot.races where !race.isContested {
                XCTAssertEqual(race.candidates.count, 1,
                               "\(label) uncontested race '\(race.office)' should have exactly 1 candidate but has \(race.candidates.count)")
            }
        }
    }

    func testPropositionRecommendationsAreValid() {
        for (label, ballot) in [("Republican", Ballot.sampleRepublican), ("Democrat", Ballot.sampleDemocrat)] {
            for prop in ballot.propositions {
                let valid: [Proposition.PropRecommendation] = [.leanYes, .leanNo, .yourCall]
                XCTAssertTrue(valid.contains(prop.recommendation),
                              "\(label) Prop \(prop.number) has invalid recommendation: \(prop.recommendation.rawValue)")
            }
        }
    }
}
