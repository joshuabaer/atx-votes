import Foundation
import SwiftUI

@MainActor
class VotingGuideStore: ObservableObject {
    // MARK: - Interview State
    @Published var currentPhase: InterviewPhase = .welcome
    @Published var voterProfile: VoterProfile = .empty
    @Published var interviewAnswers: [Int: [String]] = [:]  // questionId -> selected options

    // MARK: - Ballot State
    @Published var ballot: Ballot?
    @Published var guideComplete = false
    @Published var isLoading = false
    @Published var loadingMessage = "Researching your ballot..."
    @Published var errorMessage: String?

    // MARK: - Services
    private let claudeService = ClaudeService()
    private let persistenceKey = "austin_votes_profile"

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

    func addAdmiredPolitician(_ name: String) {
        if !voterProfile.admiredPoliticians.contains(name) {
            voterProfile.admiredPoliticians.append(name)
        }
    }

    func addDislikedPolitician(_ name: String) {
        if !voterProfile.dislikedPoliticians.contains(name) {
            voterProfile.dislikedPoliticians.append(name)
        }
    }

    func setPolicyView(issue: String, stance: String) {
        voterProfile.policyViews[issue] = stance
    }

    // MARK: - Build Guide

    func buildVotingGuide() async {
        isLoading = true
        loadingMessage = "Finding your ballot..."

        do {
            // Step 1: Look up districts based on address
            loadingMessage = "Looking up your districts..."
            try await Task.sleep(for: .seconds(1))

            // Step 2: Fetch candidate information
            loadingMessage = "Researching candidates..."
            try await Task.sleep(for: .seconds(1))

            // Step 3: Generate personalized recommendations
            loadingMessage = "Building your personalized guide..."

            let generatedBallot = try await claudeService.generateVotingGuide(profile: voterProfile)
            self.ballot = generatedBallot

            // Step 4: Generate profile summary
            loadingMessage = "Finishing up..."
            let summary = try await claudeService.generateProfileSummary(profile: voterProfile)
            voterProfile.summaryText = summary

            // Save
            saveProfile()

            withAnimation {
                guideComplete = true
                isLoading = false
            }
        } catch {
            errorMessage = "Something went wrong building your guide. Please try again."
            isLoading = false
        }
    }

    // MARK: - Persistence

    func saveProfile() {
        if let data = try? JSONEncoder().encode(voterProfile) {
            UserDefaults.standard.set(data, forKey: persistenceKey)
        }
    }

    func loadProfile() {
        if let data = UserDefaults.standard.data(forKey: persistenceKey),
           let profile = try? JSONDecoder().decode(VoterProfile.self, from: data) {
            voterProfile = profile
        }
    }

    func resetGuide() {
        withAnimation {
            voterProfile = .empty
            ballot = nil
            guideComplete = false
            currentPhase = .welcome
        }
        UserDefaults.standard.removeObject(forKey: persistenceKey)
    }

    // MARK: - Preview

    static var preview: VotingGuideStore {
        let store = VotingGuideStore()
        store.ballot = Ballot.sampleRepublican
        store.guideComplete = true
        store.voterProfile = VoterProfile(
            topIssues: [.economy, .safety, .tech, .infrastructure],
            politicalSpectrum: .independent,
            policyViews: ["housing": "Smart growth", "safety": "Fully fund police"],
            admiredPoliticians: ["Kirk Watson", "John Cornyn"],
            dislikedPoliticians: ["Greg Casar"],
            candidateQualities: [.competence, .integrity, .independence],
            primaryBallot: .republican,
            address: Address(street: "123 Congress Ave", city: "Austin", state: "TX", zip: "78701"),
            summaryText: "A pragmatic, tech-forward Austin moderate who values competence, integrity, and results over ideology."
        )
        return store
    }
}
