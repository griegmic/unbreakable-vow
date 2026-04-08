'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ConsequenceType } from '@/lib/vow-logic';
import { analyzeVow, formalizeVow, vowExamples } from '@/lib/vow-logic';

export interface StakeState {
  amount: number;
  consequence: ConsequenceType;
  destination: string;
}

export type WitnessType = 'self' | 'friend';

export interface VowState {
  rawInput: string;
  refinedText: string;
  witnessType: WitnessType;
  witnessName: string;
  witnessPhone: string;
  stake: StakeState;
  vowId: string | null;
  witnessInviteToken: string | null;
}

const initialState: VowState = {
  rawInput: '',
  refinedText: '',
  witnessType: 'friend',
  witnessName: '',
  witnessPhone: '',
  stake: {
    amount: 25,
    consequence: 'charity',
    destination: 'ALS Association',
  },
  vowId: null,
  witnessInviteToken: null,
};

const STORAGE_KEY = 'unbreakable-vow-flow';

function loadState(): VowState {
  if (typeof window === 'undefined') return initialState;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return initialState;
}

interface VowFlowContextValue {
  vow: VowState;
  activeVowText: string;
  isSelfWitness: boolean;
  setRawInput: (value: string) => void;
  setRefinedText: (value: string) => void;
  setWitnessType: (type: WitnessType) => void;
  setWitnessName: (name: string) => void;
  setWitnessPhone: (phone: string) => void;
  setStake: (stake: StakeState) => void;
  updateConsequence: (consequence: ConsequenceType, destination: string) => void;
  setVowId: (vowId: string, witnessInviteToken: string | null) => void;
  switchToSolo: () => void;
  resetVow: () => void;
  shouldSkipRefine: (input: string) => boolean;
}

const VowFlowContext = createContext<VowFlowContextValue | null>(null);

export function VowFlowProvider({ children }: { children: React.ReactNode }) {
  const [vow, setVow] = useState<VowState>(loadState);

  // Persist to sessionStorage on every change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(vow));
    } catch {}
  }, [vow]);

  const setRawInput = useCallback((value: string) => {
    setVow((c) => ({ ...c, rawInput: value, refinedText: '' }));
  }, []);

  const setRefinedText = useCallback((value: string) => {
    const next = formalizeVow(value);
    setVow((c) => ({ ...c, refinedText: next || c.refinedText }));
  }, []);

  const setWitnessType = useCallback((type: WitnessType) => {
    setVow((c) => ({ ...c, witnessType: type }));
  }, []);

  const setWitnessName = useCallback((name: string) => {
    setVow((c) => ({ ...c, witnessName: name }));
  }, []);

  const setWitnessPhone = useCallback((phone: string) => {
    setVow((c) => ({ ...c, witnessPhone: phone }));
  }, []);

  const setStake = useCallback((stake: StakeState) => {
    setVow((c) => ({ ...c, stake }));
  }, []);

  const updateConsequence = useCallback((consequence: ConsequenceType, destination: string) => {
    setVow((c) => ({ ...c, stake: { ...c.stake, consequence, destination } }));
  }, []);

  const setVowId = useCallback((vowId: string, witnessInviteToken: string | null) => {
    setVow((c) => ({ ...c, vowId, witnessInviteToken }));
  }, []);

  const switchToSolo = useCallback(() => {
    setVow((c) => ({ ...c, witnessType: 'self' as const, witnessName: 'Just me', witnessPhone: '' }));
  }, []);

  const resetVow = useCallback(() => {
    setVow(initialState);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const shouldSkipRefine = useCallback((input: string): boolean => {
    if (vowExamples.includes(input)) return true;
    return analyzeVow(input).type === 'already_good';
  }, []);

  const activeVowText = useMemo(() => vow.refinedText || formalizeVow(vow.rawInput), [vow.rawInput, vow.refinedText]);
  const isSelfWitness = vow.witnessType === 'self';

  const value = useMemo(() => ({
    vow, activeVowText, isSelfWitness,
    setRawInput, setRefinedText, setWitnessType, setWitnessName, setWitnessPhone,
    setStake, updateConsequence, setVowId, switchToSolo, resetVow, shouldSkipRefine,
  }), [vow, activeVowText, isSelfWitness, setRawInput, setRefinedText, setWitnessType, setWitnessName, setWitnessPhone, setStake, updateConsequence, setVowId, switchToSolo, resetVow, shouldSkipRefine]);

  return <VowFlowContext.Provider value={value}>{children}</VowFlowContext.Provider>;
}

export function useVowFlow() {
  const ctx = useContext(VowFlowContext);
  if (!ctx) throw new Error('useVowFlow must be used within VowFlowProvider');
  return ctx;
}
