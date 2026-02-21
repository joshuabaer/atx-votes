import SwiftUI

struct IssuesPickerView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var selectedIssues: Set<Issue> = []
    @State private var shuffledIssues = Issue.allCases.shuffled()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("What matters\nmost to you?")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("Pick 3-5 issues. We'll dig deeper on your top picks.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    LazyVGrid(columns: columns, spacing: 12) {
                        ForEach(shuffledIssues) { issue in
                            IssueCard(
                                issue: issue,
                                isSelected: selectedIssues.contains(issue)
                            ) {
                                withAnimation(.spring(response: 0.25)) {
                                    if selectedIssues.contains(issue) {
                                        selectedIssues.remove(issue)
                                    } else {
                                        selectedIssues.insert(issue)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.top, Theme.paddingLarge)
                .padding(.bottom, 100)
            }

            // Bottom button
            VStack(spacing: 0) {
                Divider()
                HStack {
                    Button("Back") { store.goBackPhase() }
                        .font(Theme.headline)
                        .foregroundColor(Theme.textSecondary)
                        .frame(width: 80)

                    Button("Continue") {
                        store.selectIssues(Array(selectedIssues))
                        store.advancePhase()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(selectedIssues.count < 3)
                    .opacity(selectedIssues.count < 3 ? 0.5 : 1)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

struct IssueCard: View {
    let issue: Issue
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: issue.icon)
                    .font(.system(size: 32))
                    .foregroundColor(isSelected ? .white : Theme.primaryBlue)

                Text(issue.localizedName)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(isSelected ? .white : Theme.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 90)
            .background(isSelected ? Theme.primaryBlue : Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                    .strokeBorder(isSelected ? Theme.primaryBlue : Color.gray.opacity(0.15), lineWidth: 1.5)
            )
            .shadow(color: isSelected ? Theme.primaryBlue.opacity(0.3) : .clear, radius: 6, y: 2)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(issue.localizedName)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

#Preview {
    IssuesPickerView()
        .environmentObject(VotingGuideStore())
}
