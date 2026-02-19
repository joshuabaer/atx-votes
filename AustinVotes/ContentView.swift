import SwiftUI

struct ContentView: View {
    @EnvironmentObject var store: VotingGuideStore

    var body: some View {
        Group {
            if store.guideComplete {
                MainTabView()
            } else {
                OnboardingFlowView()
            }
        }
    }
}

// MARK: - Main Tab View (shown after guide is built)

struct MainTabView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            BallotOverviewView()
                .tabItem {
                    Label("My Ballot", systemImage: "checkmark.seal.fill")
                }
                .tag(0)

            CheatSheetView()
                .tabItem {
                    Label("Cheat Sheet", systemImage: "list.clipboard.fill")
                }
                .tag(1)

            VotingInfoView()
                .tabItem {
                    Label("Vote Info", systemImage: "info.circle.fill")
                }
                .tag(2)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
                .tag(3)
        }
        .tint(Theme.primary)
    }
}

#Preview {
    ContentView()
        .environmentObject(VotingGuideStore.preview)
}
