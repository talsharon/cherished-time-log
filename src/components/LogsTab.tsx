import { useLogs } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { LogItem } from '@/components/LogItem';
import { Loader2, Clock } from 'lucide-react';

export function LogsTab() {
  const { logs, loading, updateLog } = useLogs();
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
      <div className="space-y-3">
        {logs.map((log) => (
          <LogItem key={log.id} log={log} onUpdate={updateLog} />
        ))}
      </div>
    </div>
  );
}
