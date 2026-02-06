import { useState, useEffect } from 'react';

interface TacticalStopwatchProps {
  startTime: Date | null;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function TacticalStopwatch({ startTime }: TacticalStopwatchProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      return Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    };

    setElapsed(calculateElapsed());
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="font-mono text-2xl font-light tracking-tight text-muted-foreground tabular-nums">
      {formatTime(elapsed)}
    </div>
  );
}
