import XCTest
@testable import ATXVotes

// MARK: - Mock Services

actor MockClaudeService: GuideGenerating {
    var repBallot: Ballot = TestFixtures.republicanBallot
    var demBallot: Ballot = TestFixtures.democratBallot
    var repSummary: String = "Republican test summary"
    var demSummary: String = "Democrat test summary"
    var shouldFail = false
    var repShouldFail = false
    var callCount = 0

    func generateVotingGuide(profile: VoterProfile, districts: Ballot.Districts?) async throws -> (Ballot, String) {
        callCount += 1
        if shouldFail { throw ClaudeError.apiError("Mock failure") }
        if profile.primaryBallot == .republican && repShouldFail {
            throw ClaudeError.apiError("Mock Republican failure")
        }
        let ballot = profile.primaryBallot == .democrat ? demBallot : repBallot
        let summary = profile.primaryBallot == .democrat ? demSummary : repSummary
        return (ballot, summary)
    }

    func generateProfileSummary(profile: VoterProfile) async throws -> String {
        if shouldFail { throw ClaudeError.apiError("Mock failure") }
        return profile.primaryBallot == .democrat ? demSummary : repSummary
    }
}

actor MockDistrictService: DistrictLooking {
    var districts = Ballot.Districts(
        congressional: "District 37",
        stateSenate: "District 14",
        stateHouse: "District 48"
    )
    var shouldFail = false

    func lookupDistricts(for address: Address) async throws -> Ballot.Districts {
        if shouldFail { throw DistrictError.addressNotFound }
        return districts
    }
}

// MARK: - Test Fixtures

enum TestFixtures {
    static var republicanBallot: Ballot {
        Ballot(
            id: UUID(),
            party: .republican,
            electionDate: Date(),
            electionName: "March 2026 Republican Primary",
            districts: Ballot.Districts(),
            races: [
                Race(id: UUID(), office: "Governor", district: nil,
                     candidates: [
                        Candidate(id: UUID(), name: "Alice Smith", party: "Republican",
                                  isIncumbent: true, isRecommended: false, summary: "Incumbent governor",
                                  keyPositions: ["Low taxes"], endorsements: [], pros: [], cons: []),
                     ],
                     isContested: false, isKeyRace: true)
            ],
            propositions: [
                Proposition(id: UUID(), number: 1, title: "Prop 1",
                            description: "Test proposition", recommendation: .yourCall, reasoning: "")
            ]
        )
    }

    static var democratBallot: Ballot {
        Ballot(
            id: UUID(),
            party: .democrat,
            electionDate: Date(),
            electionName: "March 2026 Democratic Primary",
            districts: Ballot.Districts(),
            races: [
                Race(id: UUID(), office: "Governor", district: nil,
                     candidates: [
                        Candidate(id: UUID(), name: "Bob Jones", party: "Democrat",
                                  isIncumbent: false, isRecommended: false, summary: "Challenger",
                                  keyPositions: ["Healthcare"], endorsements: [], pros: [], cons: []),
                     ],
                     isContested: false, isKeyRace: true)
            ],
            propositions: [
                Proposition(id: UUID(), number: 1, title: "Prop 1",
                            description: "Test proposition", recommendation: .yourCall, reasoning: "")
            ]
        )
    }

    static var testProfile: VoterProfile {
        VoterProfile(
            topIssues: [.economy, .housing, .safety],
            politicalSpectrum: .moderate,
            policyViews: ["housing": "Smart growth"],
            admiredPoliticians: ["Test Politician"],
            dislikedPoliticians: [],
            candidateQualities: [.competence, .integrity],
            primaryBallot: .undecided,
            address: Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701")
        )
    }
}

// MARK: - Persistence Helpers

private let testPersistenceKeys = [
    "atx_votes_profile", "atx_votes_ballot",
    "atx_votes_ballot_republican", "atx_votes_ballot_democrat",
    "atx_votes_selected_party", "atx_votes_has_voted",
]

