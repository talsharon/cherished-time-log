import Charts
import SwiftUI

struct InsightsTabView: View {
    @ObservedObject var viewModel: InsightsViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.loading {
                    ProgressView()
                } else if viewModel.insights.isEmpty {
                    ContentUnavailableView(
                        "No insights yet",
                        systemImage: "chart.bar.doc.horizontal",
                        description: Text("Use the sparkles button on the Clock tab to generate weekly insights.")
                    )
                } else {
                    insightsList
                }
            }
            .navigationTitle("Insights")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await viewModel.generate() }
                    } label: {
                        if viewModel.generating {
                            ProgressView()
                        } else {
                            Label("Generate", systemImage: "sparkles")
                        }
                    }
                    .disabled(viewModel.generating)
                }
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
            .overlay {
                if let err = viewModel.errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding()
                }
            }
        }
    }

    private var insightsList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                ForEach(viewModel.insights) { insight in
                    insightCard(insight)
                }
            }
            .padding()
        }
    }

    private func insightCard(_ insight: WeeklyInsightRow) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(insight.weekStart) → \(insight.weekEnd)")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text("Summary")
                .font(.headline)
            hebrewBlock(insight.summary)

            Text("Insights")
                .font(.headline)
            hebrewBlock(insight.insights)

            Text("Recommendations")
                .font(.headline)
            hebrewBlock(insight.recommendations)

            ForEach(Array(insight.graphs.enumerated()), id: \.offset) { _, graph in
                InsightChartView(graph: graph)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemBackground)))
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func hebrewBlock(_ text: String) -> some View {
        Text(text)
            .font(.body)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: .infinity, alignment: .trailing)
    }
}

private struct InsightChartView: View {
    let graph: InsightGraph

    private let colors: [Color] = [
        .blue, .orange, .green, .purple, .pink, .yellow, .red, .cyan,
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(graph.title)
                .font(.subheadline.weight(.semibold))
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: .infinity, alignment: .trailing)

            Group {
                switch graph.type.lowercased() {
                case "pie":
                    pieChart
                case "line":
                    lineChart
                default:
                    barChart
                }
            }
            .frame(height: 220)
        }
    }

    private var pieChart: some View {
        Chart(Array(graph.data.enumerated()), id: \.offset) { i, p in
            SectorMark(
                angle: .value("Minutes", p.value),
                innerRadius: .ratio(0.45),
                angularInset: 1
            )
            .foregroundStyle(colors[i % colors.count])
            .opacity(0.9)
        }
    }

    private var barChart: some View {
        Chart(graph.data, id: \.name) { p in
            BarMark(
                x: .value("Name", p.name),
                y: .value("Minutes", p.value)
            )
            .foregroundStyle(.blue.gradient)
        }
    }

    private var lineChart: some View {
        Chart(Array(graph.data.enumerated()), id: \.offset) { i, p in
            LineMark(
                x: .value("Index", i),
                y: .value("Minutes", p.value)
            )
            PointMark(
                x: .value("Index", i),
                y: .value("Minutes", p.value)
            )
        }
    }
}
