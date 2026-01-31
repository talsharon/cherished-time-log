interface Gap {
  startTime: Date;
  endTime: Date;
  duration: number;
}

interface GapItemProps {
  gap: Gap;
  onClick: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTimeRange(startTime: Date, endTime: Date): string {
  const startStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return `${startStr} - ${endStr}`;
}

export function GapItem({ gap, onClick }: GapItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-dashed border-muted-foreground/30 bg-secondary/30 p-4 text-left transition-colors active:bg-secondary/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-dashed border-muted-foreground/50 flex-shrink-0" />
            <span className="font-medium text-muted-foreground italic">
              What were you up to?
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatTimeRange(gap.startTime, gap.endTime)}
          </p>
        </div>
        <span className="font-mono text-lg font-medium text-muted-foreground">
          {formatDuration(gap.duration)}
        </span>
      </div>
    </button>
  );
}
