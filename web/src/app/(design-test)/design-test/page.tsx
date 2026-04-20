'use client';

import { useState } from 'react';
import { PrimaryButton } from '@/components/uv/PrimaryButton';
import { SecondaryButton } from '@/components/uv/SecondaryButton';
import { TextButton } from '@/components/uv/TextButton';
import { IconButton } from '@/components/uv/IconButton';
import { Input } from '@/components/uv/Input';
import { Textarea } from '@/components/uv/Textarea';
import { RadioCard } from '@/components/uv/RadioCard';
import { CheckboxRow } from '@/components/uv/CheckboxRow';
import { OathCheckbox } from '@/components/uv/OathCheckbox';
import { AmountPill } from '@/components/uv/AmountPill';
import { StatusPill } from '@/components/uv/StatusPill';
import { Chip } from '@/components/uv/Chip';
import { VowDisplay } from '@/components/uv/VowDisplay';
import { GoldSealBadge } from '@/components/uv/GoldSealBadge';
import { BrokenSealBadge } from '@/components/uv/BrokenSealBadge';
import { VoidedSealBadge } from '@/components/uv/VoidedSealBadge';
import { Countdown } from '@/components/uv/Countdown';
import { Card } from '@/components/uv/Card';
import { Section } from '@/components/uv/Section';
import { BottomSheet } from '@/components/uv/BottomSheet';
import { Modal } from '@/components/uv/Modal';
import { Toast } from '@/components/uv/Toast';
import { SkeletonRow } from '@/components/uv/SkeletonRow';
import { RitualScreen } from '@/components/uv/RitualScreen';

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '1.5px',
        textTransform: 'uppercase' as const,
        color: 'var(--uv-text-faint)',
        marginBottom: 16,
      }}>{title}</h2>
      {children}
    </div>
  );
}

