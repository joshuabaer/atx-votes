import Foundation

actor DistrictLookupService {
    private let baseURL = "https://atxvotes-api.joshuabaer.workers.dev/api/districts"
    private let appSecret = "atxvotes-2026-primary"

    func lookupDistricts(for address: Address) async throws -> Ballot.Districts {
        guard let url = URL(string: baseURL) else {
            throw DistrictError.networkError("Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(appSecret)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: String] = [
            "street": address.street,
            "city": address.city,
            "state": address.state,
            "zip": address.zip,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw DistrictError.networkError("Invalid response")
        }

        switch httpResponse.statusCode {
        case 200:
            break
        case 404:
            throw DistrictError.addressNotFound
        default:
            throw DistrictError.networkError("HTTP \(httpResponse.statusCode)")
        }

        let result = try JSONDecoder().decode(DistrictResult.self, from: data)
        return Ballot.Districts(
            congressional: result.congressional,
            stateSenate: result.stateSenate,
            stateHouse: result.stateHouse,
            countyCommissioner: result.countyCommissioner,
            schoolBoard: result.schoolBoard
        )
    }
}

private struct DistrictResult: Decodable {
    let congressional: String?
    let stateSenate: String?
    let stateHouse: String?
    let countyCommissioner: String?
    let schoolBoard: String?
}

enum DistrictError: Error, LocalizedError {
    case addressNotFound
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .addressNotFound: "We couldn't find that address. Showing all races in your area."
        case .networkError(let msg): "District lookup failed: \(msg). Showing all races."
        }
    }
}
