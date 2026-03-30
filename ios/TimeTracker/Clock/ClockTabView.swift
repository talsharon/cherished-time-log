import SwiftUI

struct ClockTabView: View {
    private static let sessionStartTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.timeStyle = .short
        f.dateStyle = .none
        return f
    }()

    private static let commentAutocompleteMaxRows = 10

    @ObservedObject var viewModel: ClockViewModel
    @FocusState private var commentFocused: Bool
    @State private var newTitleSheet = false
    @State private var newTitleText = ""
    @State private var activityPickerSheet = false
    @State private var activitySearch = ""
    @State private var startTimeSheet = false
    @State private var editStart = Date()

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if viewModel.sessionLoading {
                    ProgressView()
                        .tint(AppTheme.accent)
                } else {
                    content
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Button {
                Task { await viewModel.generateInsights() }
            } label: {
                if viewModel.isGeneratingInsights {
                    ProgressView()
                        .tint(AppTheme.accent)
                } else {
                    Image(systemName: "sparkles")
                        .font(.body.weight(.medium))
                        .foregroundStyle(AppTheme.accent)
                }
            }
            .disabled(viewModel.isGeneratingInsights)
            .padding(.trailing, 16)
            .padding(.top, 8)
            .accessibilityLabel("Generate insights")
        }
        .background(AppTheme.background)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    commentFocused = false
                }
                .font(.body.weight(.semibold))
                .foregroundStyle(AppTheme.accent)
            }
        }
        .task {
            PhoneSessionManager.shared.commandHandler = viewModel
            await viewModel.load()
        }
        .sheet(isPresented: $newTitleSheet) {
            NavigationStack {
                Form {
                    TextField("Title", text: $newTitleText)
                }
                .scrollContentBackground(.hidden)
                .background(AppTheme.background)
                .navigationTitle("New activity")
                .foregroundStyle(AppTheme.foreground)
                .toolbarBackground(AppTheme.background, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { newTitleSheet = false }
                            .foregroundStyle(AppTheme.textMuted)
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Create") {
                            let t = newTitleText.trimmingCharacters(in: .whitespacesAndNewlines)
                            guard !t.isEmpty else { return }
                            Task {
                                await viewModel.createTitle(name: t)
                                newTitleSheet = false
                                newTitleText = ""
                            }
                        }
                        .foregroundStyle(AppTheme.accent)
                    }
                }
            }
            .presentationDetents([.medium])
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $activityPickerSheet, onDismiss: { activitySearch = "" }) {
            NavigationStack {
                VStack(spacing: 0) {
                    TextField("Search", text: $activitySearch)
                        .textFieldStyle(ThemedTextFieldStyle())
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    List {
                        Button {
                            activityPickerSheet = false
                            activitySearch = ""
                            newTitleSheet = true
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.body)
                                    .foregroundStyle(AppTheme.accent)
                                Text("Create new…")
                                    .foregroundStyle(AppTheme.foreground)
                            }
                        }
                        ForEach(filteredActivityTitles, id: \.id) { t in
                            Button {
                                Task {
                                    await viewModel.updateTitle(t.name)
                                    activityPickerSheet = false
                                    activitySearch = ""
                                }
                            } label: {
                                HStack(spacing: 10) {
                                    Image(uiImage: TitleDotUIImage.dotImage(color: viewModel.color(for: t.name)))
                                        .renderingMode(.original)
                                        .resizable()
                                        .frame(width: 10, height: 10)
                                    Text(t.name)
                                        .foregroundStyle(AppTheme.foreground)
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                    .background(AppTheme.background)
                }
                .background(AppTheme.background)
                .navigationTitle("Activity")
                .navigationBarTitleDisplayMode(.inline)
                .foregroundStyle(AppTheme.foreground)
                .toolbarBackground(AppTheme.background, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            activityPickerSheet = false
                            activitySearch = ""
                        }
                        .foregroundStyle(AppTheme.textMuted)
                    }
                }
            }
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $startTimeSheet) {
            NavigationStack {
                Form {
                    DatePicker("Start time", selection: $editStart, displayedComponents: [.hourAndMinute, .date])
                }
                .scrollContentBackground(.hidden)
                .background(AppTheme.background)
                .navigationTitle("Edit start time")
                .foregroundStyle(AppTheme.foreground)
                .toolbarBackground(AppTheme.background, for: .navigationBar)
                .toolbarColorScheme(.dark, for: .navigationBar)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { startTimeSheet = false }
                            .foregroundStyle(AppTheme.textMuted)
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            Task {
                                await viewModel.updateStartTime(editStart)
                                startTimeSheet = false
                            }
                        }
                        .foregroundStyle(AppTheme.accent)
                    }
                }
            }
            .presentationDetents([.medium])
            .preferredColorScheme(.dark)
        }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let msg = viewModel.errorMessage {
                    Text(msg)
                        .font(.footnote)
                        .foregroundStyle(AppTheme.destructive)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                HStack {
                    tacticalBlock
                    Button {
                        Task { await viewModel.resetTactical() }
                    } label: {
                        Image(systemName: "arrow.counterclockwise.circle")
                            .font(.system(size: 28))
                            .foregroundStyle(AppTheme.border)
                            .symbolRenderingMode(.hierarchical)
                    }
                    .accessibilityLabel("Reset tactical timer")
                }
                .padding(.horizontal)

                mainStopwatchBlock

                VStack(alignment: .leading, spacing: 8) {
                    Text("What are you up to?")
                        .font(.body)
                        .foregroundStyle(AppTheme.textMuted)

                    Button {
                        activityPickerSheet = true
                    } label: {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(viewModel.color(for: viewModel.currentTitle))
                                .frame(width: 10, height: 10)
                            Text(viewModel.currentTitle)
                                .foregroundStyle(AppTheme.foreground)
                            Spacer(minLength: 8)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(AppTheme.textMuted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Activity, \(viewModel.currentTitle)")
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .frame(minHeight: 48)
                    .background(AppTheme.secondary.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                            .stroke(AppTheme.border.opacity(0.8), lineWidth: 1)
                    )

                    VStack(alignment: .leading, spacing: 6) {
                        TextField("Add a comment…", text: $viewModel.currentComment)
                            .textFieldStyle(ThemedTextFieldStyle())
                            .focused($commentFocused)
                            .onChange(of: viewModel.currentComment) { _, new in
                                Task { await viewModel.updateComment(new) }
                            }

                        if commentFocused && !commentAutocompleteQuery.isEmpty && !commentAutocompleteMatches.isEmpty {
                            ScrollView {
                                VStack(alignment: .leading, spacing: 0) {
                                    ForEach(Array(commentAutocompleteMatches.enumerated()), id: \.offset) { index, phrase in
                                        Button {
                                            viewModel.currentComment = phrase
                                            commentFocused = false
                                        } label: {
                                            Text(phrase)
                                                .font(.subheadline)
                                                .foregroundStyle(AppTheme.foreground)
                                                .multilineTextAlignment(.leading)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 10)
                                        }
                                        .buttonStyle(.plain)
                                        if index < commentAutocompleteMatches.count - 1 {
                                            Divider()
                                                .background(AppTheme.border.opacity(0.8))
                                        }
                                    }
                                }
                            }
                            .frame(maxHeight: 220)
                            .background(AppTheme.secondary.opacity(0.6))
                            .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                                    .stroke(AppTheme.border.opacity(0.8), lineWidth: 1)
                            )
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

                Button {
                    Task { await viewModel.done() }
                } label: {
                    if viewModel.isSaving {
                        ProgressView()
                            .tint(AppTheme.accentForeground)
                            .frame(maxWidth: .infinity, minHeight: 64)
                    } else {
                        Text("DONE")
                            .font(.title3.bold())
                            .frame(maxWidth: .infinity, minHeight: 64)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
                .clipShape(RoundedRectangle(cornerRadius: AppTheme.radiusButtonLarge, style: .continuous))
                .shadow(color: AppTheme.accent.opacity(0.25), radius: 12, y: 4)
                .disabled(viewModel.isSaving || viewModel.startTime == nil || commentFocused)
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
            .padding(.top, 44)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var sortedActivityTitles: [TitleRow] {
        viewModel.titles.sorted(by: { a, b in
            if a.name == "Idle" { return true }
            if b.name == "Idle" { return false }
            return a.name < b.name
        })
    }

    private var filteredActivityTitles: [TitleRow] {
        let q = activitySearch.trimmingCharacters(in: .whitespacesAndNewlines)
        if q.isEmpty { return sortedActivityTitles }
        return sortedActivityTitles.filter { $0.name.localizedCaseInsensitiveContains(q) }
    }

    private var commentAutocompleteQuery: String {
        viewModel.currentComment.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var commentAutocompleteMatches: [String] {
        let q = commentAutocompleteQuery
        guard !q.isEmpty else { return [] }
        return viewModel.commentAutocompletePhrases
            .filter { $0.localizedCaseInsensitiveContains(q) }
            .prefix(Self.commentAutocompleteMaxRows)
            .map { $0 }
    }

    private var tacticalBlock: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let ref = viewModel.tacticalStartTime ?? viewModel.startTime ?? timeline.date
            let sec = Int(timeline.date.timeIntervalSince(ref))
            Text(StopwatchFormat.hms(totalSeconds: sec))
                .font(.system(size: 34, weight: .light, design: .monospaced))
                .monospacedDigit()
                .foregroundStyle(AppTheme.textMuted)
        }
    }

    private var mainStopwatchBlock: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let ref = viewModel.startTime ?? timeline.date
            let sec = Int(timeline.date.timeIntervalSince(ref))
            Button {
                if viewModel.startTime != nil {
                    editStart = viewModel.startTime ?? Date()
                    startTimeSheet = true
                }
            } label: {
                VStack(spacing: 6) {
                    Text(StopwatchFormat.hms(totalSeconds: sec))
                        .font(.system(size: 64, weight: .light, design: .monospaced))
                        .monospacedDigit()
                        .foregroundStyle(AppTheme.foreground)
                    if let start = viewModel.startTime {
                        Text("Started \(Self.sessionStartTimeFormatter.string(from: start)) · tap to edit")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textMuted)
                            .multilineTextAlignment(.center)
                    } else {
                        Text("Not running")
                            .font(.caption)
                            .foregroundStyle(AppTheme.textMuted)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

}
