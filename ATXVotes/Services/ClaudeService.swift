import Foundation
import os

private let logger = Logger(subsystem: "app.atxvotes", category: "ClaudeService")

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
    let caveats: String?
    let confidence: String?
}

// MARK: - Service

actor ClaudeService: GuideGenerating {
    private let baseURL = "https://api.atxvotes.app/api/guide"
    private let models = [
        "claude-sonnet-4-6",
        "claude-sonnet-4-20250514",
    ]
    private let appSecret = "atxvotes-2026-primary"

    // MARK: - Generate Personalized Voting Guide

    func generateVotingGuide(profile: VoterProfile, districts: Ballot.Districts? = nil) async throws -> (Ballot, String) {
        var baseBallot = await loadBaseBallot(for: profile.primaryBallot)

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
        Be conversational, specific, and insightful — synthesize who they are as a voter, don't just list positions. \
        NEVER say "I'm a Democrat" or "I'm a Republican" or identify with a party label — focus on their actual views, values, and priorities.

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

    private func loadBaseBallot(for primary: PrimaryBallot) async -> Ballot {
        // Try remote-updated data first, fall back to bundled
        if let remote = await ElectionDataService.shared.loadCachedBallot(for: primary) {
            return remote
        }
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
                if let bg = prop.background {
                    lines.append("  Background: \(bg)")
                }
                if let fiscal = prop.fiscalImpact {
                    lines.append("  Fiscal impact: \(fiscal)")
                }
                if !prop.supporters.isEmpty {
                    lines.append("  Supporters: \(prop.supporters.joined(separator: "; "))")
                }
                if !prop.opponents.isEmpty {
                    lines.append("  Opponents: \(prop.opponents.joined(separator: "; "))")
                }
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
        Recommend ONE candidate per race and a stance on each proposition. Be concise.

        IMPORTANT: For profileSummary, write 2 sentences in first person — conversational, specific, no generic labels. NEVER say "I'm a Democrat/Republican" — focus on values and priorities.

        VOTER: \(profile.primaryBallot.rawValue) primary | Spectrum: \(profile.politicalSpectrum.rawValue)
        Issues: \(profile.topIssues.map(\.rawValue).joined(separator: ", "))
        Values: \(profile.candidateQualities.map(\.rawValue).joined(separator: ", "))
        Stances: \(profile.policyViews.map { "\($0.key): \($0.value)" }.joined(separator: "; "))
        Admires: \(profile.admiredPoliticians.joined(separator: ", "))
        Dislikes: \(profile.dislikedPoliticians.joined(separator: ", "))

        BALLOT:
        \(ballotDescription)

        VALID CANDIDATES (MUST only use these names):
        \(raceLines.joined(separator: "\n"))

        Return ONLY this JSON:
        {
          "profileSummary": "2 sentences, first person, conversational",
          "races": [
            {
              "office": "exact office name",
              "district": "district or null",
              "recommendedCandidate": "exact name from list",
              "reasoning": "1 sentence why this candidate fits the voter",
              "strategicNotes": null,
              "caveats": null,
              "confidence": "Strong Match|Good Match|Best Available|Symbolic Race"
            }
          ],
          "propositions": [
            {
              "number": 1,
              "recommendation": "Lean Yes|Lean No|Your Call",
              "reasoning": "1 sentence connecting to voter",
              "caveats": null,
              "confidence": "Clear Call|Lean|Genuinely Contested"
            }
          ]
        }
        """
    }

    // MARK: - API Call

    private func callClaude(system: String, userMessage: String, models fallbackModels: [String]? = nil) async throws -> String {
        guard let url = URL(string: baseURL) else {
            throw ClaudeError.apiError("Invalid API URL")
        }

        let modelsToTry = fallbackModels ?? self.models
        var triedModels: [String] = []

        for (index, model) in modelsToTry.enumerated() {
            triedModels.append(model)

            // Try up to 2 attempts per model (initial + 1 retry for 529)
            for attempt in 0...1 {
                var request = URLRequest(url: url, timeoutInterval: 120)
                request.httpMethod = "POST"
                request.addValue("Bearer \(appSecret)", forHTTPHeaderField: "Authorization")
                request.addValue("application/json", forHTTPHeaderField: "Content-Type")

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

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw ClaudeError.apiError("Invalid response")
                }

                switch httpResponse.statusCode {
                case 200:
                    if model != modelsToTry.first {
                        logger.info("Succeeded with fallback model \(model)")
                    }
                    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                    guard let content = json?["content"] as? [[String: Any]],
                          let text = content.first?["text"] as? String else {
                        throw ClaudeError.parseError("Could not extract text from API response")
                    }
                    return text

                case 529:
                    if attempt == 0 {
                        logger.warning("\(model) is overloaded (529), retrying in 2s...")
                        try await Task.sleep(for: .seconds(2))
                        continue
                    }
                    // Second 529 — fall through to try next model
                    if index < modelsToTry.count - 1 {
                        logger.warning("\(model) still overloaded, trying \(modelsToTry[index + 1])...")
                        break
                    }
                    throw ClaudeError.overloaded(triedModels)

                case 401:
                    throw ClaudeError.invalidAPIKey
                case 429:
                    throw ClaudeError.rateLimited
                case 500...599:
                    throw ClaudeError.serverError(httpResponse.statusCode)
                default:
                    // Non-retryable error — try next model if available
                    let bodyStr = String(data: data, encoding: .utf8) ?? "Unknown error"
                    // Extract just the error message from the API response
                    let apiMessage: String
                    if let jsonData = bodyStr.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                       let error = json["error"] as? [String: Any],
                       let msg = error["message"] as? String {
                        apiMessage = msg
                    } else {
                        apiMessage = String(bodyStr.prefix(200))
                    }
                    logger.error("\(model) returned HTTP \(httpResponse.statusCode): \(apiMessage)")

                    // Credit balance error is not model-specific — don't try fallbacks
                    if apiMessage.lowercased().contains("credit balance") {
                        logger.fault("API credit balance is too low! Top up at console.anthropic.com")
                        throw ClaudeError.outOfCredits
                    }

                    if index < modelsToTry.count - 1 {
                        logger.warning("Trying \(modelsToTry[index + 1])...")
                        break
                    }
                    throw ClaudeError.apiError("\(model): \(apiMessage)")
                }

                break // Move to next model after a non-retryable error
            }
        }

        throw ClaudeError.overloaded(triedModels)
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
                merged.propositions[index].caveats = rec.caveats
                if let conf = rec.confidence {
                    merged.propositions[index].confidence =
                        Proposition.PropConfidence(rawValue: conf)
                }
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
    case overloaded([String])
    case outOfCredits
    case serverError(Int)

    var errorDescription: String? {
        switch self {
        case .apiError(let msg): return msg
        case .parseError(let msg): return msg
        case .invalidAPIKey: return String(localized: "Authentication error. Please update the app.")
        case .rateLimited: return String(localized: "Too many requests. Please wait a moment and try again.")
        case .overloaded(let models):
            let names = models.map { $0.replacingOccurrences(of: "claude-", with: "") }
            return String(localized: "All AI models are overloaded (\(names.joined(separator: ", "))). Please try again in a minute.")
        case .outOfCredits:
            return String(localized: "Our AI hamsters have run out of snacks. The developer has been notified — please try again later!")
        case .serverError(let code): return String(localized: "Server error (\(code)). Please try again later.")
        }
    }
}
