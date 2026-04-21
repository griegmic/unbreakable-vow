import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useMemo, useState } from 'react';

import type { ConsequenceType } from '@/constants/unbreakable';
import { analyzeVow, formalizeVow, vowExamples } from '@/constants/unbreakable';

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
  inviteMethod: 'sms' | 'link';
  phoneNumber: string;
  stake: StakeState;
  vowId: string | null;
  witnessInviteToken: string | null;
  deadlineIso: string | null;
}

const initialState: VowState = {
  rawInput: '',
  refinedText: '',
  witnessType: 'friend',
  witnessName: '',
  inviteMethod: 'sms',
  phoneNumber: '',
  stake: {
    amount: 50,
    consequence: 'charity',
    destination: 'ALS Association',
  },
  vowId: null,
  witnessInviteToken: null,
  deadlineIso: null,
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

  const setWitnessType = useCallback((type: WitnessType) => {
    console.log('[VowFlow] setWitnessType', type);
    setVow((current) => ({ ...current, witnessType: type }));
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

  const updateConsequence = useCallback((consequence: ConsequenceType, destination: string) => {
    console.log('[VowFlow] updateConsequence', { consequence, destination });
    setVow((current) => ({
      ...current,
      stake: { ...current.stake, consequence, destination },
    }));
  }, []);

  const setVowId = useCallback((vowId: string, witnessInviteToken: string | null) => {
    console.log('[VowFlow] setVowId', vowId);
    setVow((current) => ({ ...current, vowId, witnessInviteToken }));
  }, []);

  const setDeadline = useCallback((iso: string | null) => {
    console.log('[VowFlow] setDeadline', iso);
    setVow((current) => ({ ...current, deadlineIso: iso }));
  }, []);

  const switchToSolo = useCallback(() => {
    console.log('[VowFlow] switchToSolo');
    setVow((current) => ({
      ...current,
      witnessType: 'self' as const,
      witnessName: 'Just me',
      inviteMethod: 'link' as const,
      phoneNumber: '',
    }));
  }, []);

  const updateWitnessMidVow = useCallback((name: string, phone: string) => {
    console.log('[VowFlow] updateWitnessMidVow', { name, phone });
    setVow((current) => ({
      ...current,
      witnessType: 'friend' as const,
      witnessName: name,
      inviteMethod: 'sms' as const,
      phoneNumber: phone,
    }));
  }, []);

  const resetVow = useCallback(() => {
    console.log('[VowFlow] resetVow');
    setVow(initialState);
  }, []);

  const shouldSkipRefine = useCallback((input: string): boolean => {
    if (vowExamples.includes(input)) return true;
    const result = analyzeVow(input);
    return result.type === 'already_good';
  }, []);

  const analysis = useMemo(() => analyzeVow(vow.rawInput), [vow.rawInput]);
  const activeVowText = useMemo(
    () => vow.refinedText || formalizeVow(vow.rawInput),
    [vow.rawInput, vow.refinedText]
  );

  const isSelfWitness = useMemo(() => vow.witnessType === 'self', [vow.witnessType]);

  return useMemo(
    () => ({
      vow,
      analysis,
      activeVowText,
      isSelfWitness,
      setRawInput,
      setRefinedText,
      setWitnessType,
      setWitness,
      setStake,
      updateConsequence,
      setVowId,
      setDeadline,
      switchToSolo,
      updateWitnessMidVow,
      resetVow,
      shouldSkipRefine,
    }),
    [activeVowText, analysis, isSelfWitness, resetVow, setDeadline, setRawInput, setRefinedText, setStake, setVowId, setWitness, setWitnessType, shouldSkipRefine, switchToSolo, updateConsequence, updateWitnessMidVow, vow]
  );
});
