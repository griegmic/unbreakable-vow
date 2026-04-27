'use client';

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarMenuTrigger, ChoicePill } from '@/components/primitives';
import { IfBrokenSheet } from '@/app/create/components/IfBrokenSheet';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { inferDeadline } from '@/lib/vow-logic';

/**
 * Quick Vow
 *
 * One-screen fast path with the visual contract from quick-vow-clickable-flow:
 * promise, verdict, stake, witness, destination, then /seal?quick=1.
 */

type DeadlineId = 'eow' | 'tomorrow' | '7days' | '30days' | 'custom';
type JudgeMode = 'share' | 'self';

const STAKE_OPTIONS = [10, 50, 100];
const DEFAULT_VOW = '';

const DEADLINE_PRESETS: { id: DeadlineId; label: string }[] = [
  { id: 'eow', label: 'Sunday night' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '7days', label: '1 week' },
  { id: '30days', label: '30 days' },
  { id: 'custom', label: 'Pick date' },
];

function getEndOfWeek(): Date {
  const d = new Date();
  const diff = 7 - d.getDay();
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  d.setHours(21, 0, 0, 0);
  return d;
}

function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(21, 0, 0, 0);
  return d;
}

function getOneWeek(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 0, 0);
  return d;
}

function getThirtyDays(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  d.setHours(23, 59, 0, 0);
  return d;
}

function getDateForPreset(id: DeadlineId): Date {
  switch (id) {
    case 'eow':
      return getEndOfWeek();
    case 'tomorrow':
      return getTomorrow();
    case '30days':
      return getThirtyDays();
    case 'custom':
    case '7days':
    default:
      return getOneWeek();
  }
}

