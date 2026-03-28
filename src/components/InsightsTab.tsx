import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyInsights, WeeklyInsight } from '@/hooks/useWeeklyInsights';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 70%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 80%, 55%)',
  'hsl(280, 60%, 55%)',
  'hsl(0, 70%, 55%)',
  'hsl(180, 50%, 45%)',
];

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // Bold text with **
    const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    if (line.trim().startsWith('- ')) {
      elements.push(
        <li
          key={index}
          className="mr-4 text-sm text-muted-foreground text-right"
          dangerouslySetInnerHTML={{ __html: processedLine.replace('- ', '') }}
        />
      );
    } else if (line.trim().match(/^\d+\./)) {
      // Numbered list
      elements.push(
        <li
          key={index}
          className="ml-4 text-sm text-muted-foreground list-decimal"
          dangerouslySetInnerHTML={{ __html: processedLine.replace(/^\d+\.\s*/, '') }}
        />
      );
    } else if (line.trim()) {
      elements.push(
        <p
          key={index}
          className="text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    } else {
      elements.push(<div key={index} className="h-2" />);
    }
  });

  return elements;
}

interface InsightChartProps {
  graph: WeeklyInsight['graphs'][0];
}

function InsightChart({ graph }: InsightChartProps) {
  const { title, type, data } = graph;

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${formatDuration(value)}`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatDuration(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          ) : type === 'bar' ? (
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatDuration(v)} />
              <Tooltip
                formatter={(value: number) => formatDuration(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={data}>
              <XAxis dataKey={data[0]?.date ? 'date' : 'name'} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatDuration(v)} />
              <Tooltip
                formatter={(value: number) => formatDuration(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface InsightCardProps {
  insight: WeeklyInsight;
}

function InsightCard({ insight }: InsightCardProps) {
  const weekStart = parseISO(insight.week_start);
  const weekEnd = parseISO(insight.week_end);
  const dateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{dateRange}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold mb-1">Summary</h3>
          <p className="text-sm text-muted-foreground">{insight.summary}</p>
        </div>

        {/* Insights */}
        <div>
          <h3 className="text-sm font-semibold mb-1">Insights</h3>
          <div className="space-y-1">{renderMarkdown(insight.insights)}</div>
        </div>

        {/* Recommendations */}
        <div>
          <h3 className="text-sm font-semibold mb-1">Recommendations</h3>
          <div className="space-y-1">{renderMarkdown(insight.recommendations)}</div>
        </div>

        {/* Charts */}
        {insight.graphs && insight.graphs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Visualizations</h3>
            {insight.graphs.map((graph, index) => (
              <InsightChart key={index} graph={graph} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightsLoading() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyInsights() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="text-muted-foreground mb-4">
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium mb-2">No Insights Yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Generate your first weekly analysis by tapping the sparkles button on the Clock tab. Keep
        tracking your time to get personalized insights!
      </p>
    </div>
  );
}

export function InsightsTab() {
  const { data: insights, isLoading } = useWeeklyInsights();

  if (isLoading) {
    return <InsightsLoading />;
  }

  if (!insights || insights.length === 0) {
    return <EmptyInsights />;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </ScrollArea>
  );
}
