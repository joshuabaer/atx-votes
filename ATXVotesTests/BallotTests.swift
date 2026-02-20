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
}