private func clearAllPersistedState() {
    let cloud = NSUbiquitousKeyValueStore.default
    for key in testPersistenceKeys {
        UserDefaults.standard.removeObject(forKey: key)
        cloud.removeObject(forKey: key)
    }
    cloud.synchronize()
}

// MARK: - Existing Unit Tests

@MainActor
final class VotingGuideStoreTests: XCTestCase {

    private var store: VotingGuideStore!

    override func setUp() {
        super.setUp()
        clearAllPersistedState()
        store = VotingGuideStore()
    }

    override func tearDown() {
        clearAllPersistedState()
        store = nil
        super.tearDown()
    }

    // MARK: - Phase Navigation

    func testInitialPhaseIsWelcome() {
        XCTAssertEqual(store.currentPhase, .welcome)
    }

    func testAdvancePhase() {
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .issues)

        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .spectrum)
    }

    func testGoBackPhase() {
        store.advancePhase() // -> issues
        store.advancePhase() // -> spectrum
        store.goBackPhase()  // -> issues
        XCTAssertEqual(store.currentPhase, .issues)
    }

    func testGoBackFromWelcomeStaysAtWelcome() {
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .welcome)
    }

    func testAdvanceThroughAllPhases() {
        for _ in 0..<7 {
            store.advancePhase()
        }
        XCTAssertEqual(store.currentPhase, .building)
    }

    func testAdvanceBeyondLastPhaseStaysAtLast() {
        for _ in 0..<20 {
            store.advancePhase()
        }
        XCTAssertEqual(store.currentPhase, .building)
    }

    // MARK: - Progress Fraction

    func testProgressFractionAtWelcome() {
        XCTAssertEqual(store.progressFraction, 0)
    }

    func testProgressFractionIncreases() {
        store.advancePhase() // issues (step 1)
        let first = store.progressFraction
        store.advancePhase() // spectrum (step 2)
        let second = store.progressFraction
        XCTAssertGreaterThan(second, first)
    }

    // MARK: - Profile Data Accumulation

    func testSelectIssues() {
        store.selectIssues([.economy, .housing, .safety])
        XCTAssertEqual(store.voterProfile.topIssues, [.economy, .housing, .safety])
    }

    func testSelectSpectrum() {
        store.selectSpectrum(.moderate)
        XCTAssertEqual(store.voterProfile.politicalSpectrum, .moderate)
    }

    func testSelectQualities() {
        store.selectQualities([.competence, .integrity])
        XCTAssertEqual(store.voterProfile.candidateQualities, [.competence, .integrity])
    }

    func testSetAddress() {
        let address = Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701")
        store.setAddress(address)
        XCTAssertEqual(store.voterProfile.address, address)
    }

    func testSetPolicyView() {
        store.setPolicyView(issue: "housing", stance: "Smart growth")
        XCTAssertEqual(store.voterProfile.policyViews["housing"], "Smart growth")
    }

    // MARK: - Persistence

    func testSaveAndLoadProfile() {
        store.selectIssues([.economy, .tech])
        store.selectSpectrum(.libertarian)
        store.saveProfile()

        let store2 = VotingGuideStore()
        XCTAssertEqual(store2.voterProfile.topIssues, [.economy, .tech])
        XCTAssertEqual(store2.voterProfile.politicalSpectrum, .libertarian)
    }

    func testSaveAndLoadBallot() {
        store.republicanBallot = Ballot.sampleRepublican
        store.democratBallot = Ballot.sampleDemocrat
        store.selectedParty = .republican
        store.saveProfile()

        let store2 = VotingGuideStore()
        XCTAssertNotNil(store2.republicanBallot)
        XCTAssertNotNil(store2.democratBallot)
        XCTAssertTrue(store2.guideComplete)
        XCTAssertEqual(store2.ballot?.electionName, Ballot.sampleRepublican.electionName)
    }

    func testLoadWithNoBallotDoesNotSetGuideComplete() {
        store.selectIssues([.economy])
        store.saveProfile()
        // Don't save a ballot

        // Clear ballot keys to ensure they're not there
        for key in testPersistenceKeys where key.contains("ballot") {
            UserDefaults.standard.removeObject(forKey: key)
            NSUbiquitousKeyValueStore.default.removeObject(forKey: key)
        }

        let store2 = VotingGuideStore()
        XCTAssertNil(store2.ballot)
        XCTAssertFalse(store2.guideComplete)
    }

    // MARK: - Reset

    func testResetGuide() {
        store.selectIssues([.economy, .housing])
        store.selectSpectrum(.progressive)
        store.republicanBallot = Ballot.sampleRepublican
        store.democratBallot = Ballot.sampleDemocrat
        store.guideComplete = true
        store.saveProfile()

        store.resetGuide()

        XCTAssertEqual(store.voterProfile, VoterProfile.empty)
        XCTAssertNil(store.republicanBallot)
        XCTAssertNil(store.democratBallot)
        XCTAssertNil(store.ballot)
        XCTAssertFalse(store.guideComplete)
        XCTAssertEqual(store.currentPhase, .welcome)

        // Verify persistence is cleared
        XCTAssertNil(UserDefaults.standard.data(forKey: "atx_votes_profile"))
        XCTAssertNil(UserDefaults.standard.data(forKey: "atx_votes_ballot_republican"))
        XCTAssertNil(UserDefaults.standard.data(forKey: "atx_votes_ballot_democrat"))
    }

    // MARK: - Guide State

    func testInitialGuideState() {
        XCTAssertFalse(store.guideComplete)
        XCTAssertFalse(store.isLoading)
        XCTAssertNil(store.ballot)
        XCTAssertNil(store.errorMessage)
    }
}

