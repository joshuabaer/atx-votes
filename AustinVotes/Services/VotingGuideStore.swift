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
    @Published var ballot: Ballot?
    @Published var guideComplete = false
    @Published var isLoading = false
    @Published var loadingMessage = "Researching your ballot..."
    @Published var errorMessage: String?
    @Published var districtLookupFailed = false

    // MARK: - Services
    let claudeService = ClaudeService()
    private let districtService = DistrictLookupService()
    private let persistenceKey = "austin_votes_profile"
    private let ballotKey = "austin_votes_ballot"
    private let reviewPromptedKey = "austin_votes_review_prompted"

    // MARK: - Init

    init() {
        loadSavedState()
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
            if let address = voterProfile.address, voterProfile.districts == nil {
                do {
                    voterProfile.districts = try await districtService.lookupDistricts(for: address)
                } catch {
                    // District lookup failed — fall through to show all races
                    logger.warning("District lookup failed: \(error.localizedDescription). Showing all races.")
                    districtLookupFailed = true
                }
            }

            // Step 2: Generate personalized recommendations via API proxy
            loadingMessage = "Personalizing your recommendations..."

            let (generatedBallot, summary) = try await claudeService.generateVotingGuide(
                profile: voterProfile,
                districts: voterProfile.districts
            )
            self.ballot = generatedBallot
            voterProfile.summaryText = summary

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
        }
        if let ballot, let data = try? JSONEncoder().encode(ballot) {
            UserDefaults.standard.set(data, forKey: ballotKey)
        }
    }

    func loadProfile() {
        if let data = UserDefaults.standard.data(forKey: persistenceKey),
           let profile = try? JSONDecoder().decode(VoterProfile.self, from: data) {
            voterProfile = profile
        }
    }

    private func loadSavedState() {
        loadProfile()
        if let data = UserDefaults.standard.data(forKey: ballotKey),
           let savedBallot = try? JSONDecoder().decode(Ballot.self, from: data) {
            ballot = savedBallot
            guideComplete = true
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
        UserDefaults.standard.removeObject(forKey: ballotKey)
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
            admiredPoliticians: ["John Cornyn", "Chip Roy"],
            dislikedPoliticians: ["Ken Paxton"],
            candidateQualities: [.competence, .integrity, .independence],
            primaryBallot: .republican,
            address: Address(street: "123 Congress Ave", city: "Austin", state: "TX", zip: "78701"),
            summaryText: "A pragmatic, tech-forward Austin moderate who values competence, integrity, and results over ideology.",
            districts: nil
        )
        return store
    }
}
