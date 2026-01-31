import { useState } from 'react';
import { Log } from '@/hooks/useLogs';
import { useTitles } from '@/hooks/useTitles';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';

interface LogItemProps {
  log: Log;
  onUpdate: (id: string, updates: { title?: string; comment?: string }) => Promise<void>;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function LogItem({ log, onUpdate }: LogItemProps) {
  const { titles, getColorForTitle, createTitle } = useTitles();
  const [isOpen, setIsOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(log.title);
  const [editComment, setEditComment] = useState(log.comment || '');
  const [newTitle, setNewTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const titleColor = getColorForTitle(log.title);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If it's a new title, create it first
      if (editTitle !== log.title && !titles.find(t => t.name === editTitle)) {
        await createTitle(editTitle);
      }
      
      await onUpdate(log.id, {
        title: editTitle,
        comment: editComment || undefined,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewTitle = async () => {
    if (!newTitle.trim()) return;
    await createTitle(newTitle.trim());
    setEditTitle(newTitle.trim());
    setNewTitle('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl bg-secondary/50 p-4 text-left transition-colors active:bg-secondary"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: titleColor }}
              />
              <span className="font-medium text-foreground truncate">{log.title}</span>
            </div>
            {log.comment && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{log.comment}</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(log.start_time)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="font-mono text-lg font-medium text-foreground">
              {formatDuration(log.duration)}
            </span>
          </div>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Select value={editTitle} onValueChange={setEditTitle}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a title" />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((title) => (
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
              <label className="text-sm font-medium">Comment</label>
              <Textarea
                placeholder="Add a comment..."
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
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
    </>
  );
}
