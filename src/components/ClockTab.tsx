import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stopwatch, getElapsedSeconds } from '@/components/Stopwatch';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useLogs } from '@/hooks/useLogs';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClockTab() {
  const { startTime, loading: sessionLoading, resetSession } = useActiveSession();
  const { createLog } = useLogs();
  const [isSaving, setIsSaving] = useState(false);

  const handleDone = async () => {
    if (!startTime || isSaving) return;

    setIsSaving(true);
    try {
      const duration = getElapsedSeconds(startTime);
      
      // Create the log entry with default "Idle" title
      await createLog(startTime, duration, 'Idle');
      
      // Reset the session to start a new timer
      await resetSession();
      
      toast.success('Activity logged!');
    } catch (error) {
      console.error('Error saving log:', error);
      toast.error('Failed to save activity');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="mb-16">
        <Stopwatch startTime={startTime} />
      </div>

      <Button
        onClick={handleDone}
        disabled={isSaving || !startTime}
        size="lg"
        className="h-20 w-20 rounded-full text-lg font-semibold shadow-lg shadow-primary/25 transition-transform active:scale-95"
      >
        {isSaving ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <Check className="h-8 w-8" />
        )}
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">Tap to log activity</p>
    </div>
  );
}
