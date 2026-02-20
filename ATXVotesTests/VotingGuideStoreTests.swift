import XCTest
@testable import ATXVotes

@MainActor
final class VotingGuideStoreTests: XCTestCase {

    private var store: VotingGuideStore!

    override func setUp() {
        super.setUp()
        // Clear persisted state before each test
        UserDefaults.standard.removeObject(forKey: "atx_votes_profile")
        UserDefaults.standard.removeObject(forKey: "atx_votes_ballot")
        store = VotingGuideStore()
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: "atx_votes_profile")
        UserDefaults.standard.removeObject(forKey: "atx_votes_ballot")
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
        for _ in 0..<8 {
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

    func testSelectPrimary() {
        store.selectPrimary(.democrat)
        XCTAssertEqual(store.voterProfile.primaryBallot, .democrat)
    }

    func testSetAddress() {
        let address = Address(street: "100 Congress Ave", city: "Austin", state: "TX", zip: "78701")
        store.setAddress(address)
        XCTAssertEqual(store.voterProfile.address, address)
    }

    func testAddAdmiredPolitician() {
        store.addAdmiredPolitician("George Washington")
        store.addAdmiredPolitician("Abraham Lincoln")
        XCTAssertEqual(store.voterProfile.admiredPoliticians, ["George Washington", "Abraham Lincoln"])
    }

    func testAddDuplicateAdmiredPoliticianIgnored() {
        store.addAdmiredPolitician("George Washington")
        store.addAdmiredPolitician("George Washington")
        XCTAssertEqual(store.voterProfile.admiredPoliticians.count, 1)
    }

    func testAddDislikedPolitician() {
        store.addDislikedPolitician("Darth Vader")
        XCTAssertEqual(store.voterProfile.dislikedPoliticians, ["Darth Vader"])
    }

    func testSetPolicyView() {
        store.setPolicyView(issue: "housing", stance: "Smart growth")
        XCTAssertEqual(store.voterProfile.policyViews["housing"], "Smart growth")
    }

    // MARK: - Persistence

    func testSaveAndLoadProfile() {
        store.selectIssues([.economy, .tech])
        store.selectSpectrum(.libertarian)
        store.selectPrimary(.republican)
        store.addAdmiredPolitician("Test Person")
        store.saveProfile()

        let store2 = VotingGuideStore()
        XCTAssertEqual(store2.voterProfile.topIssues, [.economy, .tech])
        XCTAssertEqual(store2.voterProfile.politicalSpectrum, .libertarian)
        XCTAssertEqual(store2.voterProfile.primaryBallot, .republican)
        XCTAssertEqual(store2.voterProfile.admiredPoliticians, ["Test Person"])
    }

    func testSaveAndLoadBallot() {
        store.ballot = Ballot.sampleRepublican
        store.saveProfile()

        let store2 = VotingGuideStore()
        XCTAssertNotNil(store2.ballot)
        XCTAssertTrue(store2.guideComplete)
        XCTAssertEqual(store2.ballot?.electionName, Ballot.sampleRepublican.electionName)
    }

    func testLoadWithNoBallotDoesNotSetGuideComplete() {
        store.selectIssues([.economy])
        store.saveProfile()
        // Don't save a ballot

        // Clear ballot key to ensure it's not there
        UserDefaults.standard.removeObject(forKey: "atx_votes_ballot")

        let store2 = VotingGuideStore()
        XCTAssertNil(store2.ballot)
        XCTAssertFalse(store2.guideComplete)
    }

    // MARK: - Reset

    func testResetGuide() {
        store.selectIssues([.economy, .housing])
        store.selectSpectrum(.progressive)
        store.ballot = Ballot.sampleRepublican
        store.guideComplete = true
        store.saveProfile()

        store.resetGuide()

        XCTAssertEqual(store.voterProfile, VoterProfile.empty)
        XCTAssertNil(store.ballot)
        XCTAssertFalse(store.guideComplete)
        XCTAssertEqual(store.currentPhase, .welcome)

        // Verify persistence is cleared
        XCTAssertNil(UserDefaults.standard.data(forKey: "atx_votes_profile"))
        XCTAssertNil(UserDefaults.standard.data(forKey: "atx_votes_ballot"))
    }

    // MARK: - Guide State

    func testInitialGuideState() {
        XCTAssertFalse(store.guideComplete)
        XCTAssertFalse(store.isLoading)
        XCTAssertNil(store.ballot)
        XCTAssertNil(store.errorMessage)
    }
}
