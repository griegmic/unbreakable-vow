'use client';

import {
  WaxSeal, FrauncesH1, FrauncesSub, GoldCTA, OutlinedGoldCTA,
  EyebrowTag, DeliveredPill, TimestampPill, VowDocCard, RitualCard,
  RitualScreen, StakeTile, RadioCard, Countdown, StreakGrid, Stamp,
  ContactPicker, DatePickerSheet, ChangeStakeSheet, DismissDraftSheet,
} from '@/components/primitives';
import { useState } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: 'var(--uv-font-sans)',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.15em',
        color: 'var(--uv-gold)',
        textTransform: 'uppercase',
        marginBottom: 16,
        borderBottom: '1px solid var(--uv-border)',
        paddingBottom: 8,
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 11, color: 'var(--uv-text-dim)', display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </div>
  );
}

export default function PrimitivesPage() {
  const [selectedStake, setSelectedStake] = useState(50);
  const [selectedRadio, setSelectedRadio] = useState(0);

  const sampleDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--uv-bg)',
      padding: '40px 24px',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      <h1 style={{
        fontFamily: 'var(--uv-font-serif)',
        fontSize: 28,
        fontStyle: 'italic',
        fontWeight: 500,
        color: 'var(--uv-text)',
        marginBottom: 40,
      }}>
        V6 Primitives
      </h1>

      <Section title="WaxSeal">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Row label="sm"><WaxSeal size="sm" /></Row>
          <Row label="md"><WaxSeal size="md" /></Row>
          <Row label="lg (default)"><WaxSeal size="lg" /></Row>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Row label="no halo"><WaxSeal size="md" showHalo={false} /></Row>
          <Row label="with check"><WaxSeal size="md" showCheck /></Row>
          <Row label="check + halo"><WaxSeal size="lg" showCheck showHalo /></Row>
        </div>
      </Section>

      <Section title="FrauncesH1">
        <Row label="xl (default)"><FrauncesH1>Sealed.</FrauncesH1></Row>
        <Row label="xl italic"><FrauncesH1 italic>Over to Nick.</FrauncesH1></Row>
        <Row label="lg"><FrauncesH1 size="lg">Your vow needs a witness.</FrauncesH1></Row>
        <Row label="lg italic"><FrauncesH1 size="lg" italic>Make a vow. Mean it.</FrauncesH1></Row>
      </Section>

      <Section title="FrauncesSub">
        <Row label="default"><FrauncesSub>He doesn&apos;t know yet.</FrauncesSub></Row>
        <Row label="dim"><FrauncesSub dim>Your testimony is recorded.</FrauncesSub></Row>
      </Section>

      <Section title="GoldCTA">
        <Row label="filled-gold"><GoldCTA label="Make my vow →" onPress={() => {}} /></Row>
        <Row label="filled-imsg-green"><GoldCTA label="Tell Nick →" onPress={() => {}} variant="filled-imsg-green" /></Row>
        <Row label="disabled"><GoldCTA label="Lock in $50  Pay" onPress={() => {}} disabled /></Row>
      </Section>

      <Section title="OutlinedGoldCTA">
        <Row label="default"><OutlinedGoldCTA label="See your vow →" onPress={() => {}} /></Row>
      </Section>

      <Section title="EyebrowTag">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <EyebrowTag tone="gold">UNBREAKABLE VOW</EyebrowTag>
          <EyebrowTag tone="imsg">DELIVERED</EyebrowTag>
          <EyebrowTag tone="amber">AWAITING VERDICT</EyebrowTag>
          <EyebrowTag tone="muted">VOIDED</EyebrowTag>
        </div>
      </Section>

      <Section title="DeliveredPill + TimestampPill">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <DeliveredPill timestamp={new Date()} />
          <TimestampPill timestamp={new Date()} />
          <TimestampPill timestamp={new Date()} format="datetime" />
        </div>
      </Section>

      <Section title="VowDocCard">
        <Row label="default">
          <VowDocCard vow="Go to the gym 4x this week" stake={50} destination="ALS Association" verdictDate={sampleDate} />
        </Row>
        <Row label="compact">
          <VowDocCard vow="Run 5K every morning" stake={25} destination="NRA" verdictDate={sampleDate} compact />
        </Row>
      </Section>

      <Section title="RitualCard">
        <Row label="default">
          <RitualCard><span style={{ color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>Card content</span></RitualCard>
        </Row>
        <Row label="compact + gold pulse">
          <RitualCard compact pulseColor="gold"><span style={{ color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 14 }}>Active vow content</span></RitualCard>
        </Row>
      </Section>

      <Section title="StakeTile">
        <div style={{ display: 'flex', gap: 8 }}>
          {[10, 25, 50, 100].map((amt) => (
            <StakeTile
              key={amt}
              amount={amt}
              label={amt === 10 ? 'a nudge' : amt === 25 ? 'a week' : amt === 50 ? "you'll remember" : "won't break it"}
              selected={selectedStake === amt}
              onPress={() => setSelectedStake(amt)}
            />
          ))}
        </div>
      </Section>

      <Section title="RadioCard">
        {['ALS Association', 'St. Jude', 'Feeding America'].map((org, i) => (
          <RadioCard
            key={org}
            label={org}
            sublabel="Funds research and support"
            selected={selectedRadio === i}
            onPress={() => setSelectedRadio(i)}
          />
        ))}
      </Section>

      <Section title="Countdown">
        <Countdown endsAt={sampleDate} />
      </Section>

      <Section title="StreakGrid">
        <StreakGrid total={7} completed={[1, 2, 3]} today={4} />
      </Section>

      <Section title="Stamp">
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Row label="KEPT gold"><Stamp text="KEPT" tone="gold" /></Row>
          <Row label="BROKEN muted-red"><Stamp text="BROKEN" tone="muted-red" /></Row>
          <Row label="VOIDED muted-gray"><Stamp text="VOIDED" tone="muted-gray" /></Row>
          <Row label="KEPT filled-gold"><Stamp text="KEPT" tone="filled-gold" /></Row>
          <Row label="auto-resolved"><Stamp text="KEPT" tone="gold" variant="auto-resolved" /></Row>
        </div>
      </Section>

      <Section title="ContactPicker">
        <ContactPicker onSelect={(c) => alert(`Selected: ${c.name} ${c.phone}`)} label="Pick your witness" />
      </Section>

      <SheetDemos />
    </div>
  );
}

