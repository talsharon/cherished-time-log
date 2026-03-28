import SwiftUI

struct ClockTabView: View {
    @ObservedObject var viewModel: ClockViewModel
    var onSignOut: () -> Void
    @State private var newTitleSheet = false
    @State private var newTitleText = ""
    @State private var startTimeSheet = false
    @State private var editStart = Date()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.sessionLoading {
                    ProgressView()
                } else {
                    content
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .navigationTitle("Clock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await viewModel.generateInsights() }
                    } label: {
                        if viewModel.isGeneratingInsights {
                            ProgressView()
                        } else {
                            Image(systemName: "sparkles")
                        }
                    }
                    .disabled(viewModel.isGeneratingInsights)
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Sign out", role: .destructive, action: onSignOut)
                }
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
                .navigationTitle("New activity")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { newTitleSheet = false }
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
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $startTimeSheet) {
            NavigationStack {
                Form {
                    DatePicker("Start time", selection: $editStart, displayedComponents: [.hourAndMinute, .date])
                }
                .navigationTitle("Edit start time")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { startTimeSheet = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") {
                            Task {
                                await viewModel.updateStartTime(editStart)
                                startTimeSheet = false
                            }
                        }
                    }
                }
            }
            .presentationDetents([.medium])
        }
    }

    private var content: some View {
        VStack(spacing: 20) {
            if let msg = viewModel.errorMessage {
                Text(msg)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            HStack {
                tacticalBlock
                Button {
                    Task { await viewModel.resetTactical() }
                } label: {
                    Image(systemName: "arrow.counterclockwise.circle.fill")
                        .font(.title2)
                }
                .accessibilityLabel("Reset tactical timer")
            }

            mainStopwatchBlock

            VStack(alignment: .leading, spacing: 8) {
                Text("What are you up to?")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Picker("Title", selection: Binding(
                    get: { viewModel.currentTitle },
                    set: { v in
                        if v == "__new__" {
                            newTitleSheet = true
                        } else {
                            Task { await viewModel.updateTitle(v) }
                        }
                    }
                )) {
                    Text("Create new…").tag("__new__")
                    ForEach(viewModel.titles.sorted(by: { a, b in
                        if a.name == "Idle" { return true }
                        if b.name == "Idle" { return false }
                        return a.name < b.name
                    }), id: \.id) { t in
                        HStack {
                            Circle()
                                .fill(viewModel.color(for: t.name))
                                .frame(width: 10, height: 10)
                            Text(t.name)
                        }
                        .tag(t.name)
                    }
                }
                .pickerStyle(.menu)

                TextField("Add a comment…", text: $viewModel.currentComment, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2 ... 4)
                    .onChange(of: viewModel.currentComment) { _, new in
                        Task { await viewModel.updateComment(new) }
                    }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)

            Spacer(minLength: 0)

            Button {
                Task { await viewModel.done() }
            } label: {
                if viewModel.isSaving {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 52)
                } else {
                    Text("DONE")
                        .font(.title3.bold())
                        .frame(maxWidth: .infinity, minHeight: 52)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isSaving || viewModel.startTime == nil)
            .padding(.horizontal)
        }
        .padding(.top)
    }

    private var tacticalBlock: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let ref = viewModel.tacticalStartTime ?? viewModel.startTime ?? timeline.date
            let sec = Int(timeline.date.timeIntervalSince(ref))
            Text(formatHMS(sec))
                .font(.system(.title2, design: .monospaced))
                .foregroundStyle(.secondary)
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
                Text(formatHMS(sec))
                    .font(.system(size: 44, weight: .medium, design: .rounded))
                    .monospacedDigit()
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
