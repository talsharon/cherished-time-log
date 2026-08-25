import { BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIntervalChime } from '@/hooks/useIntervalChime';
import { cn } from '@/lib/utils';

function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function ChimeCountdown() {
  const { enabled, secondsRemaining, setEnabled } = useIntervalChime();

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'font-mono text-2xl md:text-3xl font-light tracking-tight tabular-nums transition-colors',
          enabled ? 'text-primary' : 'text-muted-foreground/40'
        )}
      >
        {enabled ? formatCountdown(secondsRemaining) : '0:00'}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEnabled(!enabled)}
        className={cn('h-9 w-9', enabled ? 'text-primary' : 'text-muted-foreground')}
        aria-label={enabled ? 'Pause interval chime' : 'Start interval chime'}
        title={enabled ? 'Pause interval chime' : 'Start interval chime'}
      >
        {enabled ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </Button>
    </div>
  );
}
