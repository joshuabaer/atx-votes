import Foundation
import os
import StoreKit
import SwiftUI

private let logger = Logger(subsystem: "app.atxvotes", category: "GuideStore")

@MainActor
class VotingGuideStore: ObservableObject {
    // MARK: - Interview State
    @Published var currentPhase: InterviewPhase = .welcome
    @Published var voterProfile: VoterProfile = .empty
    @Published var interviewAnswers: [Int: [String]] = [:]  // questionId -> selected options

    // MARK: - Ballot State
    @Published var republicanBallot: Ballot?
    @Published var democratBallot: Ballot?
    @Published var selectedParty: PrimaryBallot = .undecided
    @Published var guideComplete = false
    @Published var hasVoted = false
    @Published var isLoading = false
    @Published var loadingMessage = "Researching your ballot..."
    @Published var errorMessage: String?
    @Published var districtLookupFailed = false
    @Published var demFirstOrder = false

    var ballot: Ballot? {
        switch selectedParty {
        case .republican: republicanBallot
        case .democrat: democratBallot
        case .undecided: nil
        }
    }

    // MARK: - Services
    let claudeService: any GuideGenerating
    private let districtService: any DistrictLooking
    private let persistenceKey = "atx_votes_profile"
    private let ballotKey = "atx_votes_ballot"  // legacy single-ballot key
    private let republicanBallotKey = "atx_votes_ballot_republican"
    private let democratBallotKey = "atx_votes_ballot_democrat"
    private let selectedPartyKey = "atx_votes_selected_party"
    private let reviewPromptedKey = "atx_votes_review_prompted"
    private let hasVotedKey = "atx_votes_has_voted"
    private let cloudStore = NSUbiquitousKeyValueStore.default

    // MARK: - Init

    init(claudeService: any GuideGenerating = ClaudeService(),
         districtService: any DistrictLooking = DistrictLookupService()) {
        self.claudeService = claudeService
        self.districtService = districtService
        loadSavedState()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(iCloudDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: cloudStore
        )
        cloudStore.synchronize()
    }

    // MARK: - Interview Flow

