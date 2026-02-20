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

    func testBuildGuideDefaultsToUndecidedForModerate() async {
        setUpProfile(spectrum: .moderate)
        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .undecided,
                       "Moderate spectrum should infer undecided")
        XCTAssertNil(store.ballot,
                     "Undecided should return nil ballot")
    }

    func testBuildGuideDefaultsToUndecidedForIndependent() async {
        setUpProfile(spectrum: .independent)
        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .undecided,
                       "Independent spectrum should infer undecided")
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
        setUpProfile(spectrum: .conservative)
        await store.buildVotingGuide()

        // After build, conservative infers .republican
        XCTAssertEqual(store.selectedParty, .republican)
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

    func testBuildGuideSummaryForModerateUsesFirstAvailable() async {
        setUpProfile(spectrum: .moderate)

        await store.buildVotingGuide()

        XCTAssertEqual(store.selectedParty, .undecided)
        // Undecided summary picks first available (demSummary ?? repSummary)
        XCTAssertEqual(store.voterProfile.summaryText, "Democrat test summary",
                       "Moderate/undecided voter should get first available summary (democrat)")
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

// MARK: - Interview Flow Tests

@MainActor
final class InterviewFlowTests: XCTestCase {

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

    // MARK: - 1. Full Happy Path

    func testFullInterviewFlowHappyPath() {
        // welcome -> issues
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .issues)

        store.selectIssues([.economy, .housing, .safety])

        // issues -> spectrum
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .spectrum)

        store.selectSpectrum(.progressive)

        // spectrum -> policyDeepDive
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .policyDeepDive)

        store.setPolicyView(issue: "economy", stance: "Redirect spending")
        store.setPolicyView(issue: "housing", stance: "Smart growth")
        store.setPolicyView(issue: "safety", stance: "Reform + fund")

        // policyDeepDive -> qualities
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .qualities)

        store.selectQualities([.competence, .integrity])

        // qualities -> address
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .address)

        store.setAddress(Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701"))

        // address -> building
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .building)

        // Verify all profile data populated
        XCTAssertEqual(store.voterProfile.topIssues, [.economy, .housing, .safety])
        XCTAssertEqual(store.voterProfile.politicalSpectrum, .progressive)
        XCTAssertEqual(store.voterProfile.policyViews.count, 3)
        XCTAssertEqual(store.voterProfile.candidateQualities, [.competence, .integrity])
        XCTAssertNotNil(store.voterProfile.address)
    }

    // MARK: - 2. Back Navigation Preserves Selections

    func testBackNavigationPreservesSelections() {
        store.advancePhase() // -> issues
        store.selectIssues([.economy, .housing, .safety])

        store.advancePhase() // -> spectrum
        store.selectSpectrum(.liberal)

        // Go back to issues
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .issues)
        XCTAssertEqual(store.voterProfile.topIssues, [.economy, .housing, .safety])

        // Go forward again
        store.advancePhase()
        XCTAssertEqual(store.currentPhase, .spectrum)
        XCTAssertEqual(store.voterProfile.politicalSpectrum, .liberal)
    }

    // MARK: - 3. Policy Deep Dive Stores Views Per Issue

    func testPolicyDeepDiveStoresViewsPerIssue() {
        store.selectIssues([.economy, .housing, .safety])

        store.setPolicyView(issue: "economy", stance: "Cut taxes & spending")
        store.setPolicyView(issue: "housing", stance: "Build, build, build")
        store.setPolicyView(issue: "safety", stance: "Fully fund police")

        XCTAssertEqual(store.voterProfile.policyViews.count, 3)
        XCTAssertEqual(store.voterProfile.policyViews["economy"], "Cut taxes & spending")
        XCTAssertEqual(store.voterProfile.policyViews["housing"], "Build, build, build")
        XCTAssertEqual(store.voterProfile.policyViews["safety"], "Fully fund police")
    }

    // MARK: - 4. Phase Progress Fraction Values

    func testPhaseProgressFractionValues() {
        // welcome: stepNumber=0, totalSteps=5 -> 0/5 = 0
        XCTAssertEqual(store.progressFraction, 0, accuracy: 0.001)

        store.advancePhase() // issues: stepNumber=1, totalSteps=5 -> 1/5 = 0.2
        XCTAssertEqual(store.progressFraction, 1.0/5.0, accuracy: 0.001)

        store.advancePhase() // spectrum: stepNumber=2, totalSteps=5 -> 2/5 = 0.4
        XCTAssertEqual(store.progressFraction, 2.0/5.0, accuracy: 0.001)

        store.advancePhase() // policyDeepDive: stepNumber=3, totalSteps=5 -> 3/5 = 0.6
        XCTAssertEqual(store.progressFraction, 3.0/5.0, accuracy: 0.001)

        store.advancePhase() // qualities: stepNumber=4, totalSteps=5 -> 4/5 = 0.8
        XCTAssertEqual(store.progressFraction, 4.0/5.0, accuracy: 0.001)

        store.advancePhase() // address: stepNumber=5, totalSteps=5 -> 5/5 = 1.0
        XCTAssertEqual(store.progressFraction, 1.0, accuracy: 0.001)
    }

    // MARK: - 5. Profile Accumulation Across Phases

    func testProfileAccumulationAcrossPhases() {
        store.selectIssues([.tech, .environment])
        store.selectSpectrum(.libertarian)
        store.setPolicyView(issue: "tech", stance: "Hands off")
        store.setPolicyView(issue: "environment", stance: "All of the above")
        store.selectQualities([.independence, .freshPerspective])
        let address = Address(street: "500 E 7th St", city: "Austin", state: "TX", zip: "78702")
        store.setAddress(address)

        let profile = store.voterProfile
        XCTAssertEqual(profile.topIssues, [.tech, .environment])
        XCTAssertEqual(profile.politicalSpectrum, .libertarian)
        XCTAssertEqual(profile.policyViews["tech"], "Hands off")
        XCTAssertEqual(profile.policyViews["environment"], "All of the above")
        XCTAssertEqual(profile.candidateQualities, [.independence, .freshPerspective])
        XCTAssertEqual(profile.address, address)
    }

    // MARK: - 6. Go Back From Each Phase

    func testGoBackFromEachPhase() {
        // issues -> welcome
        store.advancePhase() // -> issues
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .welcome)

        // spectrum -> issues
        store.advancePhase() // -> issues
        store.advancePhase() // -> spectrum
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .issues)

        // policyDeepDive -> spectrum
        store.advancePhase() // -> spectrum
        store.advancePhase() // -> policyDeepDive
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .spectrum)

        // qualities -> policyDeepDive
        store.advancePhase() // -> policyDeepDive
        store.advancePhase() // -> qualities
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .policyDeepDive)

        // address -> qualities
        store.advancePhase() // -> qualities
        store.advancePhase() // -> address
        store.goBackPhase()
        XCTAssertEqual(store.currentPhase, .qualities)
    }

    // MARK: - 7. Reset Clears All Interview State

    func testResetClearsAllInterviewState() {
        // Populate full profile
        store.selectIssues([.economy, .housing, .safety])
        store.selectSpectrum(.progressive)
        store.setPolicyView(issue: "economy", stance: "Tax the wealthy more")
        store.selectQualities([.competence, .integrity])
        store.setAddress(Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701"))

        // Advance phases
        for _ in 0..<6 {
            store.advancePhase()
        }
        XCTAssertEqual(store.currentPhase, .building)

        // Reset
        store.resetGuide()

        XCTAssertEqual(store.voterProfile, VoterProfile.empty)
        XCTAssertEqual(store.currentPhase, .welcome)
    }

    // MARK: - 8. Phase Titles and Step Counts

    func testPhaseTitlesAndStepCounts() {
        let expected: [(InterviewPhase, String, Int)] = [
            (.welcome,       "Welcome",        0),
            (.issues,        "Your Issues",     1),
            (.spectrum,      "Your Approach",   2),
            (.policyDeepDive,"Your Views",      3),
            (.qualities,     "What Matters",    4),
            (.address,       "Your Address",    5),
            (.building,      "Building Guide",  6),
        ]

        for (phase, title, stepNumber) in expected {
            XCTAssertEqual(phase.title, title, "Title mismatch for \(phase)")
            XCTAssertEqual(phase.stepNumber, stepNumber, "Step number mismatch for \(phase)")
        }

        XCTAssertEqual(InterviewPhase.issues.totalSteps, 5)
    }

    // MARK: - 9. Inferred Party From Spectrum

    func testInferredPartyFromSpectrum() {
        let expectations: [(PoliticalSpectrum, PrimaryBallot)] = [
            (.progressive, .democrat),
            (.liberal,     .democrat),
            (.moderate,    .undecided),
            (.conservative,.republican),
            (.libertarian, .republican),
            (.independent, .undecided),
        ]

        for (spectrum, expectedParty) in expectations {
            store.selectSpectrum(spectrum)
            XCTAssertEqual(store.inferredParty, expectedParty,
                           "\(spectrum) should infer \(expectedParty)")
        }
    }

    // MARK: - 10. Address Set and Retrieve

    func testAddressSetAndRetrieve() {
        let address = Address(street: "1100 Congress Ave", city: "Austin", state: "TX", zip: "78701")
        store.setAddress(address)

        let stored = store.voterProfile.address
        XCTAssertNotNil(stored)
        XCTAssertEqual(stored?.street, "1100 Congress Ave")
        XCTAssertEqual(stored?.city, "Austin")
        XCTAssertEqual(stored?.state, "TX")
        XCTAssertEqual(stored?.zip, "78701")
        XCTAssertEqual(stored?.formatted, "1100 Congress Ave, Austin, TX 78701")
    }
}
