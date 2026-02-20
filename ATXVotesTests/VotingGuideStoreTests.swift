import XCTest
@testable import ATXVotes

@MainActor
final class VotingGuideStoreTests: XCTestCase {

    private var store: VotingGuideStore!

    private let allKeys = [
        "atx_votes_profile", "atx_votes_ballot",
        "atx_votes_ballot_republican", "atx_votes_ballot_democrat",
        "atx_votes_selected_party", "atx_votes_has_voted",
    ]

    override func setUp() {
        super.setUp()
        // Clear persisted state before each test
        for key in allKeys { UserDefaults.standard.removeObject(forKey: key) }
        store = VotingGuideStore()
    }

    override func tearDown() {
        for key in allKeys { UserDefaults.standard.removeObject(forKey: key) }
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
        for key in allKeys where key.contains("ballot") {
            UserDefaults.standard.removeObject(forKey: key)
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
