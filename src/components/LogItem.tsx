import { useState } from 'react';
import { Log } from '@/hooks/useLogs';
import { useTitlesContext } from '@/contexts/TitlesContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';

interface LogItemProps {
  log: Log;
  onEdit: (log: Log) => void;
  onDelete: (id: string) => Promise<void>;
}

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
  
  const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return `${startStr} - ${endStr}`;
}

export function LogItem({ log, onEdit, onDelete }: LogItemProps) {
  const { getColorForTitle } = useTitlesContext();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const titleColor = getColorForTitle(log.title);

  const handleTrashClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(log.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting log:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => onEdit(log)}
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
            <p className="mt-2 text-xs text-muted-foreground">{formatTimeRange(log.start_time, log.duration)}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="font-mono text-lg font-medium text-foreground">
              {formatDuration(log.duration)}
            </span>
            <button
              onClick={handleTrashClick}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </button>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
