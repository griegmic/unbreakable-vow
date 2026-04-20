'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVowFlow } from '@/providers/vow-flow';
import { VowInput } from './components/VowInput';
import { StakesStep } from './components/StakesStep';
import { IfBrokenSheet } from './components/IfBrokenSheet';

// Web flow: Step 1 (vow + deadline inline) → Step 3 (stakes) → seal
// Auth happens on /seal, not here
type Step = 1 | 3 | 3.5;

export default function CreatePage() {
  const router = useRouter();
  const { setRawInput, setRefinedText, setStake, setDeadline } = useVowFlow();

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

  // Step 3 "Seal my vow" — save to VowFlowProvider and go to /seal
  // Auth happens on /seal, not here
  const handleReview = useCallback(() => {
    // Persist to VowFlowProvider (localStorage) so /seal can pick it up
    setRawInput(vowText);
    setRefinedText(vowText);
    setStake({ amount: stakeAmount, consequence: destinationKind, destination });
    if (endsAt) setDeadline(endsAt.toISOString());
    router.push('/seal');
  }, [vowText, stakeAmount, destinationKind, destination, endsAt, router, setRawInput, setRefinedText, setStake, setDeadline]);

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
