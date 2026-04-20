'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { inferDeadline } from '@/lib/vow-logic';
import { VowInput } from './components/VowInput';
import { ByWhenSheet } from './components/ByWhenSheet';
import { WitnessStep } from './components/WitnessStep';
import { StakesStep } from './components/StakesStep';
import { IfBrokenSheet } from './components/IfBrokenSheet';

type Step = 1 | 1.5 | 2 | 3 | 3.5;

export default function CreatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [vowText, setVowText] = useState('');
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [witnessName, setWitnessName] = useState('');
  const [witnessPhone, setWitnessPhone] = useState('');
  const [stakeAmount, setStakeAmount] = useState(50);
  const [destination, setDestination] = useState('ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>('charity');

  // Step 1 → next: either go to step 2 (deadline inferred) or step 1.5
  const handleVowNext = useCallback(() => {
    const deadline = inferDeadline(vowText);
    if (deadline) {
      setEndsAt(deadline);
      setStep(2);
    }
    // If no deadline inferred, the VowInput component calls onByWhen instead
  }, [vowText]);

  const handleByWhenOpen = useCallback(() => {
    setStep(1.5);
  }, []);

  const handleByWhenSelect = useCallback((date: Date) => {
    setEndsAt(date);
    setStep(2);
  }, []);

  const handleByWhenClose = useCallback(() => {
    setStep(1);
  }, []);

  // Step 2 → Step 3
  const handleWitnessNext = useCallback(() => {
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

  // Step 3 "Review →" — persist draft to Supabase and route to /seal
  const handleReview = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // If not authenticated, redirect to auth first
      // Store state in sessionStorage for recovery
      try {
        sessionStorage.setItem('create-draft', JSON.stringify({
          vowText, endsAt: endsAt?.toISOString(), witnessName, witnessPhone,
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
        witness_name: witnessName,
        witness_phone: witnessPhone || null,
        stake_amount: stakeAmount * 100, // convert to cents
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
  }, [vowText, endsAt, witnessName, witnessPhone, stakeAmount, destination, destinationKind, router]);

  // Render based on current step
  if (step === 1 || step === 1.5) {
    return (
      <>
        <VowInput
          vowText={vowText}
          setVowText={setVowText}
          onNext={handleVowNext}
          onByWhen={handleByWhenOpen}
        />
        <ByWhenSheet
          open={step === 1.5}
          onClose={handleByWhenClose}
          onSelect={handleByWhenSelect}
        />
      </>
    );
  }

  if (step === 2) {
    return (
      <WitnessStep
        witnessName={witnessName}
        setWitnessName={setWitnessName}
        witnessPhone={witnessPhone}
        setWitnessPhone={setWitnessPhone}
        vowText={vowText}
        endsAt={endsAt}
        onNext={handleWitnessNext}
        onBack={() => setStep(1)}
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
      onBack={() => setStep(2)}
      vowText={vowText}
      witnessName={witnessName}
    />
  );
}
