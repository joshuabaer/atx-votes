import SwiftUI

@main
struct ATXVotesApp: App {
    @StateObject private var store = VotingGuideStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
