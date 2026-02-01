import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Stopwatch, getElapsedSeconds } from '@/components/Stopwatch';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useLogs } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { useGenerateInsights } from '@/hooks/useWeeklyInsights';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Sparkles } from 'lucide-react';
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
    updateComment,
    updateStartTime
  } = useActiveSession();
  const { logs, createLog, updateLog } = useLogs();
  const { titles, getColorForTitle, createTitle } = useTitles();
  const { mutate: generateInsights, isPending: isGenerating } = useGenerateInsights();
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [isNewTitleDialogOpen, setIsNewTitleDialogOpen] = useState(false);
  const [isCommentFocused, setIsCommentFocused] = useState(false);
  const [isStartTimeDialogOpen, setIsStartTimeDialogOpen] = useState(false);
  const [editingStartTimeStr, setEditingStartTimeStr] = useState('');
  const [completedLog, setCompletedLog] = useState<{
    title: string;
    comment: string | null;
    duration: number;
    start_time: string;
  } | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'pop-in' | 'slide-out' | null>(null);

  // Animation sequence orchestration
  useEffect(() => {
    if (animationPhase === 'pop-in') {
      const timer = setTimeout(() => {
        setAnimationPhase('slide-out');
      }, 800); // 300ms pop-in + 500ms visible delay
      return () => clearTimeout(timer);
    }
    
    if (animationPhase === 'slide-out') {
      const timer = setTimeout(() => {
        setCompletedLog(null);
        setAnimationPhase(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [animationPhase]);

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

  const handleStartTimeClick = () => {
    if (!startTime) return;
    setEditingStartTimeStr(
      `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
    );
    setIsStartTimeDialogOpen(true);
  };

  const handleSaveStartTime = async () => {
    if (!startTime || !editingStartTimeStr) return;
    
    const [hours, minutes] = editingStartTimeStr.split(':').map(Number);
    const newStartTime = new Date(startTime);
    newStartTime.setHours(hours, minutes, 0, 0);
    
    if (newStartTime > new Date()) {
      toast.error('Start time cannot be in the future');
      return;
    }
    
    // Find the most recent log (logs are ordered by start_time descending)
    const lastLog = logs[0];
    
    if (lastLog) {
      const lastLogStart = new Date(lastLog.start_time);
      
      // Only update if the new start time is after the log's start time
      if (newStartTime > lastLogStart) {
        // Calculate new duration: difference between log start and new session start
        const newDuration = Math.floor((newStartTime.getTime() - lastLogStart.getTime()) / 1000);
        
        await updateLog(lastLog.id, { duration: newDuration });
      }
    }
    
    await updateStartTime(newStartTime);
    setIsStartTimeDialogOpen(false);
    toast.success('Start time updated');
  };

  const handleDone = async () => {
    if (!startTime || isSaving) return;

    setIsSaving(true);
    try {
      const duration = getElapsedSeconds(startTime);
      
      // Store log data for animation display
      const logData = {
        title: currentTitle,
        comment: currentComment || null,
        duration,
        start_time: startTime.toISOString(),
      };
      
      // Create the log entry with selected title and comment
      await createLog(startTime, duration, currentTitle, currentComment || undefined);
      
      // Start animation sequence
      setCompletedLog(logData);
      setAnimationPhase('pop-in');
      
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
    <div className="flex flex-1 flex-col items-center justify-center px-6 relative">
      {/* Generate Insights Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => generateInsights()}
        disabled={isGenerating}
        className="absolute top-4 right-0 h-9 w-9 text-muted-foreground hover:text-primary"
        title="Generate weekly insights"
      >
        {isGenerating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </Button>

      <div className="mb-8">
        <Stopwatch startTime={startTime} onStartTimeClick={handleStartTimeClick} />
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
          onFocus={() => setIsCommentFocused(true)}
          onBlur={() => setIsCommentFocused(false)}
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

      <Dialog open={isStartTimeDialogOpen} onOpenChange={setIsStartTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Start Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={editingStartTimeStr}
              onChange={(e) => setEditingStartTimeStr(e.target.value)}
              className="h-12"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartTimeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStartTime} disabled={!editingStartTimeStr}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full">
        <Button
          onClick={handleDone}
          disabled={isSaving || !startTime || isCommentFocused}
          size="lg"
          className="w-full h-16 rounded-xl text-lg font-semibold shadow-lg shadow-primary/25 transition-transform active:scale-95"
        >
          {isSaving ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            'DONE'
          )}
        </Button>
        
        {/* Animated completed log card */}
        {completedLog && (
          <div className="mt-4 overflow-hidden">
            <div
              className={`rounded-xl bg-secondary/50 p-4 ${
                animationPhase === 'pop-in' ? 'animate-pop-in' : ''
              } ${animationPhase === 'slide-out' ? 'animate-slide-out-right' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorForTitle(completedLog.title) }}
                    />
                    <span className="font-medium text-foreground truncate">{completedLog.title}</span>
                  </div>
                  {completedLog.comment && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{completedLog.comment}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{formatTimeRange(completedLog.start_time, completedLog.duration)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-mono text-lg font-medium text-foreground">
                    {formatDuration(completedLog.duration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
