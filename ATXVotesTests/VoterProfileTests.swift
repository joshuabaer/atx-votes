import XCTest
@testable import ATXVotes

final class VoterProfileTests: XCTestCase {

    // MARK: - Empty Profile

    func testEmptyProfile() {
        let profile = VoterProfile.empty
        XCTAssertTrue(profile.topIssues.isEmpty)
        XCTAssertEqual(profile.politicalSpectrum, .moderate)
        XCTAssertTrue(profile.policyViews.isEmpty)
        XCTAssertTrue(profile.admiredPoliticians.isEmpty)
        XCTAssertTrue(profile.dislikedPoliticians.isEmpty)
        XCTAssertTrue(profile.candidateQualities.isEmpty)
        XCTAssertEqual(profile.primaryBallot, .undecided)
        XCTAssertNil(profile.address)
        XCTAssertNil(profile.summaryText)
        XCTAssertNil(profile.districts)
    }

    // MARK: - Codable

    func testProfileEncodeDecode() throws {
        let profile = VoterProfile(
            topIssues: [.economy, .housing, .safety],
            politicalSpectrum: .independent,
            policyViews: ["housing": "Smart growth", "safety": "Reform + fund"],
            admiredPoliticians: ["George Washington"],
            dislikedPoliticians: ["Darth Vader"],
            candidateQualities: [.competence, .integrity],
            primaryBallot: .republican,
            address: Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701"),
            summaryText: "A test summary.",
            districts: Ballot.Districts(
                congressional: "District 37",
                stateSenate: nil,
                stateHouse: "District 48",
                countyCommissioner: nil,
                schoolBoard: nil
            )
        )

        let data = try JSONEncoder().encode(profile)
        let decoded = try JSONDecoder().decode(VoterProfile.self, from: data)

        XCTAssertEqual(decoded, profile)
    }

    // MARK: - Address

    func testAddressFormatted() {
        let address = Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701")
        XCTAssertEqual(address.formatted, "100 Congress Ave, Austin, TX 78701")
    }

    // MARK: - Enums

    func testAllIssuesHaveIcons() {
        for issue in Issue.allCases {
            XCTAssertFalse(issue.icon.isEmpty, "\(issue.rawValue) should have an icon")
        }
    }

    func testAllIssuesHaveRawValues() {
        for issue in Issue.allCases {
            XCTAssertFalse(issue.rawValue.isEmpty)
        }
    }

    func testIssueCount() {
        XCTAssertEqual(Issue.allCases.count, 12)
    }

    func testPoliticalSpectrumCount() {
        XCTAssertEqual(PoliticalSpectrum.allCases.count, 6)
    }

    func testCandidateQualityCount() {
        XCTAssertEqual(CandidateQuality.allCases.count, 8)
    }

    func testPrimaryBallotCount() {
        XCTAssertEqual(PrimaryBallot.allCases.count, 3)
    }
}