// MARK: - E2E Build Guide Tests

@MainActor
final class VotingGuideStoreBuildTests: XCTestCase {

    private var store: VotingGuideStore!
    private var mockClaude: MockClaudeService!
    private var mockDistricts: MockDistrictService!

    override func setUp() {
        super.setUp()
        clearAllPersistedState()
        mockClaude = MockClaudeService()
        mockDistricts = MockDistrictService()
        store = VotingGuideStore(claudeService: mockClaude, districtService: mockDistricts)
    }

    override func tearDown() {
        clearAllPersistedState()
        store = nil
        mockClaude = nil
        mockDistricts = nil
        super.tearDown()
    }

    private func setUpProfile(spectrum: PoliticalSpectrum = .moderate, withAddress: Bool = true) {
        store.voterProfile = TestFixtures.testProfile
        store.selectSpectrum(spectrum)
        if !withAddress {
            store.voterProfile.address = nil
        }
    }

    // MARK: - 1. Both ballots generated

    func testBuildGuideGeneratesBothBallots() async {
        setUpProfile()
        await store.buildVotingGuide()

        XCTAssertNotNil(store.republicanBallot, "Republican ballot should be generated")
        XCTAssertNotNil(store.democratBallot, "Democrat ballot should be generated")
        XCTAssertTrue(store.guideComplete, "Guide should be marked complete")
        XCTAssertFalse(store.isLoading, "Loading should be false after completion")
        XCTAssertNil(store.errorMessage, "No error expected")
    }

    // MARK: - 2. Defaults to inferred party

