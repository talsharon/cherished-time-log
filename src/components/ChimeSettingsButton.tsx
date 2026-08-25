import { useEffect, useState } from 'react';
import { BellRing, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  useIntervalChime,
  clampChimeMinutes,
  CHIME_MIN_MINUTES,
  CHIME_MAX_MINUTES,
} from '@/hooks/useIntervalChime';
import { cn } from '@/lib/utils';

export function ChimeSettingsButton() {
  const { enabled, intervalMinutes, setEnabled, setIntervalMinutes, playChime } = useIntervalChime();
  const [draft, setDraft] = useState(String(intervalMinutes));

  useEffect(() => {
    setDraft(String(intervalMinutes));
  }, [intervalMinutes]);

  const commitDraft = (value: string) => {
    const parsed = Number(value);
    const next = Number.isFinite(parsed) && value.trim() !== '' ? clampChimeMinutes(parsed) : intervalMinutes;
    setIntervalMinutes(next);
    setDraft(String(next));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9', enabled ? 'text-primary' : 'text-muted-foreground')}
          aria-label="Interval chime settings"
        >
          <BellRing className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Interval chime</p>
          <p className="text-xs text-muted-foreground">Plays a chime on this device only.</p>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="chime-active" className="text-sm">
            Active
          </Label>
          <Switch id="chime-active" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chime-interval" className="text-sm">
            Every
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="Decrease interval"
              disabled={intervalMinutes <= CHIME_MIN_MINUTES}
              onClick={() => setIntervalMinutes(intervalMinutes - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              id="chime-interval"
              type="number"
              inputMode="numeric"
              min={CHIME_MIN_MINUTES}
              max={CHIME_MAX_MINUTES}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => commitDraft(e.target.value)}
              className="h-10 bg-background text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              aria-label="Increase interval"
              disabled={intervalMinutes >= CHIME_MAX_MINUTES}
              onClick={() => setIntervalMinutes(intervalMinutes + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            minutes ({CHIME_MIN_MINUTES}–{CHIME_MAX_MINUTES})
          </p>
        </div>

        <Button type="button" variant="secondary" className="w-full" onClick={playChime}>
          Test sound
        </Button>
      </PopoverContent>
    </Popover>
  );
}