    func advancePhase() {
        guard let next = InterviewPhase(rawValue: currentPhase.rawValue + 1) else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            currentPhase = next
        }
    }

    func goBackPhase() {
        guard currentPhase.rawValue > 0 else { return }
        guard let prev = InterviewPhase(rawValue: currentPhase.rawValue - 1) else { return }
        withAnimation(.easeInOut(duration: 0.3)) {
            currentPhase = prev
        }
    }

    var progressFraction: Double {
        guard currentPhase.totalSteps > 0 else { return 0 }
        return Double(currentPhase.stepNumber) / Double(currentPhase.totalSteps)
    }

    // MARK: - Party Inference

    /// Infer the voter's likely primary party from their political spectrum.
    var inferredParty: PrimaryBallot {
        switch voterProfile.politicalSpectrum {
        case .progressive, .liberal: .democrat
        case .conservative, .libertarian: .republican
        case .moderate, .independent: .undecided
        }
    }

    // MARK: - Update Profile

    func selectIssues(_ issues: [Issue]) {
        voterProfile.topIssues = issues
    }

    func selectSpectrum(_ spectrum: PoliticalSpectrum) {
        voterProfile.politicalSpectrum = spectrum
    }

    func selectQualities(_ qualities: [CandidateQuality]) {
        voterProfile.candidateQualities = qualities
    }

    func selectPrimary(_ ballot: PrimaryBallot) {
        voterProfile.primaryBallot = ballot
    }

    func setAddress(_ address: Address) {
        voterProfile.address = address
    }

    func setPolicyView(issue: String, stance: String) {
        voterProfile.policyViews[issue] = stance
    }

    // MARK: - Voted Status

    func markAsVoted() {
        withAnimation {
            hasVoted = true
        }
        UserDefaults.standard.set(true, forKey: hasVotedKey)
        cloudStore.set(true, forKey: hasVotedKey)
        cloudStore.synchronize()
        NotificationService.shared.cancelAllReminders()
    }

    func unmarkVoted() {
        withAnimation {
            hasVoted = false
        }
        UserDefaults.standard.removeObject(forKey: hasVotedKey)
        cloudStore.removeObject(forKey: hasVotedKey)
        cloudStore.synchronize()
    }

    // MARK: - Build Guide

    /// Tracks when the loading message last changed, so each phase displays for at least 1 second.
    private var lastMessageChange = Date.distantPast

    /// Update the loading message, ensuring the previous message was shown for at least 1 second.
    private func setLoadingPhase(_ message: String) async {
        let elapsed = Date().timeIntervalSince(lastMessageChange)
        if elapsed < 1.0 {
            try? await Task.sleep(for: .seconds(1.0 - elapsed))
        }
        loadingMessage = message
        lastMessageChange = Date()
    }

    func buildVotingGuide() async {
        isLoading = true
        lastMessageChange = Date()
        loadingMessage = "Finding your ballot..."

        do {
            // Step 1: Look up districts based on address
            await setLoadingPhase("Looking up your districts...")
            if let address = voterProfile.address, voterProfile.districts == nil {
                do {
                    voterProfile.districts = try await districtService.lookupDistricts(for: address)
                } catch {
                    // District lookup failed — fall through to show all races
                    logger.warning("District lookup failed: \(error.localizedDescription). Showing all races.")
                    districtLookupFailed = true
                }
            }

            // Step 2: Generate personalized recommendations for both parties in parallel
            await setLoadingPhase("Researching candidates...")

            var repProfile = voterProfile
            repProfile.primaryBallot = .republican
            var demProfile = voterProfile
            demProfile.primaryBallot = .democrat

            let repTask = Task { try await claudeService.generateVotingGuide(profile: repProfile, districts: voterProfile.districts) }
            let demTask = Task { try await claudeService.generateVotingGuide(profile: demProfile, districts: voterProfile.districts) }

            var repSummary: String?
            var demSummary: String?
            var lastError: Error?

            // Await results in inferred-party order so the loading UI matches
            // For undecided voters, randomly pick which party to show first
            demFirstOrder = inferredParty == .democrat || (inferredParty == .undecided && Bool.random())
            if demFirstOrder {
                await setLoadingPhase("Researching Democrats...")
                do {
                    let (ballot, summary) = try await demTask.value
                    democratBallot = ballot
                    demSummary = summary
                } catch {
                    logger.error("Democrat ballot generation failed: \(error.localizedDescription)")
                    lastError = error
                }

                await setLoadingPhase("Researching Republicans...")
                do {
                    let (ballot, summary) = try await repTask.value
                    republicanBallot = ballot
                    repSummary = summary
                } catch {
                    logger.error("Republican ballot generation failed: \(error.localizedDescription)")
                    lastError = error
                }
            } else {
                await setLoadingPhase("Researching Republicans...")
                do {
                    let (ballot, summary) = try await repTask.value
                    republicanBallot = ballot
                    repSummary = summary
                } catch {
                    logger.error("Republican ballot generation failed: \(error.localizedDescription)")
                    lastError = error
                }

                await setLoadingPhase("Researching Democrats...")
                do {
                    let (ballot, summary) = try await demTask.value
                    democratBallot = ballot
                    demSummary = summary
                } catch {
                    logger.error("Democrat ballot generation failed: \(error.localizedDescription)")
                    lastError = error
                }
            }

            await setLoadingPhase("Finalizing recommendations...")

            // Default to inferred party and use its summary
            selectedParty = inferredParty
            switch inferredParty {
            case .democrat:
                voterProfile.summaryText = demSummary ?? repSummary
            case .republican:
                voterProfile.summaryText = repSummary ?? demSummary
            case .undecided:
                voterProfile.summaryText = demSummary ?? repSummary
            }

            // Require at least one ballot to succeed
            guard republicanBallot != nil || democratBallot != nil else {
                throw lastError ?? ClaudeError.apiError("Failed to generate ballot recommendations. Please try again.")
            }

            // Save
            saveProfile()

            withAnimation {
                guideComplete = true
                isLoading = false
            }

            requestAppReviewIfNeeded()
        } catch let error as ClaudeError {
            errorMessage = error.localizedDescription
            isLoading = false
        } catch let error as URLError where error.code == .timedOut {
            errorMessage = "The AI is taking longer than usual. Please try again — it usually works on the second attempt."
            isLoading = false
        } catch {
            errorMessage = "Something went wrong building your guide. Please try again."
            isLoading = false
        }
    }

    // MARK: - App Store Review

    private func requestAppReviewIfNeeded() {
        guard !UserDefaults.standard.bool(forKey: reviewPromptedKey) else { return }
        UserDefaults.standard.set(true, forKey: reviewPromptedKey)

        // Delay slightly so the user sees the "guide is ready" state first
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            if let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                SKStoreReviewController.requestReview(in: scene)
            }
        }
    }

    // MARK: - Persistence

    func saveProfile() {
        if let data = try? JSONEncoder().encode(voterProfile) {
            UserDefaults.standard.set(data, forKey: persistenceKey)
            cloudStore.set(data, forKey: persistenceKey)
        }
        if let republicanBallot, let data = try? JSONEncoder().encode(republicanBallot) {
            UserDefaults.standard.set(data, forKey: republicanBallotKey)
            cloudStore.set(data, forKey: republicanBallotKey)
        }
        if let democratBallot, let data = try? JSONEncoder().encode(democratBallot) {
            UserDefaults.standard.set(data, forKey: democratBallotKey)
            cloudStore.set(data, forKey: democratBallotKey)
        }
        UserDefaults.standard.set(selectedParty.rawValue, forKey: selectedPartyKey)
        cloudStore.set(selectedParty.rawValue, forKey: selectedPartyKey)
        cloudStore.synchronize()
    }

    func loadProfile() {
        // Prefer iCloud data, fall back to UserDefaults
        let profileData = cloudStore.data(forKey: persistenceKey)
            ?? UserDefaults.standard.data(forKey: persistenceKey)
        if let profileData, let profile = try? JSONDecoder().decode(VoterProfile.self, from: profileData) {
            voterProfile = profile
        }
    }

    private func loadSavedState() {
        migrateOldKeys()
        loadProfile()

        // Load Republican ballot
        let repData = cloudStore.data(forKey: republicanBallotKey)
            ?? UserDefaults.standard.data(forKey: republicanBallotKey)
        if let repData, let saved = try? JSONDecoder().decode(Ballot.self, from: repData) {
            republicanBallot = saved
        }

        // Load Democrat ballot
        let demData = cloudStore.data(forKey: democratBallotKey)
            ?? UserDefaults.standard.data(forKey: democratBallotKey)
        if let demData, let saved = try? JSONDecoder().decode(Ballot.self, from: demData) {
            democratBallot = saved
        }

        // Migrate legacy single-ballot key
        if republicanBallot == nil && democratBallot == nil {
            let legacyData = cloudStore.data(forKey: ballotKey)
                ?? UserDefaults.standard.data(forKey: ballotKey)
            if let legacyData, let saved = try? JSONDecoder().decode(Ballot.self, from: legacyData) {
                switch saved.party {
                case .democrat: democratBallot = saved
                case .republican, .undecided: republicanBallot = saved
                }
                // Clean up legacy key
                UserDefaults.standard.removeObject(forKey: ballotKey)
                cloudStore.removeObject(forKey: ballotKey)
            }
        }

        if republicanBallot != nil || democratBallot != nil {
            guideComplete = true
            // Check for remotely-updated election data in the background
            Task { await self.refreshElectionDataIfNeeded() }
        }

        // Load selected party
        if let partyString = cloudStore.string(forKey: selectedPartyKey)
            ?? UserDefaults.standard.string(forKey: selectedPartyKey),
           let party = PrimaryBallot(rawValue: partyString) {
            selectedParty = party
        } else {
            selectedParty = inferredParty
        }

        if cloudStore.object(forKey: hasVotedKey) != nil {
            hasVoted = cloudStore.bool(forKey: hasVotedKey)
        } else {
            hasVoted = UserDefaults.standard.bool(forKey: hasVotedKey)
        }
    }

    /// Migrate data from old "austin_votes_" keys to new "atx_votes_" keys
    private func migrateOldKeys() {
        let migrations = [
            ("austin_votes_profile", persistenceKey),
            ("austin_votes_ballot", ballotKey),
            ("austin_votes_review_prompted", reviewPromptedKey),
            ("austin_votes_has_voted", hasVotedKey),
        ]
        let defaults = UserDefaults.standard
        for (oldKey, newKey) in migrations {
            if defaults.object(forKey: newKey) == nil, let old = defaults.object(forKey: oldKey) {
                defaults.set(old, forKey: newKey)
                defaults.removeObject(forKey: oldKey)
            }
            if cloudStore.object(forKey: newKey) == nil, let old = cloudStore.object(forKey: oldKey) {
                cloudStore.set(old, forKey: newKey)
                cloudStore.removeObject(forKey: oldKey)
            }
        }
    }

    func resetGuide() {
        withAnimation {
            voterProfile = .empty
            republicanBallot = nil
            democratBallot = nil
            selectedParty = .undecided
            guideComplete = false
            hasVoted = false
            currentPhase = .welcome
        }
        let keysToRemove = [persistenceKey, ballotKey, republicanBallotKey, democratBallotKey, selectedPartyKey, hasVotedKey]
        for key in keysToRemove {
            UserDefaults.standard.removeObject(forKey: key)
            cloudStore.removeObject(forKey: key)
        }
        cloudStore.synchronize()
    }

    // MARK: - Remote Election Data Refresh

    /// Checks for remotely-updated election data and merges factual changes
    /// (endorsements, polling, etc.) without overwriting personalized recommendations.
    private func refreshElectionDataIfNeeded() async {
        let (remoteRep, remoteDem) = await ElectionDataService.shared.checkForUpdates()

        if let remoteRep, var currentRep = republicanBallot {
            mergeFactualUpdates(from: remoteRep, into: &currentRep)
            republicanBallot = currentRep
            logger.info("Merged remote Republican ballot updates")
        }

        if let remoteDem, var currentDem = democratBallot {
            mergeFactualUpdates(from: remoteDem, into: &currentDem)
            democratBallot = currentDem
            logger.info("Merged remote Democrat ballot updates")
        }

        if remoteRep != nil || remoteDem != nil {
            saveProfile()
        }
    }

    /// Merges factual candidate data from a remote ballot into the user's personalized ballot.
    /// Updates: endorsements, polling, fundraising, background, pros, cons, keyPositions, summary.
    /// Preserves: isRecommended, recommendation, reasoning, confidence (personalized fields).
    private func mergeFactualUpdates(from remote: Ballot, into current: inout Ballot) {
        for (raceIndex, currentRace) in current.races.enumerated() {
            guard let remoteRace = remote.races.first(where: {
                $0.office == currentRace.office && $0.district == currentRace.district
            }) else { continue }

            for (candIndex, currentCand) in currentRace.candidates.enumerated() {
                guard let remoteCand = remoteRace.candidates.first(where: {
                    $0.name == currentCand.name
                }) else { continue }

                // Update factual fields only
                current.races[raceIndex].candidates[candIndex].endorsements = remoteCand.endorsements
                current.races[raceIndex].candidates[candIndex].polling = remoteCand.polling
                current.races[raceIndex].candidates[candIndex].fundraising = remoteCand.fundraising
                current.races[raceIndex].candidates[candIndex].background = remoteCand.background
                current.races[raceIndex].candidates[candIndex].pros = remoteCand.pros
                current.races[raceIndex].candidates[candIndex].cons = remoteCand.cons
                current.races[raceIndex].candidates[candIndex].keyPositions = remoteCand.keyPositions
                current.races[raceIndex].candidates[candIndex].summary = remoteCand.summary
                // Preserve: isRecommended (personalized)
            }
            // Preserve: recommendation (personalized)
        }
        // Propositions are never modified by remote updates
    }

    // MARK: - iCloud Sync

    @objc private func iCloudDidChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let changeReason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int else { return }

        if changeReason == NSUbiquitousKeyValueStoreServerChange
            || changeReason == NSUbiquitousKeyValueStoreInitialSyncChange {
            logger.info("iCloud sync: received external changes (reason: \(changeReason))")
            Task { @MainActor in
                self.loadSavedState()
            }
        }
    }

    // MARK: - Preview

    static var preview: VotingGuideStore {
        let store = VotingGuideStore()
        store.republicanBallot = Ballot.sampleRepublican
        store.democratBallot = Ballot.sampleDemocrat
        store.selectedParty = .undecided
        store.guideComplete = true
        store.voterProfile = VoterProfile(
            topIssues: [.economy, .safety, .tech, .infrastructure],
            politicalSpectrum: .moderate,
            policyViews: ["housing": "Smart growth", "safety": "Community-oriented policing"],
            admiredPoliticians: ["Ann Richards", "Kay Bailey Hutchison"],
            dislikedPoliticians: [],
            candidateQualities: [.competence, .integrity, .independence],
            primaryBallot: .undecided,
            address: Address(street: "123 Congress Ave", city: "Austin", state: "TX", zip: "78701"),
            summaryText: "A pragmatic, tech-forward Austin moderate who values competence, integrity, and results over ideology.",
            districts: nil
        )
        return store
    }
}
