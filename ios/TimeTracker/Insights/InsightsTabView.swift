import Charts
import SwiftUI

struct InsightsTabView: View {
    @ObservedObject var viewModel: InsightsViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.loading {
                    insightsSkeleton
                } else if viewModel.insights.isEmpty {
                    insightsEmpty
                } else {
                    insightsList
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.background)
            .navigationTitle("Insights")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await viewModel.generate() }
                    } label: {
                        if viewModel.generating {
                            ProgressView()
                                .tint(AppTheme.accent)
                        } else {
                            Label("Generate", systemImage: "sparkles")
                                .labelStyle(.iconOnly)
                                .foregroundStyle(AppTheme.accent)
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
                        .foregroundStyle(AppTheme.destructive)
                        .padding()
                }
            }
        }
    }

    private var insightsSkeleton: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24) {
                ForEach(0 ..< 3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                        .fill(AppTheme.secondary.opacity(0.5))
                        .frame(height: 180)
                        .redacted(reason: .placeholder)
                }
            }
            .padding()
        }
        .background(AppTheme.background)
    }

    private var insightsEmpty: some View {
        VStack(spacing: 16) {
            Image(systemName: "chart.bar.doc.horizontal")
                .font(.system(size: 52))
                .foregroundStyle(AppTheme.textMuted.opacity(0.65))
            Text("No insights yet")
                .font(.title3.weight(.semibold))
                .foregroundStyle(AppTheme.foreground)
            Text("Use the sparkles button on the Clock tab to generate weekly insights.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.textMuted)
                .padding(.horizontal, 28)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                .foregroundStyle(AppTheme.textMuted)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("Summary")
                .font(.headline)
                .foregroundStyle(AppTheme.foreground)
            hebrewBlock(insight.summary)

            Text("Insights")
                .font(.headline)
                .foregroundStyle(AppTheme.foreground)
            hebrewBlock(insight.insights)

            Text("Recommendations")
                .font(.headline)
                .foregroundStyle(AppTheme.foreground)
            hebrewBlock(insight.recommendations)

            ForEach(Array(insight.graphs.enumerated()), id: \.offset) { _, graph in
                InsightChartView(graph: graph)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                .fill(AppTheme.secondary.opacity(0.35))
        )
        .overlay(
            RoundedRectangle(cornerRadius: AppTheme.radiusCard, style: .continuous)
                .stroke(AppTheme.border.opacity(0.85), lineWidth: 1)
        )
        .environment(\.layoutDirection, .rightToLeft)
    }

    private func hebrewBlock(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(AppTheme.textMuted)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct InsightChartView: View {
    let graph: InsightGraph

    private var accentPalette: [Color] {
        [
            AppTheme.accent,
            AppTheme.accent.opacity(0.75),
            AppTheme.accent.opacity(0.55),
            AppTheme.textMuted,
            AppTheme.secondary,
        ]
    }

    /// Mirrors web `formatDuration` in InsightsTab (hours floored, minutes rounded).
    private func formatInsightMinutes(_ minutes: Double) -> String {
        let hours = Int(minutes / 60)
        let mins = Int(minutes.truncatingRemainder(dividingBy: 60).rounded())
        if hours == 0 { return "\(mins)m" }
        if mins == 0 { return "\(hours)h" }
        return "\(hours)h \(mins)m"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(graph.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(AppTheme.foreground)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

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
            .foregroundStyle(accentPalette[i % accentPalette.count])
            .opacity(0.95)
            .annotation(position: .overlay) {
                VStack(spacing: 2) {
                    Text(p.name)
                        .font(.caption2.weight(.semibold))
                    Text(formatInsightMinutes(p.value))
                        .font(.caption2.weight(.medium))
                }
                .multilineTextAlignment(.center)
                .foregroundStyle(.white)
                .shadow(color: .black.opacity(0.55), radius: 0, x: 0, y: 1)
                .minimumScaleFactor(0.65)
            }
        }
    }

    private var barChart: some View {
        Chart(graph.data, id: \.name) { p in
            BarMark(
                x: .value("Name", p.name),
                y: .value("Minutes", p.value)
            )
            .foregroundStyle(AppTheme.accent.gradient)
        }
    }

    private var lineChart: some View {
        Chart(Array(graph.data.enumerated()), id: \.offset) { i, p in
            LineMark(
                x: .value("Index", i),
                y: .value("Minutes", p.value)
            )
            .foregroundStyle(AppTheme.accent)
            .lineStyle(StrokeStyle(lineWidth: 2))
            PointMark(
                x: .value("Index", i),
                y: .value("Minutes", p.value)
            )
            .foregroundStyle(AppTheme.accent)
        }
    }
}