export default function DesignTestPage() {
  const [inputVal, setInputVal] = useState('');
  const [textareaVal, setTextareaVal] = useState('');
  const [selectedRadio, setSelectedRadio] = useState(0);
  const [checked, setChecked] = useState(false);
  const [oathChecked, setOathChecked] = useState(false);
  const [selectedPill, setSelectedPill] = useState(2);
  const [selectedChip, setSelectedChip] = useState(-1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <RitualScreen>
      <div style={{ padding: '24px 20px 40px', maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <h1 style={{
          fontFamily: 'var(--uv-font-serif)',
          fontSize: 32,
          fontWeight: 400,
          color: 'var(--uv-gold)',
          marginBottom: 8,
        }}>UV Design Testbed</h1>
        <p style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 13,
          color: 'var(--uv-text-dim)',
          marginBottom: 48,
        }}>All 24 components in every state. Dev-only route.</p>

        {/* Buttons */}
        <SectionBlock title="Buttons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PrimaryButton onClick={() => {}}>Primary — Make your vow</PrimaryButton>
            <PrimaryButton onClick={() => {}} disabled>Primary — Disabled</PrimaryButton>
            <PrimaryButton onClick={() => {}} loading>Primary — Loading</PrimaryButton>
            <SecondaryButton onClick={() => {}}>Secondary — Dare a friend</SecondaryButton>
            <TextButton onClick={() => {}}>Text — Change ›</TextButton>
            <div style={{ display: 'flex', gap: 8 }}>
              <IconButton onClick={() => {}} ariaLabel="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 18l-6-6 6-6"/></svg>
              </IconButton>
              <IconButton onClick={() => {}} ariaLabel="Share">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              </IconButton>
            </div>
          </div>
        </SectionBlock>

        {/* Inputs */}
        <SectionBlock title="Form Inputs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input value={inputVal} onChange={setInputVal} placeholder="Run every morning this week" />
            <Input value="Gym 3x this week" onChange={() => {}} active />
            <Input value="" onChange={() => {}} error="Too short. Add the details." placeholder="..." />
            <Textarea value={textareaVal} onChange={setTextareaVal} placeholder="Add a taunt (optional)" />
          </div>
        </SectionBlock>

        {/* Radio Cards */}
        <SectionBlock title="Radio Cards">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['End of this week', 'Tomorrow', '7 days', '30 days'].map((label, i) => (
              <RadioCard key={i} label={label} selected={selectedRadio === i} onClick={() => setSelectedRadio(i)} />
            ))}
            <RadioCard label="Pick a date" special onClick={() => {}} />
          </div>
        </SectionBlock>

        {/* Checkboxes */}
        <SectionBlock title="Checkboxes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <CheckboxRow checked={checked} onChange={setChecked} label="I agree to the terms" />
            <OathCheckbox checked={oathChecked} onChange={setOathChecked} label="I solemnly swear. I'm reporting this honestly." />
          </div>
        </SectionBlock>

        {/* Amount Pills */}
        <SectionBlock title="Amount Pills">
          <div style={{ display: 'flex', gap: 6 }}>
            {['$10', '$25', '$50', '$100'].map((amt, i) => (
              <AmountPill key={i} amount={amt} selected={selectedPill === i} onClick={() => setSelectedPill(i)} />
            ))}
          </div>
        </SectionBlock>

        {/* Status Pills */}
        <SectionBlock title="Status Pills">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <StatusPill variant="active">Active</StatusPill>
            <StatusPill variant="pending">Pending</StatusPill>
            <StatusPill variant="verdict">Verdict</StatusPill>
            <StatusPill variant="kept">Kept</StatusPill>
            <StatusPill variant="broken">Broken</StatusPill>
            <StatusPill variant="voided">Voided</StatusPill>
          </div>
        </SectionBlock>

        {/* Chips */}
        <SectionBlock title="Chips">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Gym 3x this week', 'No alcohol', 'Call mom weekly'].map((label, i) => (
              <Chip key={i} label={label} selected={selectedChip === i} onClick={() => setSelectedChip(i)} />
            ))}
            <Chip label="Ship side project by Friday" suggestion onClick={() => {}} />
          </div>
        </SectionBlock>

        {/* Vow Display */}
        <SectionBlock title="Vow Display">
          <VowDisplay text="Run every morning this week" size="lg" />
          <div style={{ marginTop: 16 }}>
            <VowDisplay text="No texting my ex for 30 days" size="md" />
          </div>
          <div style={{ marginTop: 16 }}>
            <VowDisplay text="Delete TikTok for a week" size="sm" />
          </div>
        </SectionBlock>

        {/* Seal Badges */}
        <SectionBlock title="Seal Badges">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <GoldSealBadge animate />
            <BrokenSealBadge />
            <VoidedSealBadge />
          </div>
        </SectionBlock>

        {/* Countdown */}
        <SectionBlock title="Countdown">
          <Countdown endsAt={futureDate} />
        </SectionBlock>

        {/* Cards */}
        <SectionBlock title="Cards">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>Default card content</Card>
            <Card variant="elevated">Elevated card content</Card>
            <Card variant="warn">Warning card content</Card>
          </div>
        </SectionBlock>

        {/* Section Labels */}
        <SectionBlock title="Section Component">
          <Section label="ACTIVE VOWS">
            <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-muted)' }}>Content under a section label.</p>
          </Section>
        </SectionBlock>

        {/* Skeleton */}
        <SectionBlock title="Skeleton Loading">
          <SkeletonRow count={3} />
        </SectionBlock>

        {/* Overlays */}
        <SectionBlock title="Overlays">
          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryButton onClick={() => setSheetOpen(true)}>Open Bottom Sheet</PrimaryButton>
            <PrimaryButton onClick={() => setModalOpen(true)}>Open Modal</PrimaryButton>
            <PrimaryButton onClick={() => setShowToast(true)}>Show Toast</PrimaryButton>
          </div>
        </SectionBlock>

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
          <div style={{ padding: '8px 0' }}>
            <h3 style={{ fontFamily: 'var(--uv-font-serif)', fontSize: 22, color: 'var(--uv-text)', marginBottom: 8 }}>By when?</h3>
            <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, color: 'var(--uv-text-dim)' }}>Deadline for judgment.</p>
          </div>
        </BottomSheet>

        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Void this vow?">
          <p style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 15, color: 'var(--uv-text-muted)', lineHeight: 1.55, marginBottom: 16 }}>
            Nothing has been charged. We will cancel the payment hold.
          </p>
          <PrimaryButton onClick={() => setModalOpen(false)}>Confirm</PrimaryButton>
        </Modal>

        {showToast && (
          <Toast message="Link copied" variant="success" onDismiss={() => setShowToast(false)} />
        )}
      </div>
    </RitualScreen>
  );
}
