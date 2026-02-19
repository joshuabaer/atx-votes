import Foundation

/// Service layer for Claude API integration.
/// Replace the placeholder API key and customize the prompts as needed.
actor ClaudeService {
    private let apiKey: String
    private let baseURL = "https://api.anthropic.com/v1/messages"
    private let model = "claude-sonnet-4-20250514"

    init(apiKey: String = "") {
        // In production, load from Keychain or environment config
        self.apiKey = apiKey
    }

    // MARK: - Generate Full Voting Guide

    func generateVotingGuide(profile: VoterProfile) async throws -> Ballot {
        let prompt = buildGuidePrompt(profile: profile)

        // If API key is empty, return sample data for development
        guard !apiKey.isEmpty else {
            return Ballot.sampleRepublican
        }

        let response = try await callClaude(
            system: votingGuideSystemPrompt,
            userMessage: prompt
        )

        return try parseGuideResponse(response, profile: profile)
    }

    // MARK: - Generate Profile Summary

    func generateProfileSummary(profile: VoterProfile) async throws -> String {
        guard !apiKey.isEmpty else {
            return sampleSummary(profile: profile)
        }

        let prompt = """
        Based on this voter profile, write a 2-sentence summary that captures their political identity in plain language. \
        Be specific and accurate — don't use generic platitudes.

        Issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))
        Spectrum: \(profile.politicalSpectrum.rawValue)
        Values in candidates: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))
        Policy views: \(profile.policyViews.map { "\($0.key): \($0.value)" }.joined(separator: "; "))
        Admires: \(profile.admiredPoliticians.joined(separator: ", "))
        Dislikes: \(profile.dislikedPoliticians.joined(separator: ", "))
        """

        return try await callClaude(
            system: "You are writing a concise voter profile summary. Be direct and specific.",
            userMessage: prompt
        )
    }

    // MARK: - API Call

    private func callClaude(system: String, userMessage: String) async throws -> String {
        var request = URLRequest(url: URL(string: baseURL)!)
        request.httpMethod = "POST"
        request.addValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.addValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.addValue("application/json", forHTTPHeaderField: "content-type")

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 4096,
            "system": system,
            "messages": [
                ["role": "user", "content": userMessage]
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ClaudeError.apiError("API returned non-200 status")
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let content = json?["content"] as? [[String: Any]],
              let text = content.first?["text"] as? String else {
            throw ClaudeError.parseError("Could not parse response")
        }

        return text
    }

    // MARK: - Prompt Building

    private var votingGuideSystemPrompt: String {
        """
        You are a non-partisan voting guide assistant for Austin, Texas. \
        You research candidates thoroughly, present facts fairly, and make personalized \
        recommendations based on the voter's stated values — not your own opinions. \
        Always note where candidates don't perfectly match the voter's profile. \
        Return structured JSON matching the Ballot schema.
        """
    }

    private func buildGuidePrompt(profile: VoterProfile) -> String {
        """
        Build a personalized voting guide for the March 2026 Texas primary election.

        VOTER PROFILE:
        - Address: \(profile.address?.formatted ?? "Austin, TX")
        - Primary: \(profile.primaryBallot.rawValue)
        - Top issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))
        - Spectrum: \(profile.politicalSpectrum.rawValue)
        - Values in candidates: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))
        - Policy stances: \(profile.policyViews.map { "\($0.key): \($0.value)" }.joined(separator: "; "))
        - Politicians admired: \(profile.admiredPoliticians.joined(separator: ", "))
        - Politicians disliked: \(profile.dislikedPoliticians.joined(separator: ", "))

        For each contested race, research candidates and recommend one based on this voter's \
        specific values. Explain WHY in 2-3 sentences connecting to their profile. \
        Note strategic considerations like runoffs.

        Return valid JSON matching this structure: { races: [...], propositions: [...] }
        """
    }

    // MARK: - Response Parsing

    private func parseGuideResponse(_ response: String, profile: VoterProfile) throws -> Ballot {
        // In production, parse the JSON response from Claude
        // For now, return sample data
        return Ballot.sampleRepublican
    }

    // MARK: - Sample Data (development fallback)

    private func sampleSummary(profile: VoterProfile) -> String {
        let spectrum = profile.politicalSpectrum.rawValue.lowercased()
        let issues = profile.topIssues.prefix(3).map(\.rawValue).joined(separator: ", ")
        return "A \(spectrum) Austin voter who prioritizes \(issues). Values \(profile.candidateQualities.first?.rawValue.lowercased() ?? "competence") in candidates and takes a pragmatic, results-oriented approach to politics."
    }
}

enum ClaudeError: Error, LocalizedError {
    case apiError(String)
    case parseError(String)

    var errorDescription: String? {
        switch self {
        case .apiError(let msg): msg
        case .parseError(let msg): msg
        }
    }
}