function formatVerdictLabel(date: Date, selectedDeadline: DeadlineId): string {
  if (selectedDeadline === 'eow') return 'Sunday night';
  if (selectedDeadline === 'tomorrow') return 'Tomorrow night';
  if (selectedDeadline === '7days') return 'In 1 week';
  if (selectedDeadline === '30days') return 'In 30 days';
  if (date.getDay() === 0) return 'Sunday night';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getStakeNote(amount: number): string {
  if (amount <= 10) return 'Light enough to start. Real enough to count.';
  if (amount <= 25) return 'Enough to notice. Easy enough to choose.';
  if (amount <= 50) return 'Small enough to choose today. Real enough to remember tomorrow.';
  return 'Large enough to make the promise louder.';
}

export default function QuickVowPage() {
  const router = useRouter();
  const { isAuthenticated, session, displayName } = useAuth();
  const vowFlow = useVowFlow();

  const [vowText, setVowText] = useState(DEFAULT_VOW);
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineId>('eow');
  const [customDate, setCustomDate] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [judgeMode, setJudgeMode] = useState<JudgeMode>('share');
  const [stakeAmount, setStakeAmount] = useState(50);
  const [customStake, setCustomStake] = useState('');
  const [destination, setDestination] = useState('ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>('charity');
  const [expandedPill, setExpandedPill] = useState<'deadline' | 'witness' | 'stake' | null>(null);
  const [showIfBroken, setShowIfBroken] = useState(false);

  const vowInputRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const deadlineDate = useMemo(() => {
    if (selectedDeadline === 'custom' && customDate) {
      return new Date(`${customDate}T23:59:00`);
    }
    return getDateForPreset(selectedDeadline);
  }, [selectedDeadline, customDate]);

  const inferredDeadline = useMemo(() => {
    if (!vowText.trim()) return null;
    return inferDeadline(vowText);
  }, [vowText]);

  const effectiveDeadline = inferredDeadline || deadlineDate;
  const verdictLabel = formatVerdictLabel(effectiveDeadline, inferredDeadline ? 'custom' : selectedDeadline);
  const canContinue = vowText.trim().length >= 3;
  const userEmail = session?.user?.email ?? null;
  const vowDensity = vowText.trim().length > 78
    ? 'long'
    : vowText.trim().length > 44
      ? 'medium'
      : 'short';
  const witnessTitle = judgeMode === 'self'
    ? 'Judge it myself'
    : witnessName.trim()
      ? witnessName.trim()
      : 'Share judge link';
  const witnessSubtitle = judgeMode === 'self'
    ? 'No witness, just your word.'
    : witnessName.trim()
      ? 'They get the judge link after sealing.'
      : 'Send it after sealing.';
  const witnessMark = judgeMode === 'self'
    ? '✓'
    : witnessName.trim()
      ? witnessName.trim().charAt(0).toUpperCase()
      : '+';

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const max = new Date(now.getTime() + 90 * 86400000);
    return {
      minDate: now.toISOString().split('T')[0],
      maxDate: max.toISOString().split('T')[0],
    };
  }, []);

  useLayoutEffect(() => {
    const el = vowInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    el.scrollTop = 0;
  }, [vowText, vowDensity]);

  const handleSeal = () => {
    if (!canContinue) {
      vowInputRef.current?.focus();
      return;
    }

    const trimmedVow = vowText.trim();
    vowFlow.setRawInput(trimmedVow);
    vowFlow.setRefinedText(trimmedVow);
    vowFlow.setDeadline(effectiveDeadline.toISOString());

    try {
      localStorage.removeItem('auth-return-path');
      sessionStorage.removeItem('auth-return-path');
      document.cookie = 'auth_return_path=; path=/; max-age=0';
    } catch {}

    if (judgeMode === 'self') {
      vowFlow.setWitnessType('self');
      vowFlow.setWitnessName('Just me');
      vowFlow.setWitnessPhone('');
    } else {
      vowFlow.setWitnessType('friend');
      vowFlow.setWitnessName(witnessName.trim() || 'Your witness');
      vowFlow.setWitnessPhone('');
    }

    vowFlow.setStake({
      amount: stakeAmount,
      consequence: destinationKind,
      destination,
    });

    router.push('/seal?quick=1');
  };

  const handleContinue = () => {
    if (!canContinue) {
      vowInputRef.current?.focus();
      return;
    }

    handleSeal();
  };

  const handleDeadlineClick = (id: DeadlineId) => {
    if (id === 'custom') {
      setSelectedDeadline('custom');
      setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
      return;
    }
    setSelectedDeadline(id);
  };

  const handleStakeSelect = (amount: number) => {
    setStakeAmount(amount);
    setCustomStake('');
  };

  const handleCustomStakeApply = () => {
    const amount = Math.round(Number(customStake));
    if (!Number.isFinite(amount) || amount < 1) return;
    setStakeAmount(Math.min(amount, 10000));
    setExpandedPill(null);
  };

  const acceptWitnessChoice = () => {
    setJudgeMode('share');
    setExpandedPill(null);
  };

  return (
    <>
      <style>{`
        .qv-page {
          min-height: 100dvh;
          padding: max(10px, env(safe-area-inset-top, 0px)) 10px max(10px, env(safe-area-inset-bottom, 0px));
          background:
            linear-gradient(180deg, #26221c 0%, #1a1713 38%, #0f0e0c 100%);
          color: #f0e8d8;
        }

        .qv-shell {
          width: 100%;
          max-width: 393px;
          min-height: calc(100dvh - 20px);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 32px 36px 28px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 34px;
          background:
            radial-gradient(ellipse 360px 210px at 50% -50px, rgba(184, 138, 53, 0.10), transparent 70%),
            #100e0b;
          box-shadow: 0 34px 90px rgba(0, 0, 0, 0.50);
        }

        .qv-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 34px;
        }

        .qv-brand {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          font-family: var(--uv-font-serif);
          font-size: 25px;
          line-height: 1;
          font-weight: 430;
          color: #f0e8d8;
        }

        .qv-brand em {
          color: #e7c674;
          font-style: italic;
          font-weight: 400;
        }

        .qv-mark {
          width: 56px;
          height: 56px;
          border: 1px solid #b88a35;
          transform: rotate(45deg);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .qv-mark::after {
          content: "";
          width: 14px;
          height: 14px;
          background: #e7c674;
        }

        .qv-avatar > div > button {
          width: 68px !important;
          height: 68px !important;
        }

        .qv-avatar > div > button > div {
          width: 68px !important;
          height: 68px !important;
          border-color: rgba(240, 232, 216, 0.10) !important;
          background: rgba(240, 232, 216, 0.026) !important;
          color: #e7c674 !important;
          font-family: var(--uv-font-sans) !important;
          font-size: 26px !important;
          font-weight: 650 !important;
        }

        .qv-kicker {
          color: #e7c674;
          font-family: var(--uv-font-sans);
          font-size: 19px;
          line-height: 1;
          font-weight: 680;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .qv-title {
          margin: 0 0 28px;
          color: #f0e8d8;
          font-family: var(--uv-font-serif);
          font-size: 56px;
          line-height: 1.02;
          font-weight: 430;
          letter-spacing: 0;
        }

        .qv-title em {
          color: #e7c674;
          font-style: italic;
          font-weight: 400;
        }

        .qv-card {
          border-radius: 30px;
          border: 1px solid rgba(240, 232, 216, 0.105);
          background: linear-gradient(180deg, rgba(240, 232, 216, 0.050), rgba(240, 232, 216, 0.020));
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.28);
        }

        .qv-label {
          color: #6f6556;
          font-family: var(--uv-font-sans);
          font-size: 18px;
          line-height: 1;
          font-weight: 680;
          letter-spacing: 0.27em;
          text-transform: uppercase;
        }

        .qv-vow-card {
          padding: 32px 32px 28px;
          margin-bottom: 18px;
        }

        .qv-vow-input {
          width: 100%;
          min-height: 124px;
          max-height: 184px;
          display: block;
          resize: none;
          overflow: hidden;
          border: none;
          outline: none;
          background: transparent;
          color: #f0e8d8;
          font-family: var(--uv-font-sans);
          font-size: 50px;
          line-height: 1.08;
          font-weight: 680;
          letter-spacing: 0;
          padding: 36px 0 24px;
        }

        .qv-vow-input[data-density="medium"] {
          min-height: 112px;
          font-size: 40px;
          line-height: 1.08;
          padding-top: 24px;
        }

        .qv-vow-input[data-density="long"] {
          min-height: 148px;
          font-size: 31px;
          line-height: 1.12;
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .qv-vow-input::placeholder {
          color: rgba(240, 232, 216, 0.43);
          opacity: 1;
        }

        .qv-rule {
          height: 1px;
          background: rgba(184, 138, 53, 0.25);
          margin-bottom: 22px;
        }

        .qv-inline-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #9a8f7d;
          font-family: var(--uv-font-sans);
          font-size: 25px;
          line-height: 1.2;
          font-weight: 450;
        }

        .qv-deadline-button,
        .qv-receipt-button,
        .qv-help-button {
          appearance: none;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        .qv-inline-meta strong {
          color: #f0e8d8;
          font-weight: 680;
          text-align: right;
        }

        .qv-consequence {
          border-radius: 30px;
          border: 1px solid rgba(184, 138, 53, 0.27);
          background:
            linear-gradient(180deg, rgba(184, 138, 53, 0.088), rgba(240, 232, 216, 0.022));
          padding: 30px 26px 26px;
          margin-bottom: 18px;
        }

        .qv-money-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 28px;
        }

        .qv-money {
          color: #e7c674;
          font-family: var(--uv-font-serif);
          font-size: 82px;
          line-height: 0.9;
          font-weight: 430;
          text-shadow: 0 12px 30px rgba(184, 138, 53, 0.11);
        }

        .qv-money-note {
          max-width: 280px;
          text-align: right;
          color: #9a8f7d;
          font-family: var(--uv-font-serif);
          font-size: 22px;
          line-height: 1.25;
          font-weight: 400;
          font-style: italic;
        }

        .qv-amounts {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .qv-amount {
          height: 74px;
          border-radius: 18px;
          border: 1px solid rgba(240, 232, 216, 0.072);
          background: rgba(0, 0, 0, 0.10);
          color: #9a8f7d;
          display: grid;
          place-items: center;
          font-family: var(--uv-font-sans);
          font-size: 30px;
          line-height: 1;
          font-weight: 700;
          cursor: pointer;
          transition: transform 100ms ease, border-color 120ms ease, background 120ms ease;
        }

        .qv-amount[data-active="true"] {
          color: #e7c674;
          border-color: rgba(231, 198, 116, 0.54);
          background: linear-gradient(180deg, rgba(231, 198, 116, 0.18), rgba(184, 138, 53, 0.088));
        }

        .qv-amount:active,
        .qv-witness:active,
        .qv-primary:active {
          transform: scale(0.98);
        }

        .qv-witness {
          min-height: 112px;
          width: 100%;
          border-radius: 24px;
          border: 1px solid rgba(184, 138, 53, 0.20);
          background: rgba(240, 232, 216, 0.024);
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0 26px;
          margin-bottom: 18px;
          cursor: pointer;
          text-align: left;
          transition: transform 100ms ease, border-color 120ms ease;
        }

        .qv-bubble {
          width: 62px;
          height: 62px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(184, 138, 53, 0.12);
          color: #e7c674;
          border: 1px solid rgba(184, 138, 53, 0.18);
          font-family: var(--uv-font-sans);
          font-size: 31px;
          line-height: 1;
          font-weight: 700;
          flex: 0 0 auto;
        }

        .qv-witness-title {
          display: block;
          color: #f0e8d8;
          font-family: var(--uv-font-sans);
          font-size: 29px;
          line-height: 1.12;
          font-weight: 720;
        }

        .qv-witness-sub {
          display: block;
          color: #6f6556;
          font-family: var(--uv-font-sans);
          font-size: 23px;
          line-height: 1.25;
          font-weight: 500;
          margin-top: 8px;
        }

        .qv-receipt-button {
          width: 100%;
          color: #c9beaa;
          text-align: center;
          font-family: var(--uv-font-sans);
          font-size: 25px;
          line-height: 1.35;
          font-weight: 480;
          margin-bottom: 8px;
        }

        .qv-receipt-button strong {
          color: #f0e8d8;
          font-weight: 720;
        }

        .qv-spacer {
          flex: 1;
          min-height: 34px;
        }

        .qv-primary {
          width: 100%;
          min-height: 104px;
          border-radius: 999px;
          border: none;
          color: #171209;
          background: linear-gradient(180deg, #eac46e, #cfa047 62%, #a77a2e);
          font-family: var(--uv-font-sans);
          font-size: 31px;
          line-height: 1;
          font-weight: 760;
          box-shadow: 0 1px 0 rgba(255, 244, 210, 0.34) inset, 0 20px 42px rgba(184, 138, 53, 0.18);
          cursor: pointer;
          transition: transform 100ms ease, opacity 120ms ease;
        }

        .qv-primary:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .qv-help-button {
          width: 100%;
          color: #6f6556;
          text-align: center;
          font-family: var(--uv-font-sans);
          font-size: 21px;
          line-height: 1;
          font-weight: 700;
          margin-top: 28px;
          padding: 6px 0;
        }

        .qv-sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: rgba(0, 0, 0, 0.58);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 10px;
        }

        .qv-sheet {
          width: 100%;
          max-width: 440px;
          border-radius: 24px 24px 0 0;
          background: var(--uv-bg-elevated);
          border: 1px solid var(--uv-border-soft);
          padding: 18px 20px max(22px, env(safe-area-inset-bottom));
          box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.45);
        }

        .qv-sheet-title {
          margin: 0 0 6px;
          color: var(--uv-text);
          font-family: var(--uv-font-serif);
          font-size: 24px;
          line-height: 1.1;
          font-weight: 500;
        }

        .qv-sheet-copy {
          margin: 0 0 14px;
          color: var(--uv-text-muted);
          font-family: var(--uv-font-sans);
          font-size: 14px;
          line-height: 1.4;
        }

        .qv-sheet-input {
          width: 100%;
          box-sizing: border-box;
          background: var(--uv-bg-input);
          border: 1px solid var(--uv-border-strong);
          border-radius: 14px;
          padding: 14px 16px;
          font-family: var(--uv-font-sans);
          font-size: 16px;
          color: var(--uv-text);
          outline: none;
          margin-bottom: 10px;
        }

        .qv-sheet-action {
          width: 100%;
          min-height: 52px;
          border-radius: 14px;
          border: 1px solid var(--uv-border-soft);
          background: rgba(240, 232, 216, 0.026);
          color: var(--uv-text);
          font-family: var(--uv-font-sans);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          text-align: left;
          padding: 12px 14px;
          margin-bottom: 10px;
        }

        .qv-sheet-action[data-primary="true"] {
          border: none;
          background: var(--uv-gold);
          color: var(--uv-text-on-gold);
          text-align: center;
        }

        .qv-sheet-action[data-active="true"] {
          border-color: var(--uv-gold);
          background: rgba(200, 155, 60, 0.12);
          color: var(--uv-gold-bright);
        }

        .qv-sheet-action-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .qv-sheet-stake {
          min-height: 56px;
          border-radius: 14px;
          border: 1px solid var(--uv-border-soft);
          background: rgba(240, 232, 216, 0.026);
          color: var(--uv-text-muted);
          font-family: var(--uv-font-sans);
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
        }

        .qv-sheet-stake[data-active="true"] {
          border-color: var(--uv-gold);
          background: rgba(200, 155, 60, 0.12);
          color: var(--uv-gold-bright);
        }

        .qv-sheet-hint {
          display: block;
          margin-top: 3px;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--uv-text-dim);
        }

        .qv-sheet-notice {
          margin: -2px 0 10px;
          color: var(--uv-text-muted);
          font-size: 12.5px;
          line-height: 1.35;
        }

        @media (min-width: 0px) {
          .qv-page {
            padding: max(8px, env(safe-area-inset-top, 0px)) 8px max(8px, env(safe-area-inset-bottom, 0px));
          }

          .qv-shell {
            padding: 18px 20px 16px;
            border-radius: 28px;
            min-height: calc(100dvh - 16px);
          }

          .qv-topbar { margin-bottom: 18px; }
          .qv-brand { gap: 10px; font-size: 15px; }
          .qv-mark { width: 22px; height: 22px; }
          .qv-mark::after { width: 6px; height: 6px; }
          .qv-avatar > div > button { width: 44px !important; height: 44px !important; }
          .qv-avatar > div > button > div { width: 38px !important; height: 38px !important; font-size: 14px !important; }
          .qv-kicker { font-size: 10px; margin-bottom: 9px; }
          .qv-title { font-size: 31px; margin-bottom: 14px; }
          .qv-vow-card { padding: 16px 17px 13px; margin-bottom: 10px; border-radius: 18px; }
          .qv-label { font-size: 9.5px; }
          .qv-vow-input { min-height: 76px; font-size: 28px; padding: 9px 0 11px; }
          .qv-vow-input[data-density="medium"] { min-height: 88px; font-size: 23px; line-height: 1.1; padding: 8px 0 10px; }
          .qv-vow-input[data-density="long"] { min-height: 106px; font-size: 20px; line-height: 1.12; padding: 7px 0 9px; }
          .qv-rule { margin-bottom: 10px; }
          .qv-inline-meta { font-size: 13px; }
          .qv-consequence { padding: 15px 14px 13px; margin-bottom: 9px; border-radius: 20px; }
          .qv-money-row { margin-bottom: 12px; }
          .qv-money { font-size: 47px; }
          .qv-money-note { max-width: 158px; font-size: 13px; }
          .qv-amounts { gap: 8px; }
          .qv-amount { height: 42px; border-radius: 12px; font-size: 15px; }
          .qv-witness { min-height: 62px; border-radius: 17px; gap: 12px; padding: 0 14px; margin-bottom: 8px; }
          .qv-bubble { width: 34px; height: 34px; font-size: 17px; }
          .qv-witness-title { font-size: 15.5px; }
          .qv-witness-sub { font-size: 12.5px; margin-top: 4px; }
          .qv-receipt-button { font-size: 14px; margin-bottom: 8px; }
          .qv-spacer { min-height: 8px; }
          .qv-primary { min-height: 58px; font-size: 17px; }
          .qv-help-button { font-size: 12.5px; margin-top: 12px; }
        }

        @media (max-width: 360px), (max-height: 760px) {
          .qv-shell { padding-top: 14px; padding-bottom: 12px; }
          .qv-topbar { margin-bottom: 10px; }
          .qv-title { font-size: 28px; margin-bottom: 10px; }
          .qv-vow-card { padding: 14px 16px 12px; }
          .qv-vow-input { min-height: 58px; font-size: 24px; padding: 7px 0 9px; }
          .qv-vow-input[data-density="medium"] { min-height: 78px; font-size: 21px; }
          .qv-vow-input[data-density="long"] { min-height: 100px; font-size: 18px; line-height: 1.12; }
          .qv-consequence { padding: 12px; }
          .qv-money { font-size: 40px; }
          .qv-money-note { font-size: 12px; max-width: 136px; }
          .qv-amount { height: 38px; }
          .qv-witness { min-height: 58px; }
          .qv-help-button { margin-top: 9px; }
        }
      `}</style>

      <main className="qv-page">
        <section className="qv-shell" aria-label="Seal a vow">
          <div className="qv-topbar">
            <div className="qv-brand" aria-label="Unbreakable Vow">
              <span className="qv-mark" aria-hidden="true" />
              <span>Unbreakable <em>Vow</em></span>
            </div>
            <div className="qv-avatar">
              <AvatarMenuTrigger
                displayName={isAuthenticated ? displayName : 'J'}
                email={isAuthenticated ? userEmail : null}
              />
            </div>
          </div>

          <div className="qv-kicker">Seal a vow</div>
          <h1 className="qv-title">One promise.<br /><em>Real consequence.</em></h1>

          <div className="qv-card qv-vow-card">
            <label className="qv-label" htmlFor="quick-vow-text">I vow to</label>
            <textarea
              id="quick-vow-text"
              ref={vowInputRef}
              className="qv-vow-input"
              data-density={vowDensity}
              value={vowText}
              onChange={(e) => setVowText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleContinue();
              }}
              rows={2}
              placeholder="Write your vow"
            />
            <div className="qv-rule" />
            <button
              type="button"
              className="qv-deadline-button qv-inline-meta"
              onClick={() => setExpandedPill('deadline')}
              aria-label={`Change verdict date, currently ${verdictLabel}`}
            >
              <span>Verdict</span>
              <strong>{verdictLabel}</strong>
            </button>
          </div>

          <div className="qv-consequence">
            <div className="qv-money-row">
              <div>
                <div className="qv-label" style={{ marginBottom: 16 }}>On the line</div>
                <div className="qv-money">${stakeAmount}</div>
              </div>
              <div className="qv-money-note">{getStakeNote(stakeAmount)}</div>
            </div>
            <div className="qv-amounts" role="group" aria-label="Stake amount">
              {STAKE_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="qv-amount"
                  data-active={stakeAmount === amount}
                  aria-pressed={stakeAmount === amount}
                  onClick={() => handleStakeSelect(amount)}
                >
                  ${amount}
                </button>
              ))}
              <button
                type="button"
                className="qv-amount"
                data-active={!STAKE_OPTIONS.includes(stakeAmount)}
                aria-pressed={!STAKE_OPTIONS.includes(stakeAmount)}
                onClick={() => {
                  setCustomStake(String(stakeAmount));
                  setExpandedPill('stake');
                }}
              >
                Other
              </button>
            </div>
          </div>

          <button
            type="button"
            className="qv-witness"
            onClick={() => setExpandedPill('witness')}
          >
            <span className="qv-bubble" aria-hidden="true">{witnessMark}</span>
            <span style={{ minWidth: 0 }}>
              <span className="qv-witness-title">{witnessTitle}</span>
              <span className="qv-witness-sub">{witnessSubtitle}</span>
            </span>
          </button>

          <button
            type="button"
            className="qv-receipt-button"
            onClick={() => setShowIfBroken(true)}
          >
            If broken, <strong>${stakeAmount}</strong> goes to <strong>{destination}</strong>.
          </button>

          <div className="qv-spacer" />

          <button
            type="button"
            className="qv-primary"
            onClick={handleContinue}
            disabled={!canContinue}
          >
            Continue
          </button>
          <button
            type="button"
            className="qv-help-button"
            onClick={() => router.push('/?guided=1')}
          >
            Need help? Guided setup
          </button>
        </section>
      </main>

      {expandedPill && (
        <div
          className="qv-sheet-backdrop"
          onClick={() => setExpandedPill(null)}
        >
          <div
            className="qv-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {expandedPill === 'deadline' ? (
              <>
                <h2 className="qv-sheet-title">When is verdict day?</h2>
                <p className="qv-sheet-copy">Pick the moment your witness decides if this promise held.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DEADLINE_PRESETS.map((preset) => (
                    <ChoicePill
                      key={preset.id}
                      label={preset.label}
                      active={selectedDeadline === preset.id}
                      onPress={() => {
                        handleDeadlineClick(preset.id);
                        if (preset.id !== 'custom') setExpandedPill(null);
                      }}
                    />
                  ))}
                </div>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSelectedDeadline('custom');
                    setExpandedPill(null);
                  }}
                  min={minDate}
                  max={maxDate}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                  tabIndex={-1}
                />
              </>
            ) : expandedPill === 'stake' ? (
              <>
                <h2 className="qv-sheet-title">Set the stake.</h2>
                <p className="qv-sheet-copy">Choose the amount that makes the vow real without making it reckless.</p>
                <div className="qv-sheet-action-row">
                  {STAKE_OPTIONS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="qv-sheet-stake"
                      data-active={stakeAmount === amount}
                      onClick={() => {
                        handleStakeSelect(amount);
                        setExpandedPill(null);
                      }}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <input
                  className="qv-sheet-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10000}
                  value={customStake}
                  onChange={(e) => setCustomStake(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCustomStakeApply();
                  }}
                  placeholder="Other amount"
                  autoFocus
                />
                <button
                  type="button"
                  className="qv-sheet-action"
                  data-primary="true"
                  onClick={handleCustomStakeApply}
                >
                  Use ${customStake || stakeAmount}
                </button>
              </>
            ) : (
              <>
                <h2 className="qv-sheet-title">Who judges?</h2>
                <p className="qv-sheet-copy">Fast path: seal first, then share the judge link. Add a name only if you already know.</p>
                <input
                  className="qv-sheet-input"
                  type="text"
                  value={witnessName}
                  onChange={(e) => {
                    setWitnessName(e.target.value);
                    setJudgeMode('share');
                  }}
                  placeholder="Optional: first name"
                />
                <button
                  type="button"
                  className="qv-sheet-action"
                  data-primary="true"
                  onClick={acceptWitnessChoice}
                >
                  Done
                </button>
                <button
                  type="button"
                  className="qv-sheet-action"
                  data-active={judgeMode === 'share' && !witnessName.trim()}
                  onClick={() => {
                    setWitnessName('');
                    setJudgeMode('share');
                    setExpandedPill(null);
                  }}
                >
                  Share judge link after sealing
                  <span className="qv-sheet-hint">No witness details needed right now.</span>
                </button>
                <button
                  type="button"
                  className="qv-sheet-action"
                  data-active={judgeMode === 'self'}
                  onClick={() => {
                    setWitnessName('');
                    setJudgeMode('self');
                    setExpandedPill(null);
                  }}
                >
                  Judge it myself
                  <span className="qv-sheet-hint">No witness, just your word.</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showIfBroken && (
        <div
          onClick={() => setShowIfBroken(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 10,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '90dvh', overflow: 'auto' }}>
            <IfBrokenSheet
              destination={destination}
              destinationKind={destinationKind}
              onSelect={(dest, kind) => {
                setDestination(dest);
                setDestinationKind(kind);
                setShowIfBroken(false);
              }}
              onClose={() => setShowIfBroken(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
