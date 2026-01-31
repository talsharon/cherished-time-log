import { useLogs, Log } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { LogItem } from '@/components/LogItem';
import { Loader2, Clock } from 'lucide-react';

function getSectionTitle(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.floor((nowStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLogsByDate(logs: Log[]): Map<string, Log[]> {
  const groups = new Map<string, Log[]>();
  
  for (const log of logs) {
    const key = getDateKey(log.start_time);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(log);
  }
  
  return groups;
}

export function LogsTab() {
  const { logs, loading, updateLog, deleteLog } = useLogs();
  const { loading: titlesLoading } = useTitles();

  if (loading || titlesLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-medium text-foreground">No activities yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap "Done" on the Clock tab to log your first activity
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 py-4">
      <div className="space-y-6">
        {Array.from(groupLogsByDate(logs).entries()).map(([dateKey, dayLogs]) => (
          <div key={dateKey}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {getSectionTitle(dayLogs[0].start_time)}
            </h3>
            <div className="space-y-3">
              {dayLogs.map((log) => (
                <LogItem key={log.id} log={log} onUpdate={updateLog} onDelete={deleteLog} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
