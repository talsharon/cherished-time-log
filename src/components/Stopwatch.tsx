import { useState, useEffect } from 'react';

interface StopwatchProps {
  startTime: Date | null;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function Stopwatch({ startTime }: StopwatchProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const now = new Date();
      return Math.floor((now.getTime() - startTime.getTime()) / 1000);
    };

    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="font-mono text-7xl font-light tracking-tight text-foreground tabular-nums">
        {formatTime(elapsed)}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {startTime ? `Started ${startTime.toLocaleTimeString()}` : 'Not running'}
      </p>
    </div>
  );
}

export function getElapsedSeconds(startTime: Date): number {
  return Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
}
