'use client';

import React, { useEffect, useState, useRef } from 'react';

interface CountdownProps {
  endsAt: string;
  startsAt?: string;
}

function getTimeRemaining(endsAt: string) {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, totalMs: diff };
}

function getDayProgress(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
  return { current: Math.min(elapsedDays, totalDays), total: totalDays };
}

function getColor(totalMs: number): string {
  const sixHours = 6 * 60 * 60 * 1000;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  if (totalMs < sixHours) return 'var(--uv-danger)';
  if (totalMs < twentyFourHours) return 'var(--uv-status-pending)';
  return 'var(--uv-gold)';
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function Countdown({ endsAt, startsAt }: CountdownProps) {
  const [time, setTime] = useState(() => getTimeRemaining(endsAt));
  const [srText, setSrText] = useState('');
  const lastSrUpdate = useRef(0);

  useEffect(() => {
    const tick = () => {
      const t = getTimeRemaining(endsAt);
      setTime(t);

      // Update screen reader text every 60 seconds
      const now = Date.now();
      if (now - lastSrUpdate.current >= 60000) {
        lastSrUpdate.current = now;
        if (t.totalMs <= 0) {
          setSrText('Time is up');
        } else if (t.hours > 0) {
          setSrText(`${t.hours} hours, ${t.minutes} minutes remaining`);
        } else {
          setSrText(`${t.minutes} minutes, ${t.seconds} seconds remaining`);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const showDayFormat = startsAt && time.totalMs > 24 * 60 * 60 * 1000;
  const color = getColor(time.totalMs);

  let display: string;
  if (time.totalMs <= 0) {
    display = '00:00:00';
  } else if (showDayFormat) {
    const { current, total } = getDayProgress(startsAt!, endsAt);
    display = `Day ${current} of ${total}`;
  } else {
    display = `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  }

  return (
    <div
      style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 'clamp(36px, 8vw, 56px)',
        fontWeight: 400,
        color,
        lineHeight: 1.1,
        textAlign: 'center',
      }}
    >
      <span aria-hidden="true">{display}</span>
      <span
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {srText}
      </span>
    </div>
  );
}
