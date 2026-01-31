import { useState, useMemo } from 'react';
import { useLogs, Log } from '@/hooks/useLogs';
import { useTitlesContext } from '@/contexts/TitlesContext';
import { LogItem } from '@/components/LogItem';
import { GapItem } from '@/components/GapItem';
import { LogDialog } from '@/components/LogDialog';
import { Loader2, Clock, Plus } from 'lucide-react';

interface Gap {
  startTime: Date;
  endTime: Date;
  duration: number;
}

function isGap(item: Log | Gap): item is Gap {
  return 'startTime' in item && item.startTime instanceof Date;
}

function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

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

interface DaySection {
  dateKey: string;
  dateLabel: string;
  logs: Log[];
  date: Date;
}

function generateDaySections(logs: Log[]): DaySection[] {
  if (logs.length === 0) return [];
  
  const sections: DaySection[] = [];
  const logsByDate = groupLogsByDate(logs);
  
  // Find the date range (earliest log to today)
  const sortedDates = Array.from(logsByDate.keys()).sort();
  const earliestDateKey = sortedDates[0];
  const [ey, em, ed] = earliestDateKey.split('-').map(Number);
  const earliestDate = new Date(ey, em, ed);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Iterate from today backwards to earliest date
  const current = new Date(today);
  
  while (current >= earliestDate) {
    const dateKey = getDateKey(current.toISOString());
    const dayLogs = logsByDate.get(dateKey) || [];
    
    sections.push({
      dateKey,
      dateLabel: getSectionTitle(current.toISOString()),
      logs: dayLogs,
      date: new Date(current),
    });
    
    current.setDate(current.getDate() - 1);
  }
  
  return sections;
}

function getLogsWithGaps(
  dayLogs: Log[], 
  allLogs: Log[], 
  dateKey: string, 
  minGapMinutes: number = 1
): (Log | Gap)[] {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month, day, 0, 0, 0, 0);
  const dayEnd = new Date(year, month, day, 23, 59, 59, 999);
  
  // Find overnight log from previous day extending into this day
  const overnightLog = allLogs.find(log => {
    const logStart = new Date(log.start_time);
    const logEnd = new Date(logStart.getTime() + log.duration * 1000);
    const logDateKey = getDateKey(log.start_time);
    
    return logDateKey !== dateKey && 
           logStart < dayStart && 
           logEnd > dayStart;
  });
  
  // Effective day start (after overnight log ends, if any)
  let effectiveDayStart = dayStart;
  if (overnightLog) {
    const overnightEnd = new Date(
      new Date(overnightLog.start_time).getTime() + overnightLog.duration * 1000
    );
    if (overnightEnd > dayStart) {
      effectiveDayStart = overnightEnd;
    }
  }
  
  // If no logs for this day, return single full-day gap
  if (dayLogs.length === 0) {
    return [{
      startTime: effectiveDayStart,
      endTime: dayEnd,
      duration: Math.floor((dayEnd.getTime() - effectiveDayStart.getTime()) / 1000),
    }];
  }
  
  const items: (Log | Gap)[] = [];
  
  // Sort by start_time descending (most recent first)
  const sorted = [...dayLogs].sort((a, b) => 
    new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );
  
  // Process gaps between consecutive logs
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    items.push(current);
    
    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      const currentStart = new Date(current.start_time);
      const nextEnd = new Date(new Date(next.start_time).getTime() + next.duration * 1000);
      
      const gapMs = currentStart.getTime() - nextEnd.getTime();
      const gapMinutes = gapMs / (1000 * 60);
      
      if (gapMinutes >= minGapMinutes) {
        items.push({
          startTime: nextEnd,
          endTime: currentStart,
          duration: Math.floor(gapMs / 1000),
        });
      }
    }
  }
  
  // Check for gap at the start of day (before first log)
  const earliestLog = sorted[sorted.length - 1];
  const earliestLogStart = new Date(earliestLog.start_time);
  
  const startGapMs = earliestLogStart.getTime() - effectiveDayStart.getTime();
  const startGapMinutes = startGapMs / (1000 * 60);
  
  if (startGapMinutes >= minGapMinutes) {
    items.push({
      startTime: effectiveDayStart,
      endTime: earliestLogStart,
      duration: Math.floor(startGapMs / 1000),
    });
  }
  
  return items;
}

export function LogsTab() {
  const { logs, loading, updateLog, deleteLog, createLog } = useLogs();
  const { loading: titlesLoading } = useTitlesContext();
  
  const [dialogMode, setDialogMode] = useState<'edit' | 'add' | null>(null);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [gapStartTime, setGapStartTime] = useState<string | undefined>(undefined);
  const [gapEndTime, setGapEndTime] = useState<string | undefined>(undefined);

  const daySections = useMemo(() => generateDaySections(logs), [logs]);

  const handleEditClick = (log: Log) => {
    setSelectedLog(log);
    setDialogMode('edit');
  };

  const handleAddClick = (dateFromSection: Date) => {
    setSelectedDate(dateFromSection);
    setGapStartTime(undefined);
    setGapEndTime(undefined);
    setDialogMode('add');
  };

  const handleGapClick = (gap: Gap) => {
    setSelectedDate(gap.startTime);
    setGapStartTime(formatTimeForInput(gap.startTime));
    setGapEndTime(formatTimeForInput(gap.endTime));
    setDialogMode('add');
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedLog(null);
    setSelectedDate(null);
    setGapStartTime(undefined);
    setGapEndTime(undefined);
  };

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
        {daySections.map((section) => (
          <div key={section.dateKey}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {section.dateLabel}
              </h3>
              <button
                onClick={() => handleAddClick(section.date)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {getLogsWithGaps(section.logs, logs, section.dateKey).map((item) => (
                isGap(item) ? (
                  <GapItem
                    key={`gap-${item.startTime.getTime()}`}
                    gap={item}
                    onClick={() => handleGapClick(item)}
                  />
                ) : (
                  <LogItem
                    key={item.id}
                    log={item}
                    onEdit={handleEditClick}
                    onDelete={deleteLog}
                  />
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      <LogDialog
        mode={dialogMode === 'edit' ? 'edit' : 'add'}
        isOpen={dialogMode !== null}
        onOpenChange={(open) => !open && handleCloseDialog()}
        log={selectedLog ?? undefined}
        date={selectedDate ?? undefined}
        onUpdate={updateLog}
        onCreate={createLog}
        initialStartTime={gapStartTime}
        initialEndTime={gapEndTime}
      />
    </div>
  );
}
