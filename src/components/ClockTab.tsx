import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stopwatch, getElapsedSeconds } from '@/components/Stopwatch';
import { useActiveSession } from '@/hooks/useActiveSession';
import { useLogs } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CREATE_NEW_VALUE = '__create_new__';

export function ClockTab() {
  const { startTime, loading: sessionLoading, resetSession } = useActiveSession();
  const { createLog } = useLogs();
  const { titles, getColorForTitle, createTitle } = useTitles();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState('Idle');
  const [comment, setComment] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isNewTitleDialogOpen, setIsNewTitleDialogOpen] = useState(false);

  const handleTitleChange = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setIsNewTitleDialogOpen(true);
    } else {
      setSelectedTitle(value);
    }
  };

  const handleCreateNewTitle = async () => {
    if (!newTitle.trim()) return;
    await createTitle(newTitle.trim());
    setSelectedTitle(newTitle.trim());
    setNewTitle('');
    setIsNewTitleDialogOpen(false);
  };

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
          <Select value={selectedTitle} onValueChange={handleTitleChange}>
            <SelectTrigger className="h-12 bg-secondary/50">
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
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="h-12 bg-secondary/50"
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
            <Check className="h-8 w-8" />
          )}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">Tap to log activity</p>
      </div>
    </div>
  );
}
