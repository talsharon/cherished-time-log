import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Stopwatch, getElapsedSeconds } from '@/components/Stopwatch';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useLogs } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CREATE_NEW_VALUE = '__create_new__';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTimeRange(startTime: string, durationSeconds: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationSeconds * 1000);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  let dayPrefix = '';
  if (diffDays === 0) {
    dayPrefix = 'Today, ';
  } else if (diffDays === 1) {
    dayPrefix = 'Yesterday, ';
  } else {
    dayPrefix = start.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ';
  }
  
  return `${dayPrefix}${startStr} - ${endStr}`;
}

export function ClockTab() {
  const { 
    startTime, 
    currentTitle, 
    currentComment, 
    loading: sessionLoading, 
    resetSession,
    updateTitle,
    updateComment 
  } = useActiveSession();
  const { logs, createLog } = useLogs();
  const { titles, getColorForTitle, createTitle } = useTitles();
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isNewTitleDialogOpen, setIsNewTitleDialogOpen] = useState(false);
  const [animatingLogId, setAnimatingLogId] = useState<string | null>(null);
  const [previousLogId, setPreviousLogId] = useState<string | null>(null);

  const lastLog = logs[0];

  // Reset animation state after animation completes
  useEffect(() => {
    if (animatingLogId) {
      const timer = setTimeout(() => {
        setAnimatingLogId(null);
        setPreviousLogId(null);
      }, 600); // 300ms out + 300ms in
      return () => clearTimeout(timer);
    }
  }, [animatingLogId]);

  const handleTitleChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setIsNewTitleDialogOpen(true);
    } else {
      updateTitle(value);
    }
  };

  const handleCreateNewTitle = async () => {
    if (!newTitle.trim()) return;
    await createTitle(newTitle.trim());
    updateTitle(newTitle.trim());
    setNewTitle('');
    setIsNewTitleDialogOpen(false);
  };

  const handleDone = async () => {
    if (!startTime || isSaving) return;

    setIsSaving(true);
    try {
      // Store the current last log id for animation
      const currentLastLogId = lastLog?.id || null;
      setPreviousLogId(currentLastLogId);
      
      const duration = getElapsedSeconds(startTime);
      
      // Create the log entry with selected title and comment
      await createLog(startTime, duration, currentTitle, currentComment || undefined);
      
      // Trigger slide-in animation for new log
      // The new log will be at logs[0] after refetch
      setAnimatingLogId('new');
      
      // Reset the session (clears title and comment in DB)
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
      <div className="mb-8">
        <Stopwatch startTime={startTime} />
      </div>

      <div className="w-full space-y-4 mb-8">
        <div className="space-y-2">
          <Label className="text-base font-medium text-muted-foreground">What are you up to?</Label>
          <Select value={currentTitle} onValueChange={handleTitleChange}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select activity" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value={CREATE_NEW_VALUE}>
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3" />
                  Create new...
                </div>
              </SelectItem>
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
          value={currentComment}
          onChange={(e) => updateComment(e.target.value)}
          className="h-12"
        />
      </div>

      <Dialog open={isNewTitleDialogOpen} onOpenChange={setIsNewTitleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Title</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Enter title name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) {
                handleCreateNewTitle();
              }
            }}
            className="h-12"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTitleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewTitle} disabled={!newTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            'DONE'
          )}
        </Button>
        
        {/* Last logged event display */}
        <div className="mt-4 overflow-hidden">
          {lastLog && (
            <div
              className={`rounded-xl bg-secondary/50 p-4 ${
                animatingLogId ? 'animate-slide-in-right' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorForTitle(lastLog.title) }}
                    />
                    <span className="font-medium text-foreground truncate">{lastLog.title}</span>
                  </div>
                  {lastLog.comment && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{lastLog.comment}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{formatTimeRange(lastLog.start_time, lastLog.duration)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-mono text-lg font-medium text-foreground">
                    {formatDuration(lastLog.duration)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
