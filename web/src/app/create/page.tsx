'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVowFlow } from '@/providers/vow-flow';
import { useAuth } from '@/providers/auth-provider';
import { hashJudgeTerms, prepareJudgeLink, shareOrCopyJudgeLink, type JudgeLinkTerms } from '@/lib/judge-link';
import { HamburgerMenu } from '@/components/hamburger-menu';
import { VowInput } from './components/VowInput';
import { StakesStep } from './components/StakesStep';
import { IfBrokenSheet } from './components/IfBrokenSheet';

// Web flow: Step 1 (vow + deadline inline) → Step 3 (stakes) → seal
// Auth happens on /seal, not here
type Step = 1 | 3 | 3.5;

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { vow, setRawInput, setRefinedText, setStake, setDeadline, setVowId, setWitnessType, setWitnessName, setWitnessPhone } = useVowFlow();

  // Restore from VowFlowProvider if coming back from /seal
  const [step, setStep] = useState<Step>(() => {
    if (typeof window !== 'undefined' && vow.rawInput) return 3;
    return 1;
  });
  const [vowText, setVowText] = useState(() => vow.rawInput || '');
  const [endsAt, setEndsAt] = useState<Date | null>(() => vow.deadlineIso ? new Date(vow.deadlineIso) : null);
  const [stakeAmount, setStakeAmount] = useState(() => vow.stake?.amount || 50);
  const [destination, setDestination] = useState(() => vow.stake?.destination || 'ALS Association');
  const [destinationKind, setDestinationKind] = useState<'charity' | 'anti'>(() => (vow.stake?.consequence as 'charity' | 'anti') || 'charity');
  const [judgeLinkState, setJudgeLinkState] = useState<'idle' | 'working' | 'shared' | 'copied' | 'error'>('idle');
  const [judgeLinkMessage, setJudgeLinkMessage] = useState('');
  const [sharedTermsHash, setSharedTermsHash] = useState<string | null>(null);

  // Push history state when step changes so browser back works within the flow
  const goToStep = useCallback((newStep: Step) => {
    setStep(newStep);
    window.history.pushState({ step: newStep }, '', '/create');
  }, []);

  // Listen for browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prevStep = e.state?.step as Step | undefined;
      if (prevStep !== undefined) {
        setStep(prevStep);
      } else {
        // No previous step in history — go to landing
        router.replace('/');
      }
    };

    // Set initial history state
    window.history.replaceState({ step }, '', '/create');

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [router, step]);

  // Step 1 → Step 3 (skip witness on web)
  const handleVowNext = useCallback(() => {
    goToStep(3);
  }, [goToStep]);

  // Step 3 → open if-broken inline
  const handleIfBroken = useCallback(() => {
    goToStep(3.5);
  }, [goToStep]);

  // Step 3.5 → select destination
  const handleIfBrokenSelect = useCallback((dest: string, kind: 'charity' | 'anti') => {
    setDestination(dest);
    setDestinationKind(kind);
    goToStep(3);
  }, [goToStep]);

  const handleIfBrokenClose = useCallback(() => {
    setStep(3);
    window.history.replaceState({ step: 3 }, '', '/create');
  }, []);

  const buildJudgeTerms = useCallback((): JudgeLinkTerms => {
    const endDate = endsAt || new Date(Date.now() + 7 * 86400000);
    return {
      vowId: vow.vowId,
      rawInput: vowText,
      refinedText: vowText,
      stakeAmountCents: stakeAmount * 100,
      consequence: destinationKind,
      destination,
      endsAt: endDate.toISOString(),
      witnessName: 'Your witness',
      witnessPhone: null,
    };
  }, [destination, destinationKind, endsAt, stakeAmount, vow.vowId, vowText]);

  const [currentTermsHash, setCurrentTermsHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!vowText.trim() || !endsAt) {
      Promise.resolve().then(() => {
        if (!cancelled) setCurrentTermsHash(null);
      });
      return;
    }
    hashJudgeTerms(buildJudgeTerms()).then((hash) => {
      if (!cancelled) setCurrentTermsHash(hash);
    }).catch(() => {
      if (!cancelled) setCurrentTermsHash(null);
    });
    return () => { cancelled = true; };
  }, [buildJudgeTerms, endsAt, vowText]);

  const judgeLinkTermsChanged = Boolean(sharedTermsHash && currentTermsHash && sharedTermsHash !== currentTermsHash);

  const handleSendJudgeLink = useCallback(async () => {
    if (!vowText.trim()) return;
    setRawInput(vowText);
    setRefinedText(vowText);
    setStake({ amount: stakeAmount, consequence: destinationKind, destination });
    if (endsAt) setDeadline(endsAt.toISOString());
    setWitnessType('friend');
    setWitnessName('Your witness');
    setWitnessPhone('');

    if (!isAuthenticated) {
      try { localStorage.setItem('uv-share-witness-after-auth', '1'); } catch {}
      router.push('/seal?shareWitness=1');
      return;
    }

    setJudgeLinkState('working');
    setJudgeLinkMessage('');
    try {
      const prepared = await prepareJudgeLink(buildJudgeTerms(), 'share' in navigator ? 'share' : 'copy');
      const outcome = await shareOrCopyJudgeLink(prepared);
      setVowId(prepared.vowId, prepared.witnessInviteToken);
      setSharedTermsHash(prepared.termsHash);
      setJudgeLinkState(outcome);
      setJudgeLinkMessage(outcome === 'shared' ? 'Judge link opened in your share sheet.' : 'Judge link copied. Send it to your judge.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setJudgeLinkState('idle');
        return;
      }
      setJudgeLinkState('error');
      setJudgeLinkMessage(err instanceof Error ? err.message : 'Could not prepare judge link.');
    }
  }, [buildJudgeTerms, destination, destinationKind, endsAt, isAuthenticated, router, setDeadline, setRawInput, setRefinedText, setStake, setVowId, setWitnessName, setWitnessPhone, setWitnessType, stakeAmount, vowText]);

  const handleSkipJudgeLink = useCallback(() => {
    setJudgeLinkState('idle');
    setJudgeLinkMessage('No problem. You can send it after sealing.');
  }, []);

  // Step 3 "Seal my vow" — save to VowFlowProvider and go to /seal
  const handleReview = useCallback(() => {
    setRawInput(vowText);
    setRefinedText(vowText);
    setStake({ amount: stakeAmount, consequence: destinationKind, destination });
    if (endsAt) setDeadline(endsAt.toISOString());
    router.push('/seal');
  }, [vowText, stakeAmount, destinationKind, destination, endsAt, router, setRawInput, setRefinedText, setStake, setDeadline]);

  const hamburgerOverlay = isAuthenticated ? (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 50 }}>
      <HamburgerMenu />
    </div>
  ) : null;

  // Render based on current step
  if (step === 1) {
    return (
      <>
        {hamburgerOverlay}
        <VowInput
          vowText={vowText}
          setVowText={setVowText}
          endsAt={endsAt}
          setEndsAt={setEndsAt}
          onNext={handleVowNext}
        />
      </>
    );
  }

  if (step === 3.5) {
    return (
      <>
        {hamburgerOverlay}
        <IfBrokenSheet
          destination={destination}
          destinationKind={destinationKind}
          onSelect={handleIfBrokenSelect}
          onClose={handleIfBrokenClose}
        />
      </>
    );
  }

  // Step 3
  return (
    <>
      {hamburgerOverlay}
      <StakesStep
        stakeAmount={stakeAmount}
        setStakeAmount={setStakeAmount}
        destination={destination}
        destinationKind={destinationKind}
        onIfBroken={handleIfBroken}
        onNext={handleReview}
        onBack={() => {
          setStep(1);
          window.history.replaceState({ step: 1 }, '', '/create');
        }}
        vowText={vowText}
        witnessName="TBD"
        endsAt={endsAt}
        judgeLinkState={judgeLinkState}
        judgeLinkTermsChanged={judgeLinkTermsChanged}
        judgeLinkMessage={judgeLinkMessage}
        onSendJudgeLink={handleSendJudgeLink}
        onSkipJudgeLink={handleSkipJudgeLink}
      />
    </>
  );
}
