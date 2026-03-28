import SwiftUI

struct ClockTabView: View {
    private static let sessionStartTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.timeStyle = .short
        f.dateStyle = .none
        return f
    }()

    @ObservedObject var viewModel: ClockViewModel
    @FocusState private var commentFocused: Bool
    @State private var newTitleSheet = false
    @State private var newTitleText = ""
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

                    Menu {
                        Button("Create new…") {
                            newTitleSheet = true
                        }
                        ForEach(sortedActivityTitles, id: \.id) { t in
                            Button {
                                Task { await viewModel.updateTitle(t.name) }
                            } label: {
                                Label {
                                    Text(t.name)
                                } icon: {
                                    Image(uiImage: TitleDotUIImage.dotImage(color: viewModel.color(for: t.name)))
                                        .renderingMode(.original)
                                        .resizable()
                                        .frame(width: 10, height: 10)
                                }
                            }
                            .labelStyle(.titleAndIcon)
                        }
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

                    TextField("Add a comment…", text: $viewModel.currentComment)
                        .textFieldStyle(ThemedTextFieldStyle())
                        .focused($commentFocused)
                        .onChange(of: viewModel.currentComment) { _, new in
                            Task { await viewModel.updateComment(new) }
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

    private var tacticalBlock: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let ref = viewModel.tacticalStartTime ?? viewModel.startTime ?? timeline.date
            let sec = Int(timeline.date.timeIntervalSince(ref))
            Text(formatHMS(sec))
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
                    Text(formatHMS(sec))
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

    private func formatHMS(_ total: Int) -> String {
        let s = max(0, total)
        let h = s / 3600
        let m = (s % 3600) / 60
        let r = s % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, r)
        }
        return String(format: "%d:%02d", m, r)
    }
}
