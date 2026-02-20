import XCTest
@testable import AustinVotes

final class ClaudeServiceTests: XCTestCase {

    // MARK: - Response Parsing

    func testParseValidGuideResponse() throws {
        let json = """
        {
          "profileSummary": "A pragmatic voter focused on the economy.",
          "races": [
            {
              "office": "U.S. Senator",
              "district": null,
              "recommendedCandidate": "Test Candidate",
              "reasoning": "Aligns with voter's economic priorities.",
              "strategicNotes": null,
              "caveats": null,
              "confidence": "Strong Match"
            }
          ],
          "propositions": [
            {
              "number": 1,
              "recommendation": "Lean Yes",
              "reasoning": "Consistent with voter values."
            }
          ]
        }
        """

        let data = json.data(using: .utf8)!
        let response = try JSONDecoder().decode(ClaudeGuideResponse.self, from: data)

        XCTAssertEqual(response.profileSummary, "A pragmatic voter focused on the economy.")
        XCTAssertEqual(response.races.count, 1)
        XCTAssertEqual(response.races[0].office, "U.S. Senator")
        XCTAssertEqual(response.races[0].recommendedCandidate, "Test Candidate")
        XCTAssertEqual(response.races[0].confidence, "Strong Match")
        XCTAssertNil(response.races[0].district)
        XCTAssertNil(response.races[0].strategicNotes)
        XCTAssertEqual(response.propositions.count, 1)
        XCTAssertEqual(response.propositions[0].number, 1)
        XCTAssertEqual(response.propositions[0].recommendation, "Lean Yes")
    }

    func testParseResponseWithAllFields() throws {
        let json = """
        {
          "profileSummary": "Summary text",
          "races": [
            {
              "office": "State Rep",
              "district": "District 48",
              "recommendedCandidate": "Jane Doe",
              "reasoning": "Good fit.",
              "strategicNotes": "Likely runoff.",
              "caveats": "Limited record.",
              "confidence": "Good Match"
            }
          ],
          "propositions": []
        }
        """

        let data = json.data(using: .utf8)!
        let response = try JSONDecoder().decode(ClaudeGuideResponse.self, from: data)

        XCTAssertEqual(response.races[0].district, "District 48")
        XCTAssertEqual(response.races[0].strategicNotes, "Likely runoff.")
        XCTAssertEqual(response.races[0].caveats, "Limited record.")
    }

    func testParseInvalidJsonFails() {
        let badJson = "not json at all"
        let data = badJson.data(using: .utf8)!
        XCTAssertThrowsError(try JSONDecoder().decode(ClaudeGuideResponse.self, from: data))
    }

    func testParseMissingFieldsFails() {
        let incompleteJson = """
        {
          "profileSummary": "Summary",
          "races": []
        }
        """
        let data = incompleteJson.data(using: .utf8)!
        // Missing "propositions" field should fail
        XCTAssertThrowsError(try JSONDecoder().decode(ClaudeGuideResponse.self, from: data))
    }

    // MARK: - Recommendation Confidence

    func testConfidenceLevels() {
        XCTAssertEqual(RaceRecommendation.Confidence(rawValue: "Strong Match"), .strong)
        XCTAssertEqual(RaceRecommendation.Confidence(rawValue: "Good Match"), .moderate)
        XCTAssertEqual(RaceRecommendation.Confidence(rawValue: "Best Available"), .weak)
        XCTAssertEqual(RaceRecommendation.Confidence(rawValue: "Symbolic Race"), .symbolic)
        XCTAssertNil(RaceRecommendation.Confidence(rawValue: "Invalid"))
    }

    // MARK: - Proposition Recommendation

    func testPropositionRecommendationValues() {
        XCTAssertEqual(Proposition.PropRecommendation(rawValue: "Lean Yes"), .leanYes)
        XCTAssertEqual(Proposition.PropRecommendation(rawValue: "Lean No"), .leanNo)
        XCTAssertEqual(Proposition.PropRecommendation(rawValue: "Your Call"), .yourCall)
        XCTAssertNil(Proposition.PropRecommendation(rawValue: "Invalid"))
    }

    // MARK: - Error Types

    func testClaudeErrorDescriptions() {
        XCTAssertNotNil(ClaudeError.apiError("test").errorDescription)
        XCTAssertNotNil(ClaudeError.parseError("test").errorDescription)
        XCTAssertNotNil(ClaudeError.invalidAPIKey.errorDescription)
        XCTAssertNotNil(ClaudeError.rateLimited.errorDescription)
        XCTAssertNotNil(ClaudeError.serverError(500).errorDescription)
    }
}
