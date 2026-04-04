import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';

import type { ConsequenceType } from '@/constants/unbreakable';
import { analyzeVow, detectVowNeeds, formalizeVow, isAlreadySharp, vowExamples } from '@/constants/unbreakable';

export type ProofMode = 'word' | 'screenshot';

export interface StakeState {
  amount: number;
  consequence: ConsequenceType;
  destination: string;
}

export interface CrewMember {
  name: string;
  inviteMethod: 'sms' | 'link';
  phoneNumber?: string;
}

export interface VowState {
  rawInput: string;
  refinedText: string;
  witnessName: string;
  inviteMethod: 'sms' | 'link';
  phoneNumber: string;
  stake: StakeState;
  authenticated: boolean;
  proofMode: ProofMode;
  crew: CrewMember[];
}

const MAX_CREW = 4;

const initialState: VowState = {
  rawInput: '',
  refinedText: '',
  witnessName: '',
  inviteMethod: 'sms',
  phoneNumber: '',
  stake: {
    amount: 25,
    consequence: 'charity',
    destination: 'ALS Association',
  },
  authenticated: false,
  proofMode: 'word',
  crew: [],
};

export const [VowFlowProvider, useVowFlow] = createContextHook(() => {
  const [vow, setVow] = useState<VowState>(initialState);

  const setRawInput = useCallback((value: string) => {
    console.log('[VowFlow] setRawInput', value);
    setVow((current) => ({ ...current, rawInput: value, refinedText: '' }));
  }, []);

  const setRefinedText = useCallback((value: string) => {
    const next = formalizeVow(value);
    console.log('[VowFlow] setRefinedText', next);
    setVow((current) => ({ ...current, refinedText: next || current.refinedText }));
  }, []);

  const setWitness = useCallback((name: string, inviteMethod: 'sms' | 'link', phoneNumber?: string) => {
    console.log('[VowFlow] setWitness', { name, inviteMethod });
    setVow((current) => ({
      ...current,
      witnessName: name,
      inviteMethod,
      phoneNumber: phoneNumber ?? current.phoneNumber,
    }));
  }, []);

  const setStake = useCallback((stake: StakeState) => {
    console.log('[VowFlow] setStake', stake);
    setVow((current) => ({ ...current, stake }));
  }, []);

  const setAuthenticated = useCallback((value: boolean) => {
    console.log('[VowFlow] setAuthenticated', value);
    setVow((current) => ({ ...current, authenticated: value }));
  }, []);

  const setProofMode = useCallback((mode: ProofMode) => {
    console.log('[VowFlow] setProofMode', mode);
    setVow((current) => ({ ...current, proofMode: mode }));
  }, []);

  const addCrewMember = useCallback((member: CrewMember) => {
    console.log('[VowFlow] addCrewMember', member.name);
    setVow((current) => {
      if (current.crew.length >= MAX_CREW) return current;
      if (current.crew.some((c) => c.name.toLowerCase() === member.name.toLowerCase())) return current;
      return { ...current, crew: [...current.crew, member] };
    });
  }, []);

  const removeCrewMember = useCallback((name: string) => {
    console.log('[VowFlow] removeCrewMember', name);
    setVow((current) => ({
      ...current,
      crew: current.crew.filter((c) => c.name !== name),
    }));
  }, []);

  const clearCrew = useCallback(() => {
    console.log('[VowFlow] clearCrew');
    setVow((current) => ({ ...current, crew: [] }));
  }, []);

  const resetVow = useCallback(() => {
    console.log('[VowFlow] resetVow');
    setVow(initialState);
  }, []);


  const shouldSkipRefine = useCallback((input: string): boolean => {
    if (vowExamples.includes(input)) return true;
    if (!isAlreadySharp(input)) return false;
    const needs = detectVowNeeds(input);
    if (needs.showFrequency || needs.showDuration) return false;
    return true;
  }, []);

  const analysis = useMemo(() => analyzeVow(vow.rawInput), [vow.rawInput]);
  const activeVowText = useMemo(
    () => vow.refinedText || formalizeVow(vow.rawInput),
    [vow.rawInput, vow.refinedText]
  );

  return useMemo(
    () => ({
      vow,
      analysis,
      activeVowText,
      setRawInput,
      setRefinedText,
      setWitness,
      setStake,
      setAuthenticated,
      setProofMode,
      addCrewMember,
      removeCrewMember,
      clearCrew,
      resetVow,
      shouldSkipRefine,
    }),
    [activeVowText, addCrewMember, analysis, clearCrew, removeCrewMember, resetVow, setAuthenticated, setProofMode, setRawInput, setRefinedText, setStake, setWitness, shouldSkipRefine, vow]
  );
});
