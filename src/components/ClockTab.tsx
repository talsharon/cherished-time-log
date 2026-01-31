import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stopwatch, getElapsedSeconds } from '@/components/Stopwatch';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useLogs } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClockTab() {
  const { startTime, loading: sessionLoading, resetSession } = useActiveSession();
  const { createLog } = useLogs();
  const { titles, getColorForTitle } = useTitles();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('Idle');
  const [comment, setComment] = useState('');

  const handleDone = async () => {
    if (!startTime || isSaving) return;

    setIsSaving(true);
    try {
      const duration = getElapsedSeconds(startTime);
      
      // Create the log entry with selected title and comment
      await createLog(startTime, duration, selectedTitle, comment || undefined);
      
      // Reset the session and form
      await resetSession();
      setSelectedTitle('Idle');
      setComment('');
      
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
      <div className="mb-8">
        <Stopwatch startTime={startTime} />
      </div>

      <div className="w-full space-y-4 mb-8">
        <div className="space-y-2">
          <Label className="text-base font-medium text-muted-foreground">What are you up to?</Label>
          <Select value={selectedTitle} onValueChange={setSelectedTitle}>
            <SelectTrigger className="h-12 bg-secondary/50">
              <SelectValue placeholder="Select activity" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Idle">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getColorForTitle('Idle') }}
                  />
                  Idle
                </div>
              </SelectItem>
              {titles.filter(t => t.name !== 'Idle').map((title) => (
                <SelectItem key={title.id} value={title.name}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: title.color }}
                    />
                    {title.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="h-12 bg-secondary/50"
        />
      </div>

      <div className="w-full">
        <Button
          onClick={handleDone}
          disabled={isSaving || !startTime}
          size="lg"
          className="w-full h-16 rounded-xl text-lg font-semibold shadow-lg shadow-primary/25 transition-transform active:scale-95"
        >
          {isSaving ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Check className="h-8 w-8" />
          )}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">Tap to log activity</p>
      </div>
    </div>
  );
}
