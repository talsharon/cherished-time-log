import { useState, useEffect } from 'react';
import { Log } from '@/hooks/useLogs';
import { useTitlesContext } from '@/contexts/TitlesContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';

interface LogDialogProps {
  mode: 'edit' | 'add';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // For edit mode
  log?: Log;
  onUpdate?: (id: string, updates: { title?: string; comment?: string; start_time?: string; duration?: number }) => Promise<void>;
  // For add mode
  date?: Date;
  onCreate?: (startTime: Date, duration: number, title: string, comment?: string) => Promise<void>;
  // For gap mode (pre-populated times)
  initialStartTime?: string;
  initialEndTime?: string;
}

function formatTimeForInput(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTimeInput(baseDate: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function getDefaultStartTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    return `${now.getHours().toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  return '09:00';
}

function getDefaultEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endHours = (hours + 1) % 24;
  return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function LogDialog({ mode, isOpen, onOpenChange, log, onUpdate, date, onCreate, initialStartTime, initialEndTime }: LogDialogProps) {
  const { titles, createTitle } = useTitlesContext();
  const [title, setTitle] = useState('Idle');
  const [comment, setComment] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize values based on mode
  useEffect(() => {
    if (!isOpen) return;
    
    if (mode === 'edit' && log) {
      setTitle(log.title);
      setComment(log.comment || '');
      const start = new Date(log.start_time);
      const end = new Date(start.getTime() + log.duration * 1000);
      setStartTime(formatTimeForInput(start));
      setEndTime(formatTimeForInput(end));
    } else if (mode === 'add' && date) {
      setTitle('Idle');
      setComment('');
      
      // Use provided times if available (gap mode), otherwise use defaults
      if (initialStartTime && initialEndTime) {
        setStartTime(initialStartTime);
        setEndTime(initialEndTime);
      } else {
        const defaultStart = getDefaultStartTime(date);
        setStartTime(defaultStart);
        setEndTime(getDefaultEndTime(defaultStart));
      }
    }
    
    setTimeError(null);
    setNewTitle('');
  }, [isOpen, mode, log, date, initialStartTime, initialEndTime]);

  const handleAddNewTitle = async () => {
    if (!newTitle.trim()) return;
    await createTitle(newTitle.trim());
    setTitle(newTitle.trim());
    setNewTitle('');
  };

  const handleSave = async () => {
    const baseDate = mode === 'edit' ? new Date(log!.start_time) : date!;
    const newStart = parseTimeInput(baseDate, startTime);
    const newEnd = parseTimeInput(baseDate, endTime);
    
    if (newEnd <= newStart) {
      setTimeError('End time must be after start time');
      return;
    }
    
    const duration = Math.floor((newEnd.getTime() - newStart.getTime()) / 1000);
    
    setIsSaving(true);
    try {
      // Create title if new
      if (!titles.find(t => t.name === title)) {
        await createTitle(title);
      }
      
      if (mode === 'edit' && onUpdate && log) {
        await onUpdate(log.id, {
          title,
          comment: comment || undefined,
          start_time: newStart.toISOString(),
          duration,
        });
      } else if (mode === 'add' && onCreate) {
        await onCreate(newStart, duration, title, comment || undefined);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Select value={title} onValueChange={setTitle}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select a title" />
              </SelectTrigger>
              <SelectContent>
                {titles.map((t) => (
                  <SelectItem key={t.id} value={t.name}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Input
                placeholder="Or add new title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-10"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddNewTitle}
                disabled={!newTitle.trim()}
                className="h-10 px-3"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Time</label>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimeError(null);
                }}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimeError(null);
                }}
                className="flex-1"
              />
            </div>
            {timeError && (
              <p className="text-sm text-destructive">{timeError}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Comment</label>
            <Textarea
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-12"
            >
              <Check className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
