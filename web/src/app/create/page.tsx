'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { VowInput } from './components/VowInput';
import { StakesStep } from './components/StakesStep';
import { IfBrokenSheet } from './components/IfBrokenSheet';

// Web flow: Step 1 (vow + deadline inline) → Step 3 (stakes) → seal
// Witness step skipped on web — user shares the link from /sent
type Step = 1 | 3 | 3.5;

export default function CreatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [vowText, setVowText] = useState('');
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [stakeAmount, setStakeAmount] = useState(50);
  const [destination, setDestination] = useState('ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>('charity');

  // Step 1 → Step 3 (skip witness on web)
  const handleVowNext = useCallback(() => {
    setStep(3);
  }, []);

  // Step 3 → open if-broken inline
  const handleIfBroken = useCallback(() => {
    setStep(3.5);
  }, []);

  // Step 3.5 → select destination
  const handleIfBrokenSelect = useCallback((dest: string, kind: 'charity' | 'anti') => {
    setDestination(dest);
    setDestinationKind(kind);
    setStep(3);
  }, []);

  const handleIfBrokenClose = useCallback(() => {
    setStep(3);
  }, []);

  // Step 3 "Seal my vow" — persist draft to Supabase and route to /seal
  const handleReview = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      try {
        sessionStorage.setItem('create-draft', JSON.stringify({
          vowText, endsAt: endsAt?.toISOString(),
          stakeAmount, destination, destinationKind,
        }));
      } catch {}
      router.push('/auth/callback?redirect=/create');
      return;
    }

    const { data, error } = await supabase
      .from('vows')
      .insert({
        user_id: session.user.id,
        raw_input: vowText,
        refined_text: vowText,
        status: 'draft',
        vow_type: 'self',
        witness_name: 'TBD',
        witness_phone: null,
        stake_amount: stakeAmount * 100,
        consequence: destinationKind,
        destination,
        ends_at: endsAt?.toISOString() || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create draft vow:', error);
      return;
    }

    router.push(`/seal?id=${data.id}`);
  }, [vowText, endsAt, stakeAmount, destination, destinationKind, router]);

  // Render based on current step
  if (step === 1) {
    return (
      <VowInput
        vowText={vowText}
        setVowText={setVowText}
        endsAt={endsAt}
        setEndsAt={setEndsAt}
        onNext={handleVowNext}
      />
    );
  }

  if (step === 3.5) {
    return (
      <IfBrokenSheet
        destination={destination}
        destinationKind={destinationKind}
        onSelect={handleIfBrokenSelect}
        onClose={handleIfBrokenClose}
      />
    );
  }

  // Step 3
  return (
    <StakesStep
      stakeAmount={stakeAmount}
      setStakeAmount={setStakeAmount}
      destination={destination}
      destinationKind={destinationKind}
      onIfBroken={handleIfBroken}
      onNext={handleReview}
      onBack={() => setStep(1)}
      vowText={vowText}
      witnessName="TBD"
      endsAt={endsAt}
    />
  );
}
