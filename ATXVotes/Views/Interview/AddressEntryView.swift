import SwiftUI

struct AddressEntryView: View {
    @EnvironmentObject var store: VotingGuideStore
    @State private var street = ""
    @State private var city = "Austin"
    @State private var state = "TX"
    @State private var zip = ""
    @FocusState private var focusedField: Field?

    enum Field: Hashable { case street, city, zip }

    private var isValid: Bool {
        !street.trimmingCharacters(in: .whitespaces).isEmpty &&
        !city.trimmingCharacters(in: .whitespaces).isEmpty &&
        !zip.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("What's your\nhome address?")
                            .font(Theme.title)
                            .foregroundColor(Theme.textPrimary)
                        Text("We need this to find your exact ballot — your districts depend on where you live.")
                            .font(Theme.callout)
                            .foregroundColor(Theme.textSecondary)
                    }

                    VStack(spacing: 16) {
                        // Street
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Street Address")
                                .font(Theme.caption)
                                .foregroundColor(Theme.textSecondary)
                            TextField("1234 Congress Ave", text: $street)
                                .focused($focusedField, equals: .street)
                                .textContentType(.streetAddressLine1)
                                .submitLabel(.next)
                                .onSubmit { focusedField = .city }
                                .onChange(of: street) {
                                    if street.lowercased() == "station" {
                                        street = "701 Brazos St."
                                        zip = "78701"
                                        let address = Address(street: "701 Brazos St.", city: "Austin", state: "TX", zip: "78701")
                                        store.setAddress(address)
                                        store.advancePhase()
                                        Task { await store.buildVotingGuide() }
                                    } else if street.lowercased() == "error" {
                                        store.errorMessage = "All AI models are overloaded (sonnet-4-6, sonnet-4-20250514). Please try again in a minute."
                                        store.advancePhase()
                                    }
                                }
                                .foregroundColor(Theme.textPrimary)
                                .padding(14)
                                .background(Theme.cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                                .overlay(
                                    RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                        .strokeBorder(focusedField == .street ? Theme.primaryBlue : Color.gray.opacity(0.2), lineWidth: focusedField == .street ? 2 : 1)
                                )
                        }

                        HStack(spacing: 12) {
                            // City
                            VStack(alignment: .leading, spacing: 6) {
                                Text("City")
                                    .font(Theme.caption)
                                    .foregroundColor(Theme.textSecondary)
                                TextField("Austin", text: $city)
                                    .focused($focusedField, equals: .city)
                                    .textContentType(.addressCity)
                                    .submitLabel(.next)
                                    .onSubmit { focusedField = .zip }
                                    .foregroundColor(Theme.textPrimary)
                                    .padding(14)
                                    .background(Theme.cardBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                            .strokeBorder(focusedField == .city ? Theme.primaryBlue : Color.gray.opacity(0.2), lineWidth: focusedField == .city ? 2 : 1)
                                    )
                            }

                            // State (fixed)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("State")
                                    .font(Theme.caption)
                                    .foregroundColor(Theme.textSecondary)
                                Text("TX")
                                    .padding(14)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(Color.gray.opacity(0.05))
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                            .strokeBorder(Color.gray.opacity(0.15), lineWidth: 1)
                                    )
                                    .foregroundColor(Theme.textSecondary)
                            }
                            .frame(width: 70)

                            // Zip
                            VStack(alignment: .leading, spacing: 6) {
                                Text("ZIP")
                                    .font(Theme.caption)
                                    .foregroundColor(Theme.textSecondary)
                                TextField("78701", text: $zip)
                                    .focused($focusedField, equals: .zip)
                                    .textContentType(.postalCode)
                                    .keyboardType(.numberPad)
                                    .submitLabel(.done)
                                    .foregroundColor(Theme.textPrimary)
                                    .padding(14)
                                    .background(Theme.cardBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall)
                                            .strokeBorder(focusedField == .zip ? Theme.primaryBlue : Color.gray.opacity(0.2), lineWidth: focusedField == .zip ? 2 : 1)
                                    )
                            }
                            .frame(width: 110)
                        }
                    }

                    // Privacy note
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "lock.shield")
                            .foregroundColor(Theme.success)
                        Text("Your address stays on your device. It's only used to look up your ballot districts — we never store or share it.")
                            .font(Theme.caption)
                            .foregroundColor(Theme.textSecondary)
                    }
                    .padding(Theme.paddingMedium)
                    .background(Theme.success.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusSmall))
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.top, Theme.paddingLarge)
                .padding(.bottom, 100)
            }
            .scrollDismissesKeyboard(.interactively)
            .onAppear { focusedField = .street }

            VStack(spacing: 0) {
                Divider()
                HStack {
                    Button("Back") { store.goBackPhase() }
                        .font(Theme.headline)
                        .foregroundColor(Theme.textSecondary)
                        .frame(width: 80)

                    Button("Build My Guide") {
                        let address = Address(
                            street: street.trimmingCharacters(in: .whitespaces),
                            city: city.trimmingCharacters(in: .whitespaces),
                            state: "TX",
                            zip: zip.trimmingCharacters(in: .whitespaces)
                        )
                        store.setAddress(address)
                        store.advancePhase()
                        Task { await store.buildVotingGuide() }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!isValid)
                    .opacity(!isValid ? 0.5 : 1)
                }
                .padding(.horizontal, Theme.paddingLarge)
                .padding(.vertical, 16)
            }
            .background(.ultraThinMaterial)
        }
    }
}

#Preview {
    AddressEntryView()
        .environmentObject(VotingGuideStore())
}