function SheetDemos() {
  const [showDate, setShowDate] = useState(false);
  const [showStake, setShowStake] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);
  const now = new Date();
  const min = new Date(now.getTime() + 86400000);
  const max = new Date(now.getTime() + 90 * 86400000);

  return (
    <>
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: 'var(--uv-font-sans)', fontSize: 13, fontWeight: 600, letterSpacing: '0.15em', color: 'var(--uv-gold)', textTransform: 'uppercase', marginBottom: 16, borderBottom: '1px solid var(--uv-border)', paddingBottom: 8 }}>
          SHEETS (tap to open)
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowDate(true)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-card)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, cursor: 'pointer' }}>DatePicker</button>
          <button onClick={() => setShowStake(true)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-card)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, cursor: 'pointer' }}>ChangeStake</button>
          <button onClick={() => setShowDismiss(true)} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--uv-border)', background: 'var(--uv-bg-card)', color: 'var(--uv-text)', fontFamily: 'var(--uv-font-sans)', fontSize: 13, cursor: 'pointer' }}>DismissDraft</button>
        </div>
      </div>

      {showDate && <DatePickerSheet value={min} min={min} max={max} onConfirm={() => setShowDate(false)} onDismiss={() => setShowDate(false)} />}
      {showStake && <ChangeStakeSheet currentValue={50} onConfirm={() => setShowStake(false)} onDismiss={() => setShowStake(false)} />}
      {showDismiss && <DismissDraftSheet onSaveAndExit={() => setShowDismiss(false)} onStay={() => setShowDismiss(false)} />}
    </>
  );
}
