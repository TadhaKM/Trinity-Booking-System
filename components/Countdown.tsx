'use client';

import { useState, useEffect } from 'react';

interface Props {
  targetDate: Date | string;
  label?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export default function Countdown({ targetDate, label = 'Event starts in' }: Props) {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const isOver = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isOver) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <CountdownUnit value={timeLeft.days} unit="d" />
        )}
        <CountdownUnit value={timeLeft.hours} unit="h" />
        <CountdownUnit value={timeLeft.minutes} unit="m" />
        <CountdownUnit value={timeLeft.seconds} unit="s" />
      </div>
    </div>
  );
}

function CountdownUnit({ value, unit }: { value: number; unit: string }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <span className="text-xl font-bold text-[#0A2E6E] tabular-nums leading-none">
        {pad(value)}
      </span>
      <span className="text-[10px] text-gray-400 font-medium">{unit}</span>
    </div>
  );
}
