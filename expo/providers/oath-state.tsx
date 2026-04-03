import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

const KEYS = {
  introSeen: 'oath_intro_seen',
  installDate: 'oath_install_date',
  lastOpenDate: 'oath_last_open_date',
  oathToggle: 'oath_show_on_open',
} as const;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface OathData {
  introSeen: boolean;
  installDate: string | null;
  lastOpenDate: string | null;
  oathToggle: boolean;
}

async function loadOathData(): Promise<OathData> {
  const [introSeen, installDate, lastOpenDate, oathToggle] = await Promise.all([
    AsyncStorage.getItem(KEYS.introSeen),
    AsyncStorage.getItem(KEYS.installDate),
    AsyncStorage.getItem(KEYS.lastOpenDate),
    AsyncStorage.getItem(KEYS.oathToggle),
  ]);

  return {
    introSeen: introSeen === 'true',
    installDate,
    lastOpenDate,
    oathToggle: oathToggle === 'true',
  };
}

export const [OathStateProvider, useOathState] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState<boolean>(false);
  const [introPlayed, setIntroPlayed] = useState<boolean>(false);
  const [oathDismissed, setOathDismissed] = useState<boolean>(false);

  const { data: oathData } = useQuery({
    queryKey: ['oath-state'],
    queryFn: loadOathData,
    staleTime: Infinity,
  });

  const markIntroSeen = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await Promise.all([
        AsyncStorage.setItem(KEYS.introSeen, 'true'),
        AsyncStorage.setItem(KEYS.installDate, now),
        AsyncStorage.setItem(KEYS.lastOpenDate, now),
      ]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['oath-state'] });
    },
  });

  const recordOpen = useMutation({
    mutationFn: async () => {
      await AsyncStorage.setItem(KEYS.lastOpenDate, new Date().toISOString());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['oath-state'] });
    },
  });

  const toggleOathOnOpen = useMutation({
    mutationFn: async (value: boolean) => {
      await AsyncStorage.setItem(KEYS.oathToggle, value ? 'true' : 'false');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['oath-state'] });
    },
  });

  useEffect(() => {
    if (oathData) {
      setReady(true);
    }
  }, [oathData]);

  const shouldShowIntro = useMemo(() => {
    if (!oathData) return false;
    return !oathData.introSeen;
  }, [oathData]);

  const shouldShowOath = useMemo(() => {
    if (!oathData || !oathData.introSeen) return false;
    if (oathDismissed) return false;

    if (oathData.oathToggle) return true;

    if (oathData.installDate) {
      const installMs = new Date(oathData.installDate).getTime();
      const nowMs = Date.now();
      if (nowMs - installMs < SEVEN_DAYS_MS) {
        return true;
      }
    }

    if (oathData.lastOpenDate) {
      const lastMs = new Date(oathData.lastOpenDate).getTime();
      const nowMs = Date.now();
      if (nowMs - lastMs >= SEVEN_DAYS_MS) {
        return true;
      }
    }

    return false;
  }, [oathData, oathDismissed]);

  const completeIntro = useCallback(() => {
    console.log('[OathState] completeIntro');
    setIntroPlayed(true);
    markIntroSeen.mutate();
  }, [markIntroSeen]);

  const dismissOath = useCallback(() => {
    console.log('[OathState] dismissOath');
    setOathDismissed(true);
    recordOpen.mutate();
  }, [recordOpen]);

  const setOathToggle = useCallback((value: boolean) => {
    console.log('[OathState] setOathToggle', value);
    toggleOathOnOpen.mutate(value);
  }, [toggleOathOnOpen]);

  return useMemo(() => ({
    ready,
    shouldShowIntro: shouldShowIntro && !introPlayed,
    shouldShowOath,
    oathToggleEnabled: oathData?.oathToggle ?? false,
    completeIntro,
    dismissOath,
    setOathToggle,
  }), [ready, shouldShowIntro, introPlayed, shouldShowOath, oathData?.oathToggle, completeIntro, dismissOath, setOathToggle]);
});
