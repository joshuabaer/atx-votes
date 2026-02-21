import Foundation

enum Election {
    static let name = String(localized: "March 2026 Texas Primary")
    static let date = DateComponents(calendar: .current, year: 2026, month: 3, day: 3).date!
    static var dateFormatted: String {
        date.formatted(date: .long, time: .omitted)
    }
}
