import Foundation
import os

private let logger = Logger(subsystem: "app.atxvotes", category: "ElectionData")

/// Fetches and caches remotely-updated election data from the API.
actor ElectionDataService {
    static let shared = ElectionDataService()

    private let baseURL = "https://api.atxvotes.app/api/election"
    private let appSecret = "atxvotes-2026-primary"

    private let manifestKey = "atx_votes_election_manifest"
    private let republicanDataKey = "atx_votes_election_data_republican"
    private let democratDataKey = "atx_votes_election_data_democrat"

    struct Manifest: Codable {
        var republican: PartyManifest?
        var democrat: PartyManifest?

        struct PartyManifest: Codable {
            let updatedAt: String
            let version: Int
        }
    }

    // MARK: - Check for Updates

    /// Fetches the remote manifest and downloads new ballot data if versions are newer.
    /// Returns ballots that were updated (nil means no update for that party).
    func checkForUpdates() async -> (republican: Ballot?, democrat: Ballot?) {
        do {
            let manifest = try await fetchManifest()
            let cached = loadCachedManifest()

            var repBallot: Ballot?
            var demBallot: Ballot?

            // Check Republican
            if let remote = manifest.republican {
                let cachedVersion = cached?.republican?.version ?? 0
                if remote.version > cachedVersion {
                    repBallot = try await fetchBallot(party: "republican")
                    logger.info("Fetched updated Republican ballot (v\(remote.version))")
                }
            }

            // Check Democrat
            if let remote = manifest.democrat {
                let cachedVersion = cached?.democrat?.version ?? 0
                if remote.version > cachedVersion {
                    demBallot = try await fetchBallot(party: "democrat")
                    logger.info("Fetched updated Democrat ballot (v\(remote.version))")
                }
            }

            // Cache the new manifest
            if let data = try? JSONEncoder().encode(manifest) {
                UserDefaults.standard.set(data, forKey: manifestKey)
            }

            return (repBallot, demBallot)
        } catch {
            logger.error("Election data update check failed: \(error.localizedDescription)")
            return (nil, nil)
        }
    }

    // MARK: - Cached Ballot Access

    /// Loads a previously-cached remote ballot for the given party.
    func loadCachedBallot(for party: PrimaryBallot) -> Ballot? {
        let key = party == .democrat ? democratDataKey : republicanDataKey
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return ElectionDataLoader.loadBallot(from: data)
    }

    // MARK: - Private

    private func fetchManifest() async throws -> Manifest {
        guard let url = URL(string: "\(baseURL)/manifest") else {
            throw URLError(.badURL)
        }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(Manifest.self, from: data)
    }

    private func fetchBallot(party: String) async throws -> Ballot {
        guard let url = URL(string: "\(baseURL)/ballot?party=\(party)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.addValue("Bearer \(appSecret)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        // Cache the raw JSON
        let cacheKey = party == "democrat" ? democratDataKey : republicanDataKey
        UserDefaults.standard.set(data, forKey: cacheKey)

        guard let ballot = ElectionDataLoader.loadBallot(from: data) else {
            throw URLError(.cannotParseResponse)
        }
        return ballot
    }

    private func loadCachedManifest() -> Manifest? {
        guard let data = UserDefaults.standard.data(forKey: manifestKey) else { return nil }
        return try? JSONDecoder().decode(Manifest.self, from: data)
    }
}