    func testBuildGuideDefaultsToInferredPartyProgressive() async {
        setUpProfile(spectrum: .progressive)
        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .democrat,
                       "Progressive spectrum should infer Democrat")
    }

    func testBuildGuideDefaultsToInferredPartyConservative() async {
        setUpProfile(spectrum: .conservative)
        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .republican,
                       "Conservative spectrum should infer Republican")
    }

    // MARK: - 3. District lookup populates districts

    func testBuildGuideWithDistrictLookup() async {
        setUpProfile()
        store.voterProfile.districts = nil  // ensure not pre-populated

        await store.buildVotingGuide()

        XCTAssertNotNil(store.voterProfile.districts, "Districts should be populated from lookup")
        XCTAssertEqual(store.voterProfile.districts?.congressional, "District 37")
        XCTAssertEqual(store.voterProfile.districts?.stateSenate, "District 14")
        XCTAssertEqual(store.voterProfile.districts?.stateHouse, "District 48")
        XCTAssertFalse(store.districtLookupFailed)
    }

    // MARK: - 4. District lookup failure continues

    func testBuildGuideDistrictLookupFailureContinues() async {
        setUpProfile()
        await mockDistricts.setFailure(true)

        await store.buildVotingGuide()

        XCTAssertTrue(store.districtLookupFailed, "districtLookupFailed should be true")
        XCTAssertNotNil(store.republicanBallot, "Republican ballot should still be generated")
        XCTAssertNotNil(store.democratBallot, "Democrat ballot should still be generated")
        XCTAssertTrue(store.guideComplete)
    }

    // MARK: - 5. Republican failure still generates Democrat

    func testBuildGuideRepublicanFailureStillGeneratesDemocrat() async {
        setUpProfile()
        await mockClaude.setRepShouldFail(true)

        await store.buildVotingGuide()

        XCTAssertNil(store.republicanBallot, "Republican ballot should be nil on failure")
        XCTAssertNotNil(store.democratBallot, "Democrat ballot should still succeed")
        XCTAssertTrue(store.guideComplete, "Guide should complete with partial success")
    }

    // MARK: - 6. Both fail shows error

    func testBuildGuideBothFailShowsError() async {
        setUpProfile()
        await mockClaude.setFailure(true)

        await store.buildVotingGuide()

        XCTAssertNotNil(store.errorMessage, "Error message should be set when both fail")
        XCTAssertFalse(store.guideComplete, "Guide should not be complete when both fail")
        XCTAssertNil(store.republicanBallot)
        XCTAssertNil(store.democratBallot)
    }

    // MARK: - 7. Party switching changes ballot

    func testPartySwitchingChangesBallot() async {
        setUpProfile()
        await store.buildVotingGuide()

        store.selectedParty = .republican
        let repBallot = store.ballot
        XCTAssertNotNil(repBallot)

        store.selectedParty = .democrat
        let demBallot = store.ballot
        XCTAssertNotNil(demBallot)

        XCTAssertNotEqual(repBallot?.electionName, demBallot?.electionName,
                          "Switching party should show a different ballot")
    }

    // MARK: - 8. Loading state set during build

    func testBuildGuideSetsLoadingState() async {
        setUpProfile()

        // Verify loading starts as false
        XCTAssertFalse(store.isLoading)

        await store.buildVotingGuide()

        // After completion, loading should be false
        XCTAssertFalse(store.isLoading)
    }

    // MARK: - 9. Build persists ballots

    func testBuildGuidePersistsBallots() async {
        setUpProfile()
        await store.buildVotingGuide()

        // Create a fresh store that loads from UserDefaults
        let store2 = VotingGuideStore()
        XCTAssertNotNil(store2.republicanBallot, "Republican ballot should persist")
        XCTAssertNotNil(store2.democratBallot, "Democrat ballot should persist")
        XCTAssertTrue(store2.guideComplete)
    }

    // MARK: - 10. Claude called twice (once per party)

    func testBuildGuideCallsClaudeTwice() async {
        setUpProfile()
        await store.buildVotingGuide()

        let count = await mockClaude.callCount
        XCTAssertEqual(count, 2, "Claude should be called once per party (Republican + Democrat)")
    }

    // MARK: - 11. Summary uses inferred party

    func testBuildGuideSummaryUsesInferredParty() async {
        setUpProfile(spectrum: .progressive)

        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .democrat)
        XCTAssertEqual(store.voterProfile.summaryText, "Democrat test summary",
                       "Progressive voter should get Democrat summary")
    }

    func testBuildGuideSummaryUsesRepublicanForConservative() async {
        setUpProfile(spectrum: .conservative)

        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .republican)
        XCTAssertEqual(store.voterProfile.summaryText, "Republican test summary",
                       "Conservative voter should get Republican summary")
    }
}

// MARK: - Mock Helpers

extension MockClaudeService {
    func setFailure(_ fail: Bool) {
        shouldFail = fail
    }
    func setRepShouldFail(_ fail: Bool) {
        repShouldFail = fail
    }
}

extension MockDistrictService {
    func setFailure(_ fail: Bool) {
        shouldFail = fail
    }
}
