import SwiftUI

struct PoliticianPickerView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var admireText = ""
    @State private var dislikeText = ""
    @State private var admired: [String] = []
    @State private var disliked: [String] = []
    @FocusState private var focusedField: Field?

    enum Field { case admire, dislike }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Politicians you\nadmire or dislike")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("Any level, past or present. This reveals your values better than any label.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    // Admire section
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Politicians I admire", systemImage: "hand.thumbsup.fill")
                            .font(Theme.headline)
                            .foregroundColor(Theme.success)

                        HStack {
                            TextField("e.g. George Washington, Abraham Lincoln...", text: $admireText)
                                .textFieldStyle(.plain)
                                .foregroundColor(Theme.textPrimary)
                                .focused($focusedField, equals: .admire)
                                .submitLabel(.done)
                                .onSubmit { addAdmired() }

                            if !admireText.isEmpty {
                                Button(action: addAdmired) {
                                    Image(systemName: "plus.circle.fill")
                                        .foregroundColor(Theme.success)
                                        .font(.title3)
                                }
                            }
                        }
                        .padding(12)
                        .background(Theme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                .strokeBorder(Color.gray.opacity(0.2), lineWidth: 1)
                        )

                        FlowLayout(spacing: 8) {
                            ForEach(admired, id: \.self) { name in
                                ChipView(label: name, color: Theme.success) {
                                    withAnimation { admired.removeAll { $0 == name } }
                                }
                            }
                        }
                    }

                    // Dislike section
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Politicians I dislike", systemImage: "hand.thumbsdown.fill")
                            .font(Theme.headline)
                            .foregroundColor(Theme.danger)

                        HStack {
                            TextField("e.g. Darth Vader, President Snow...", text: $dislikeText)
                                .textFieldStyle(.plain)
                                .foregroundColor(Theme.textPrimary)
                                .focused($focusedField, equals: .dislike)
                                .submitLabel(.done)
                                .onSubmit { addDisliked() }

                            if !dislikeText.isEmpty {
                                Button(action: addDisliked) {
                                    Image(systemName: "plus.circle.fill")
                                        .foregroundColor(Theme.danger)
                                        .font(.title3)
                                }
                            }
                        }
                        .padding(12)
                        .background(Theme.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                .strokeBorder(Color.gray.opacity(0.2), lineWidth: 1)
                        )

                        FlowLayout(spacing: 8) {
                            ForEach(disliked, id: \.self) { name in
                                ChipView(label: name, color: Theme.danger) {
                                    withAnimation { disliked.removeAll { $0 == name } }
                                }
                            }
                        }
                    }

                    Text("Tip: Naming specific people and explaining why tells us more than any political label.")
                        .font(Theme.caption)
                        .foregroundColor(Theme.textSecondary)
                        .italic()
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.top, Theme.paddingLarge)
                .padding(.bottom, 100)
            }
            .scrollDismissesKeyboard(.interactively)

            VStack(spacing: 0) {
                Divider()
                HStack {
                    Button("Back") { store.goBackPhase() }
                        .font(Theme.headline)
                        .foregroundColor(Theme.textSecondary)
                        .frame(width: 80)

                    Button("Continue") {
                        for name in admired { store.addAdmiredPolitician(name) }
                        for name in disliked { store.addDislikedPolitician(name) }
                        store.advancePhase()
                    }
                    .buttonStyle(PrimaryButtonStyle())
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }

    private func addAdmired() {
        let name = admireText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        withAnimation { admired.append(name) }
        admireText = ""
    }

    private func addDisliked() {
        let name = dislikeText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        withAnimation { disliked.append(name) }
        dislikeText = ""
    }
}

// MARK: - Chip View

struct ChipView: View {
    let label: String
    let color: Color
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 6) {
            Text(label)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(color)
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(color.opacity(0.6))
            }
            .accessibilityLabel("Remove \(label)")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .clipShape(Capsule())
    }
}

// MARK: - Flow Layout (wrapping tags)

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layoutSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layoutSubviews(proposal: proposal, subviews: subviews)
        for (index, subview) in subviews.enumerated() {
            guard index < result.positions.count else { break }
            subview.place(at: CGPoint(
                x: bounds.minX + result.positions[index].x,
                y: bounds.minY + result.positions[index].y
            ), proposal: .unspecified)
        }
    }

    private func layoutSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }

        return (
            size: CGSize(width: maxWidth, height: currentY + lineHeight),
            positions: positions
        )
    }
}

#Preview {
    PoliticianPickerView()
        .environmentObject(VotingGuideStore())
}
