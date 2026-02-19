import Foundation
import UserNotifications

class NotificationService {
    static let shared = NotificationService()

    private let remindersEnabledKey = "austin_votes_reminders_enabled"

    var remindersEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: remindersEnabledKey) }
        set {
            UserDefaults.standard.set(newValue, forKey: remindersEnabledKey)
            if newValue {
                scheduleAllReminders()
            } else {
                cancelAllReminders()
            }
        }
    }

    // MARK: - Key Dates (March 2026 Texas Primary)

    private struct Reminder {
        let id: String
        let title: String
        let body: String
        let date: DateComponents
    }

    private var reminders: [Reminder] {
        [
            Reminder(
                id: "early_voting_starts",
                title: "Early Voting Starts Today!",
                body: "Vote at any Travis County Vote Center through Feb 27. Check your cheat sheet before you go!",
                date: DateComponents(year: 2026, month: 2, day: 17, hour: 8, minute: 0)
            ),
            Reminder(
                id: "early_voting_midweek",
                title: "Early Voting Reminder",
                body: "Early voting ends Friday. Beat the lines — vote today at any Vote Center in Travis County.",
                date: DateComponents(year: 2026, month: 2, day: 24, hour: 10, minute: 0)
            ),
            Reminder(
                id: "early_voting_last_day",
                title: "Last Day of Early Voting!",
                body: "Today's your last chance to vote early. Extended hours until 10 PM at all Vote Centers.",
                date: DateComponents(year: 2026, month: 2, day: 27, hour: 8, minute: 0)
            ),
            Reminder(
                id: "election_day_eve",
                title: "Election Day is Tomorrow",
                body: "Print your cheat sheet tonight — phones aren't allowed in the voting booth in Travis County.",
                date: DateComponents(year: 2026, month: 3, day: 2, hour: 18, minute: 0)
            ),
            Reminder(
                id: "election_day",
                title: "It's Election Day!",
                body: "Polls are open 7 AM - 7 PM. Vote at any Vote Center. Don't forget your photo ID!",
                date: DateComponents(year: 2026, month: 3, day: 3, hour: 8, minute: 0)
            ),
        ]
    }

    // MARK: - Permission & Scheduling

    func requestPermissionAndEnable() async -> Bool {
        let center = UNUserNotificationCenter.current()
        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
            if granted {
                await MainActor.run { remindersEnabled = true }
            }
            return granted
        } catch {
            return false
        }
    }

    func scheduleAllReminders() {
        let center = UNUserNotificationCenter.current()
        let now = Date()

        for reminder in reminders {
            guard let reminderDate = Calendar.current.date(from: reminder.date),
                  reminderDate > now else { continue }

            let content = UNMutableNotificationContent()
            content.title = reminder.title
            content.body = reminder.body
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(dateMatching: reminder.date, repeats: false)
            let request = UNNotificationRequest(identifier: reminder.id, content: content, trigger: trigger)

            center.add(request)
        }
    }

    func cancelAllReminders() {
        let ids = reminders.map(\.id)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
    }
}
