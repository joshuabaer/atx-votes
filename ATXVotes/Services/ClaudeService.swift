import Foundation

// MARK: - GuideGenerating Protocol

protocol GuideGenerating: Sendable {
    func generateVotingGuide(profile: VoterProfile, districts: Ballot.Districts?) async throws -> (Ballot, String)
    func generateProfileSummary(profile: VoterProfile) async throws -> String
}

// MARK: - Claude Response Types (personalization layer only)

struct ClaudeGuideResponse: Decodable {
    let profileSummary: String
    let races: [ClaudeRaceRecommendation]
    let propositions: [ClaudePropositionRecommendation]
}

struct ClaudeRaceRecommendation: Decodable {
    let office: String
    let district: String?
    let recommendedCandidate: String
    let reasoning: String
    let strategicNotes: String?
    let caveats: String?
    let confidence: String
}

struct ClaudePropositionRecommendation: Decodable {
    let number: Int
    let recommendation: String
    let reasoning: String
}

// MARK: - Service

actor ClaudeService: GuideGenerating {
    private let baseURL = "https://api.atxvotes.app/api/guide"
    private let model = "claude-sonnet-4-20250514"
    private let appSecret = "atxvotes-2026-primary"

    // MARK: - Generate Personalized Voting Guide

    func generateVotingGuide(profile: VoterProfile, districts: Ballot.Districts? = nil) async throws -> (Ballot, String) {
        var baseBallot = loadBaseBallot(for: profile.primaryBallot)

        if let districts {
            baseBallot = baseBallot.filtered(to: districts)
        }

        let condensed = buildCondensedBallotDescription(baseBallot)
        let userPrompt = buildUserPrompt(profile: profile, ballotDescription: condensed, ballot: baseBallot)

        let responseText = try await callClaude(
            system: systemPrompt,
            userMessage: userPrompt
        )

        let guideResponse = try parseClaudeResponse(responseText)
        let mergedBallot = merge(recommendations: guideResponse, into: baseBallot)
        return (mergedBallot, guideResponse.profileSummary)
    }

    // MARK: - Generate Profile Summary

    func generateProfileSummary(profile: VoterProfile) async throws -> String {
        let userMessage = """
        Write 2-3 sentences describing this person's politics the way they might describe it to a friend. \
        Be conversational, specific, and insightful — synthesize who they are as a voter, don't just list positions.

        - Political spectrum: \(profile.politicalSpectrum.rawValue)
        - Top issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))
        - Values in candidates: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))
        - Policy stances: \(profile.policyViews.map { "\($0.key): \($0.value)" }.joined(separator: "; "))
        - Politicians admired: \(profile.admiredPoliticians.joined(separator: ", "))
        - Politicians disliked: \(profile.dislikedPoliticians.joined(separator: ", "))

        Return ONLY the summary text — no JSON, no quotes, no labels.
        """

        let response = try await callClaude(
            system: "You are a concise political analyst. Return only plain text, no formatting.",
            userMessage: userMessage
        )
        return response.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Load Base Ballot

    private func loadBaseBallot(for primary: PrimaryBallot) -> Ballot {
        switch primary {
        case .democrat:
            return Ballot.sampleDemocrat
        case .republican:
            return Ballot.sampleRepublican
        case .undecided:
            // Should not be reached — buildVotingGuide always sets an explicit party
            return Ballot.sampleRepublican
        }
    }

    // MARK: - Condensed Ballot Description

    private func buildCondensedBallotDescription(_ ballot: Ballot) -> String {
        var lines: [String] = []
        lines.append("ELECTION: \(ballot.electionName)")
        lines.append("")

        for race in ballot.races.sorted(by: { $0.sortOrder < $1.sortOrder }) {
            let label = race.district != nil ? "\(race.office) — \(race.district!)" : race.office
            let contested = race.isContested ? "" : " [UNCONTESTED]"
            lines.append("RACE: \(label)\(contested)")

            for candidate in race.candidates {
                let incumbent = candidate.isIncumbent ? " (incumbent)" : ""
                lines.append("  - \(candidate.name)\(incumbent)")
                lines.append("    Positions: \(candidate.keyPositions.joined(separator: "; "))")
                if !candidate.endorsements.isEmpty {
                    lines.append("    Endorsements: \(candidate.endorsements.joined(separator: "; "))")
                }
                if !candidate.pros.isEmpty {
                    lines.append("    Pros: \(candidate.pros.joined(separator: "; "))")
                }
                if !candidate.cons.isEmpty {
                    lines.append("    Cons: \(candidate.cons.joined(separator: "; "))")
                }
            }
            lines.append("")
        }

        if !ballot.propositions.isEmpty {
            for prop in ballot.propositions {
                lines.append("PROPOSITION \(prop.number): \(prop.title)")
                lines.append("  \(prop.description)")
                lines.append("")
            }
        }

        return lines.joined(separator: "\n")
    }

    // MARK: - Prompts

    private var systemPrompt: String {
        """
        You are a non-partisan voting guide assistant for Austin, Texas elections. \
        Your job is to make personalized recommendations based ONLY on the voter's stated values and the candidate data provided. \
        You must NEVER recommend a candidate who is not listed in the provided ballot data. \
        You must NEVER invent or hallucinate candidate information. \
        Respond with ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.
        """
    }

    private func buildUserPrompt(profile: VoterProfile, ballotDescription: String, ballot: Ballot) -> String {
        let raceLines = ballot.races.map { race in
            let names = race.candidates.map(\.name).joined(separator: ", ")
            return "\(race.office): \(names)"
        }

        return """
        Based on this voter's profile, recommend ONE candidate per race and a stance on each proposition.

        IMPORTANT: For the profileSummary field, write 2-3 sentences in first person describing this person's politics the way they would explain it to a friend over coffee. Be conversational, specific, and avoid generic labels like "moderate Republican" — instead capture what actually drives their views.

        VOTER PROFILE:
        - Primary: \(profile.primaryBallot.rawValue)
        - Top issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))
        - Political spectrum: \(profile.politicalSpectrum.rawValue)
        - Values in candidates: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))
        - Policy stances: \(profile.policyViews.map { "\($0.key): \($0.value)" }.joined(separator: "; "))
        - Politicians admired: \(profile.admiredPoliticians.joined(separator: ", "))
        - Politicians disliked: \(profile.dislikedPoliticians.joined(separator: ", "))

        BALLOT DATA:
        \(ballotDescription)

        VALID CANDIDATES (you MUST only recommend names from this list):
        \(raceLines.joined(separator: "\n"))

        Return this exact JSON structure:
        {
          "profileSummary": "2-3 sentences describing this person's politics the way they'd describe it to a friend — conversational and specific",
          "races": [
            {
              "office": "exact office name from ballot",
              "district": "district string or null",
              "recommendedCandidate": "exact candidate name from ballot",
              "reasoning": "2-3 sentences connecting to voter profile",
              "strategicNotes": "optional runoff/tactical note or null",
              "caveats": "optional concern or null",
              "confidence": "Strong Match|Good Match|Best Available|Symbolic Race"
            }
          ],
          "propositions": [
            {
              "number": 1,
              "recommendation": "Lean Yes|Lean No|Your Call",
              "reasoning": "1-2 sentences connecting to voter profile"
            }
          ]
        }
        """
    }

    // MARK: - API Call

    private func callClaude(system: String, userMessage: String) async throws -> String {
        guard let url = URL(string: baseURL) else {
            throw ClaudeError.apiError("Invalid API URL")
        }

        var request = URLRequest(url: url, timeoutInterval: 30)
        request.httpMethod = "POST"
        request.addValue("Bearer \(appSecret)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 8192,
            "system": system,
            "messages": [
                ["role": "user", "content": userMessage]
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ClaudeError.apiError("Invalid response")
        }

        switch httpResponse.statusCode {
        case 200:
            break
        case 401:
            throw ClaudeError.invalidAPIKey
        case 429:
            throw ClaudeError.rateLimited
        case 500...599:
            throw ClaudeError.serverError(httpResponse.statusCode)
        default:
            let body = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw ClaudeError.apiError("HTTP \(httpResponse.statusCode): \(body)")
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let content = json?["content"] as? [[String: Any]],
              let text = content.first?["text"] as? String else {
            throw ClaudeError.parseError("Could not extract text from API response")
        }

        return text
    }

    // MARK: - Parse Response

    private func parseClaudeResponse(_ text: String) throws -> ClaudeGuideResponse {
        // Strip markdown code fences if present
        var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("```json") {
            cleaned = String(cleaned.dropFirst(7))
        } else if cleaned.hasPrefix("```") {
            cleaned = String(cleaned.dropFirst(3))
        }
        if cleaned.hasSuffix("```") {
            cleaned = String(cleaned.dropLast(3))
        }
        cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)

        guard let data = cleaned.data(using: .utf8) else {
            throw ClaudeError.parseError("Response is not valid UTF-8")
        }

        do {
            return try JSONDecoder().decode(ClaudeGuideResponse.self, from: data)
        } catch {
            throw ClaudeError.parseError("Failed to decode Claude response: \(error.localizedDescription)")
        }
    }

    // MARK: - Merge Recommendations

    private func merge(recommendations: ClaudeGuideResponse, into ballot: Ballot) -> Ballot {
        var merged = ballot

        for (index, race) in merged.races.enumerated() {
            guard let rec = recommendations.races.first(where: {
                $0.office == race.office && $0.district == race.district
            }) else { continue }

            // Clear existing recommendations
            for candIndex in merged.races[index].candidates.indices {
                merged.races[index].candidates[candIndex].isRecommended = false
            }
            merged.races[index].recommendation = nil

            // Find the recommended candidate by name
            if let candIndex = merged.races[index].candidates.firstIndex(where: {
                $0.name == rec.recommendedCandidate
            }) {
                merged.races[index].candidates[candIndex].isRecommended = true
                merged.races[index].recommendation = RaceRecommendation(
                    candidateId: merged.races[index].candidates[candIndex].id,
                    candidateName: rec.recommendedCandidate,
                    reasoning: rec.reasoning,
                    strategicNotes: rec.strategicNotes,
                    caveats: rec.caveats,
                    confidence: RaceRecommendation.Confidence(rawValue: rec.confidence) ?? .moderate
                )
            }
        }

        // Merge proposition recommendations
        for (index, prop) in merged.propositions.enumerated() {
            if let rec = recommendations.propositions.first(where: { $0.number == prop.number }) {
                merged.propositions[index].recommendation =
                    Proposition.PropRecommendation(rawValue: rec.recommendation) ?? .yourCall
                merged.propositions[index].reasoning = rec.reasoning
            }
        }

        return merged
    }

}

// MARK: - Errors

enum ClaudeError: Error, LocalizedError {
    case apiError(String)
    case parseError(String)
    case invalidAPIKey
    case rateLimited
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .apiError(let msg): msg
        case .parseError(let msg): msg
        case .invalidAPIKey: "Authentication error. Please update the app."
        case .rateLimited: "Too many requests. Please wait a moment and try again."
        case .serverError(let code): "Server error (\(code)). Please try again later."
        }
    }
}
