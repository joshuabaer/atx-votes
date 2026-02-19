import SwiftUI

@main
struct AustinVotesApp: App {
    @StateObject private var store = VotingGuideStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
