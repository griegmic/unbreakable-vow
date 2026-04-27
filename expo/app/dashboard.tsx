import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppMenuButton } from '@/components/app-menu';
import { palette, serifFont } from '@/constants/unbreakable';
import {
  getIncomingChallenges,
  getMyVows,
  getRecentVows,
  getWitnessingVows,
} from '@/lib/vow-api';
import { supabase } from '@/lib/supabase';
import { hapticPrimary, hapticSecondary } from '@/lib/haptics';

import {
  buildDashboardList,
  computeStats,
  getCountdownText,
  getProgress,
  getProgressColor,
  getStakeLabel,
  getDayProgress,
  getTapTarget,
  type DashboardVow,
  type SortedVow,
  type CardState,
} from '@/lib/dashboard-sort';

function openWebFlow(path: string) {
  router.push({
    pathname: '/external-web',
    params: { url: encodeURIComponent(`https://unbreakablevow.app${path}`) },
  } as any);
}

// ---------------------------------------------------------------------------
// Card visual styles (PRD Section 5.3)
// ---------------------------------------------------------------------------

type CardStyleDef = {
  bg: string;
  border: string;
  borderWidth: number;
  glow?: string;
  opacity?: number;
  borderLeftWidth?: number;
  borderLeftColor?: string;
  borderStyle?: 'solid' | 'dashed';
};

const CARD_STYLES: Record<string, CardStyleDef> = {
  'c-urgent': {
    bg: 'rgba(251,146,60,0.07)',
    border: 'rgba(251,146,60,0.32)',
    borderWidth: 1.5,
    glow: 'rgba(251,146,60,0.08)',
  },
  'c-action-blue': {
    bg: 'rgba(96,165,250,0.07)',
    border: 'rgba(96,165,250,0.3)',
    borderWidth: 1.5,
    glow: 'rgba(96,165,250,0.08)',
  },
  'c-waiting': {
    bg: 'rgba(251,146,60,0.04)',
    border: 'rgba(251,146,60,0.2)',
    borderWidth: 1.5,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(251,146,60,0.4)',
  },
  'c-active': {
    bg: 'rgba(212,162,79,0.05)',
    border: 'rgba(212,162,79,0.28)',
    borderWidth: 1.5,
  },
  'c-witness': {
    bg: 'rgba(96,165,250,0.04)',
    border: 'rgba(96,165,250,0.18)',
    borderWidth: 1.5,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(96,165,250,0.3)',
  },
  'c-pending': {
    bg: 'rgba(212,162,79,0.03)',
    border: 'rgba(212,162,79,0.15)',
    borderWidth: 1.5,
    opacity: 0.75,
  },
  'c-draft': {
    bg: '#12141a',
    border: '#252320',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    opacity: 0.75,
  },
};

function getStyleClass(state: CardState): string {
  switch (state) {
    case 'M1': case 'M3': case 'T1': case 'M11': return 'c-urgent';
    case 'W1': return 'c-action-blue';
    case 'M2': case 'T3': return 'c-waiting';
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10': case 'T2': return 'c-active';
    case 'W2': return 'c-witness';
    case 'M9': return 'c-pending';
    case 'M8': return 'c-draft';
  }
}

// ---------------------------------------------------------------------------
// Card content helpers
// ---------------------------------------------------------------------------

function getStatusLabel(state: CardState, vow: DashboardVow): { label: string; color: string } {
  switch (state) {
    case 'M1': case 'M11': return { label: 'Your call', color: '#FB923C' };
    case 'M2': return { label: 'Awaiting verdict', color: '#FB923C' };
    case 'M3': return { label: 'Unwitnessed', color: '#FB923C' };
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10':
      return { label: 'Active', color: '#52d69a' };
    case 'M8': return { label: 'Draft', color: '#5a5650' };
    case 'M9': return { label: 'Dare sent', color: '#8a8578' };
    case 'W1': return { label: 'You judge', color: '#60A5FA' };
    case 'W2': return { label: 'Witnessing', color: '#60A5FA' };
    case 'T1': return { label: `Dare from ${vow.witness_name}`, color: '#FB923C' };
    case 'T2': return { label: 'Your dare', color: '#52d69a' };
    case 'T3': return { label: "Time's up", color: '#FB923C' };
  }
}

function getDotConfig(state: CardState): { color: string; pulse: boolean } {
  switch (state) {
    case 'M1': case 'M2': case 'M3': case 'M11': case 'T3':
      return { color: '#FB923C', pulse: true };
    case 'T1': return { color: '#FB923C', pulse: false };
    case 'W1': return { color: '#60A5FA', pulse: true };
    case 'W2': return { color: '#60A5FA', pulse: false };
    case 'M4': case 'M5': case 'M6': case 'M7': case 'M10': case 'T2':
      return { color: '#52d69a', pulse: false };
    case 'M8': return { color: '#5a5650', pulse: false };
    case 'M9': return { color: '#8a8578', pulse: false };
  }
}

function getMetaText(state: CardState, vow: DashboardVow): { text: string; color: string } | null {
  const stake = getStakeLabel(vow.stake_amount);
  const targetName = vow.target_display_name || 'them';
  switch (state) {
    case 'M1': case 'T1': return null;
    case 'M2': return { text: `${vow.witness_name} deciding`, color: '#5a5650' };
    case 'M3': return { text: `${vow.witness_name} never accepted`, color: '#FB923C' };
    case 'M4': return { text: `${vow.witness_name} · watching`, color: '#5a5650' };
    case 'M5': return { text: `Just you · ${stake}`, color: '#5a5650' };
    case 'M6': return { text: `${vow.witness_name} · hasn't accepted`, color: '#FB923C' };
    case 'M7': {
      if (vow.witness_name === 'Just me') return { text: `Just you · ${stake}`, color: '#5a5650' };
      if (vow.witness_accepted_at) return { text: `${vow.witness_name} · watching`, color: '#5a5650' };
      return { text: `${vow.witness_name} · hasn't accepted`, color: '#FB923C' };
    }
    case 'M8': {
      const isSolo = vow.witness_name === 'Just me';
      if (isSolo || !vow.witness_name) return { text: 'Tap to seal →', color: palette.gold };
      if (vow.witness_accepted_at) return { text: `${vow.witness_name} accepted · Seal it →`, color: '#52d69a' };
      if (vow.witness_declined) return { text: `${vow.witness_name} declined · Tap to seal →`, color: '#FB923C' };
      return { text: `${vow.witness_name} invited · Tap to seal →`, color: palette.gold };
    }
    case 'M9': return { text: `Waiting on ${targetName}`, color: '#5a5650' };
    case 'M10': return { text: `Dared ${targetName} · watching`, color: '#5a5650' };
    case 'M11': return { text: `You're judging ${targetName}`, color: '#5a5650' };
    case 'W1': return { text: `By ${vow.maker_display_name || 'someone'} · ${stake}`, color: '#5a5650' };
    case 'W2': return { text: `By ${vow.maker_display_name || 'someone'} · ${stake}`, color: '#5a5650' };
    case 'T2': return { text: `Dared by ${vow.witness_name} · ${stake}`, color: '#5a5650' };
    case 'T3': return { text: `Dared by ${vow.witness_name}`, color: '#5a5650' };
  }
}

function hasChevron(state: CardState): boolean {
  switch (state) {
    case 'M2': case 'M4': case 'M5': case 'M6': case 'M7':
    case 'M9': case 'M10': case 'W2': case 'T2': case 'T3':
      return true;
    default: return false;
  }
}

function shouldShowProgress(state: CardState, vow: DashboardVow): boolean {
  if (state === 'M8' || state === 'M9' || state === 'T1') return false;
  return !!(vow.starts_at && vow.ends_at);
}

// ---------------------------------------------------------------------------
// PulsingDot — native Animated pulse
// ---------------------------------------------------------------------------

function PulsingDot({ color, pulse }: { color: string; pulse: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, opacity]);

  return (
    <Animated.View
      style={[
        styles.statusDot,
        { backgroundColor: color, opacity: pulse ? opacity : 1 },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// DashboardCard — Smart Stack card
// ---------------------------------------------------------------------------

function DashboardCard({
  item,
  onTap,
}: {
  item: SortedVow;
  onTap: () => void;
}) {
  const { vow, state } = item;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styleClass = getStyleClass(state);
  const cs = CARD_STYLES[styleClass];
  const status = getStatusLabel(state, vow);
  const dot = getDotConfig(state);
  const countdown = (state !== 'M8' && state !== 'M9' && state !== 'T1') ? getCountdownText(vow.ends_at) : null;
  const meta = getMetaText(state, vow);
  const showChev = hasChevron(state);
  const showProgress = shouldShowProgress(state, vow);
  const progress = showProgress ? getProgress(vow.starts_at, vow.ends_at) : null;

  const pressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();

  const cardStyles: any = {
    backgroundColor: cs.bg,
    borderColor: cs.border,
    borderWidth: cs.borderWidth,
    borderRadius: 16,
    padding: 14,
    gap: 7,
    ...(cs.borderLeftWidth ? { borderLeftWidth: cs.borderLeftWidth, borderLeftColor: cs.borderLeftColor } : {}),
    ...(cs.borderStyle ? { borderStyle: cs.borderStyle } : {}),
    ...(cs.glow ? { shadowColor: cs.glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 16 } : {}),
    ...(cs.opacity ? { opacity: cs.opacity } : {}),
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPress={onTap} onPressIn={pressIn} onPressOut={pressOut} style={cardStyles}>
        {/* Top row: dot + label + time + chevron */}
        <View style={styles.cardTopRow}>
          <PulsingDot color={dot.color} pulse={dot.pulse} />
          <Text style={[styles.cardLabel, { color: status.color }]}>{status.label}</Text>
          {countdown && (
            <Text style={[styles.cardTime, countdown === "Time's up" && { color: '#FB923C' }]}>{countdown}</Text>
          )}
          {showChev && <ChevronRight color="#3a3530" size={16} style={{ marginLeft: countdown ? 4 : 'auto' }} />}
        </View>

        {/* Vow text */}
        <Text style={styles.cardVowText} numberOfLines={2}>
          {vow.refined_text || vow.raw_input}
        </Text>

        {/* Progress bar */}
        {progress !== null && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: getProgressColor(progress) }]} />
          </View>
        )}

        {/* Meta line */}
        {meta && (
          <Text style={[styles.cardMeta, { color: meta.color }]}>{meta.text}</Text>
        )}

        {/* Action buttons */}
        {state === 'M1' && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.keptBtn}
              onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
            >
              <Text style={styles.keptBtnText}>Kept ✓</Text>
            </Pressable>
            <Pressable
              style={styles.brokenBtn}
              onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
            >
              <Text style={styles.brokenBtnText}>Broken ✗</Text>
            </Pressable>
          </View>
        )}

        {state === 'M3' && (
          <Pressable
            style={styles.orangeBtn}
            onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
          >
            <Text style={styles.orangeBtnText}>Self-resolve →</Text>
          </Pressable>
        )}

        {state === 'M11' && (
          <Pressable
            style={styles.goldBtn}
            onPress={() => { hapticSecondary(); router.push({ pathname: '/vow-detail', params: { vowId: vow.id } }); }}
          >
            <Text style={styles.goldBtnText}>Deliver verdict →</Text>
          </Pressable>
        )}

        {state === 'W1' && (
          <Pressable
            style={styles.blueBtn}
            onPress={() => {
              hapticSecondary();
              if (vow.witness_invite_token) openWebFlow(`/w/${vow.witness_invite_token}/verdict`);
              else router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
            }}
          >
            <Text style={styles.blueBtnText}>Deliver your verdict →</Text>
          </Pressable>
        )}

        {state === 'T1' && vow.challenge_invite_token && (
          <Pressable
            style={styles.goldBtn}
            onPress={() => {
              hapticPrimary();
              openWebFlow(`/c/${vow.challenge_invite_token}`);
            }}
          >
            <Text style={styles.goldBtnText}>Open dare →</Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// DashboardHero — single-vow hero view
// ---------------------------------------------------------------------------

function DashboardHero({
  item,
}: {
  item: SortedVow;
}) {
  const { vow, state } = item;
  const progress = getProgress(vow.starts_at, vow.ends_at);
  const dayText = getDayProgress(vow.starts_at, vow.ends_at);
  const countdown = getCountdownText(vow.ends_at);
  const isTimesUp = countdown === "Time's up";
  const stake = getStakeLabel(vow.stake_amount);
  const targetName = vow.target_display_name || 'them';

  // Countdown line
  const leftText = isTimesUp && state === 'M1' ? "Time's up — your call"
    : isTimesUp ? "Time's up"
    : dayText || '';
  const rightText = (() => {
    switch (state) {
      case 'M1': case 'M5': return `Just you · ${stake}`;
      case 'M2': return `Waiting for ${vow.witness_name}'s verdict`;
      case 'M3': return `${vow.witness_name} never accepted`;
      case 'M4': case 'M6': case 'M7': return countdown && !isTimesUp ? countdown : '';
      case 'M11': return `You're judging ${targetName}`;
      case 'W1': case 'W2': return `By ${vow.maker_display_name || 'someone'} · ${stake}`;
      case 'T2': return `Dared by ${vow.witness_name} · ${stake}`;
      case 'T3': return `Dared by ${vow.witness_name}`;
      default: return '';
    }
  })();

  // Witness block
  const showWitness = state !== 'W1' && state !== 'W2' && state !== 'T1' && state !== 'T2' && state !== 'T3' && vow.witness_name !== 'Just me' && !!vow.witness_name;
  const isDraft = state === 'M8';
  const isWitnessDeciding = vow.status === 'awaiting_verdict' && !!vow.witness_accepted_at;
  const isWitnessPending = !vow.witness_accepted_at && vow.witness_name !== 'Just me';
  const isWitnessDeclined = !!vow.witness_declined;

  return (
    <View style={{ flex: 1, gap: 16, paddingTop: 8 }}>
      {/* Vow text */}
      <Pressable onPress={() => router.push({ pathname: '/vow-detail', params: { vowId: vow.id } })}>
        <Text style={styles.heroVowText}>
          {'\u201C'}{vow.refined_text}{'\u201D'}
        </Text>
      </Pressable>

      {/* Progress bar (6px, gradient via solid for simplicity) */}
      {progress !== null && (
        <View style={styles.heroProgressTrack}>
          <LinearGradient
            colors={progress >= 1 ? ['#FB923C', '#EF4444'] : ['#d4a24f', '#e8c36a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.heroProgressFill, { width: `${Math.round(progress * 100)}%` }]}
          />
        </View>
      )}

      {/* Countdown line */}
      {(leftText || rightText) ? (
        <View style={styles.heroCountdownRow}>
          <Text style={[styles.heroCountdownLeft, isTimesUp && { color: '#FB923C' }]}>{leftText}</Text>
          <Text style={styles.heroCountdownRight}>{rightText}</Text>
        </View>
      ) : null}

      {/* Witness block */}
      {showWitness && isDraft && (
        <View
          style={[styles.witnessBlock, isWitnessDeclined && styles.witnessBlockUrgent]}
        >
          <View style={[styles.witnessBlockDot, {
            backgroundColor: isWitnessDeclined ? '#FB923C' : vow.witness_accepted_at ? '#52d69a' : '#8a8578',
          }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.witnessBlockName}>
              {isWitnessDeclined ? `${vow.witness_name} declined`
                : vow.witness_accepted_at ? `${vow.witness_name} accepted`
                : `${vow.witness_name} invited`}
            </Text>
          </View>
        </View>
      )}
      {showWitness && !isDraft && (
        <Pressable
          style={[styles.witnessBlock, isWitnessDeciding && styles.witnessBlockUrgent]}
          onPress={() => router.push({ pathname: '/vow-detail', params: { vowId: vow.id } })}
        >
          <View style={[styles.witnessBlockDot, { backgroundColor: isWitnessDeciding ? '#FB923C' : '#52d69a' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.witnessBlockName}>
              {isWitnessDeciding ? `${vow.witness_name} has the call`
                : isWitnessPending ? `${vow.witness_name} · hasn't accepted`
                : `${vow.witness_name} is watching`}
            </Text>
            {!isWitnessPending && (
              <Text style={styles.witnessBlockSub}>{stake} · {vow.destination || 'charity'}</Text>
            )}
          </View>
          <ChevronRight color="#3a3530" size={16} />
        </Pressable>
      )}

      {/* Spacer */}
      <View style={{ flex: 1, minHeight: 40 }} />

      {/* Hero CTA */}
      <HeroCTA state={state} vow={vow} />

      {/* Secondary link */}
      {state !== 'T1' && (
        <Pressable
          style={styles.secondaryLink}
          onPress={() => { hapticSecondary(); router.push('/quick-vow'); }}
        >
          <Text style={styles.secondaryLinkText}>Make a vow →</Text>
        </Pressable>
      )}
    </View>
  );
}

function HeroCTA({
  state,
  vow,
}: {
  state: CardState;
  vow: DashboardVow;
}) {
  const targetName = vow.target_display_name || 'them';

  const GoldButton = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <Pressable style={styles.heroBtnWrap} onPress={() => { hapticPrimary(); onPress(); }}>
      <LinearGradient colors={[palette.goldBright, palette.gold, palette.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBtnGradient}>
        <Text style={styles.heroBtnDarkText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );

  switch (state) {
    case 'M1':
      return (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.heroKeptBtn, { flex: 1 }]}
            onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
          >
            <Text style={styles.heroKeptText}>I kept it</Text>
          </Pressable>
          <Pressable
            style={[styles.heroBrokenBtn, { flex: 1 }]}
            onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
          >
            <Text style={styles.heroBrokenText}>I broke it</Text>
          </Pressable>
        </View>
      );
    case 'M2':
      return (
        <View style={{ gap: 8 }}>
          <GoldButton label="Make a new vow →" onPress={() => router.push('/quick-vow')} />
          {vow.witness_phone && (
            <Pressable style={styles.secondaryLink} onPress={() => Linking.openURL(`sms:${vow.witness_phone}`)}>
              <Text style={styles.secondaryLinkText}>Nudge {vow.witness_name}</Text>
            </Pressable>
          )}
        </View>
      );
    case 'M3':
      return (
        <Pressable
          style={styles.heroOrangeBtn}
          onPress={() => { hapticSecondary(); router.push({ pathname: '/self-resolve', params: { vowId: vow.id } }); }}
        >
          <Text style={styles.heroOrangeText}>Self-resolve →</Text>
        </Pressable>
      );
    case 'M4': case 'M6': case 'M7':
      return <GoldButton label={`Send ${vow.witness_name} a message`} onPress={() => { if (vow.witness_phone) Linking.openURL(`sms:${vow.witness_phone}`); }} />;
    case 'M5':
      return <GoldButton label="Check in" onPress={() => router.push({ pathname: '/vow-detail', params: { vowId: vow.id } })} />;
    case 'M8':
      return <GoldButton label="Seal this vow" onPress={() => router.push({ pathname: '/seal', params: { vowId: vow.id } })} />;
    case 'M9':
      return <GoldButton label={`Nudge ${targetName}`} onPress={() => { if (vow.target_phone) Linking.openURL(`sms:${vow.target_phone}`); }} />;
    case 'M10':
      return <GoldButton label="View dare" onPress={() => router.push({ pathname: '/vow-detail', params: { vowId: vow.id } })} />;
    case 'M11':
      return <GoldButton label="Deliver verdict →" onPress={() => {
        if (vow.witness_invite_token) openWebFlow(`/w/${vow.witness_invite_token}/verdict`);
        else router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
      }} />;
    case 'W1':
      return (
        <Pressable style={styles.heroBlueBtn} onPress={() => {
          hapticSecondary();
          if (vow.witness_invite_token) openWebFlow(`/w/${vow.witness_invite_token}/verdict`);
          else router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
        }}>
          <Text style={styles.heroBlueBtnText}>Deliver your verdict →</Text>
        </Pressable>
      );
    case 'W2':
      return <GoldButton label="Open witness page →" onPress={() => {
        if (vow.witness_invite_token) openWebFlow(`/w/${vow.witness_invite_token}`);
        else router.push({ pathname: '/vow-detail', params: { vowId: vow.id } });
      }} />;
    case 'T1':
      return <GoldButton label="Open dare →" onPress={() => {
        if (vow.challenge_invite_token) openWebFlow(`/c/${vow.challenge_invite_token}`);
      }} />;
    case 'T2': case 'T3':
      return <GoldButton label={state === 'T2' ? 'Check in' : 'View status'} onPress={() => router.push({ pathname: '/vow-detail', params: { vowId: vow.id } })} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Dashboard Screen
// ---------------------------------------------------------------------------

export default function VowDashboard() {
  const [myVows, setMyVows] = useState<DashboardVow[]>([]);
  const [allMyVows, setAllMyVows] = useState<DashboardVow[]>([]); // includes terminal for stats
  const [witnessingVows, setWitnessingVows] = useState<DashboardVow[]>([]);
  const [challenges, setChallenges] = useState<DashboardVow[]>([]);
  const [acceptedChallengeIds, setAcceptedChallengeIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [my, witnessing, incoming, recent] = await Promise.all([
        getMyVows(),
        getWitnessingVows(),
        getIncomingChallenges(),
        getRecentVows(100), // get all terminal for stats
      ]);

      const myData = my as DashboardVow[];
      const witnessingData = witnessing as DashboardVow[];

      // Track accepted challenge IDs
      const accIds = new Set<string>();
      for (const v of myData) {
        if (v.vow_type === 'challenge' && v.challenge_status === 'accepted') {
          accIds.add(v.id);
        }
      }
      setAcceptedChallengeIds(accIds);

      // Resolve maker display names for witnessing vows
      const witnessingWithNames: DashboardVow[] = await Promise.all(
        witnessingData.map(async (vow) => {
          try {
            const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.user_id } as any);
            return { ...vow, maker_display_name: (name as unknown as string) ?? null };
          } catch {
            return { ...vow, maker_display_name: null };
          }
        })
      );

      // Resolve target display names for challenge vows
      const myWithTargetNames: DashboardVow[] = await Promise.all(
        myData.map(async (vow) => {
          if (vow.vow_type === 'challenge' && vow.target_user_id) {
            try {
              const { data: name } = await supabase.rpc('get_display_name', { user_uuid: vow.target_user_id } as any);
              return { ...vow, target_display_name: (name as unknown as string) ?? null };
            } catch { return vow; }
          }
          return vow;
        })
      );

      // Combine active + terminal for stats
      const allVows = [...myWithTargetNames, ...(recent as DashboardVow[]).filter(v => !myWithTargetNames.some(m => m.id === v.id))];

      setMyVows(myWithTargetNames);
      setAllMyVows(allVows);
      setWitnessingVows(witnessingWithNames);
      setChallenges(incoming as DashboardVow[]);
      setFetchError(false);
    } catch (e) {
      console.log('[Dashboard] fetch error:', e);
      setFetchError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAll().finally(() => setLoading(false));
    }, [fetchAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // --- Computed state ---
  const { keptCount, streak } = useMemo(() => computeStats(allMyVows), [allMyVows]);
  const dashboardVows = useMemo(
    () => buildDashboardList(myVows, witnessingVows, challenges, acceptedChallengeIds),
    [myVows, witnessingVows, challenges, acceptedChallengeIds]
  );
  const completedCount = useMemo(
    () => allMyVows.filter(v => ['kept', 'broken', 'voided'].includes(v.status)).length,
    [allMyVows]
  );

  const myDashboardVows = useMemo(() => dashboardVows.filter(v => v.role !== 'witness'), [dashboardVows]);
  const theirDashboardVows = useMemo(() => dashboardVows.filter(v => v.role === 'witness'), [dashboardVows]);

  const isEmpty = myVows.length === 0 && witnessingVows.length === 0 && challenges.length === 0;

  // Redirect if empty
  useEffect(() => {
    if (!loading && !fetchError && isEmpty) {
      router.replace('/');
    }
  }, [loading, fetchError, isEmpty]);

  // Redirect if all terminal and no witness vows
  useEffect(() => {
    if (!loading && !fetchError && !isEmpty && myDashboardVows.length === 0 && theirDashboardVows.length === 0) {
      router.replace('/');
    }
  }, [loading, fetchError, isEmpty, myDashboardVows.length, theirDashboardVows.length]);

  const isHero = myDashboardVows.length === 1 && theirDashboardVows.length === 0;

  // Build list data for smart stack (must be above early returns to preserve hook order)
  type ListItem = { type: 'card'; data: SortedVow } | { type: 'section'; title: string; color: string };
  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    if (myDashboardVows.length > 0 && theirDashboardVows.length > 0) {
      items.push({ type: 'section', title: 'Your vows', color: '#5a5650' });
    }
    for (const v of myDashboardVows) items.push({ type: 'card', data: v });
    if (theirDashboardVows.length > 0) {
      items.push({ type: 'section', title: 'Their vows', color: '#60A5FA' });
      for (const v of theirDashboardVows) items.push({ type: 'card', data: v });
    }
    return items;
  }, [myDashboardVows, theirDashboardVows]);

  // --- Loading ---
  if (loading && dashboardVows.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={[palette.bg, '#08101A', palette.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.loadingWrap}>
          <ActivityIndicator color={palette.gold} size="large" />
        </SafeAreaView>
      </View>
    );
  }

  // --- Error ---
  if (fetchError && dashboardVows.length === 0) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={[palette.bg, '#08101A', palette.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.loadingWrap}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>Could not load your vows. Please try again.</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); setFetchError(false); fetchAll().finally(() => setLoading(false)); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // --- Header component ---
  const Header = () => (
    <View style={styles.headerArea}>
      <Pressable
        style={styles.backRow}
        onPress={() => { router.replace('/'); }}
        hitSlop={8}
      >
        <ChevronLeft color={palette.textSecondary} size={20} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <View style={styles.navRow}>
        <AppMenuButton style={styles.navBtn} />
        <View style={{ flex: 1 }} />
        {keptCount > 0 && (
          <Text style={styles.inlineStats}>
            <Text style={{ color: '#52d69a' }}>{keptCount}</Text>
            {' kept'}
            {streak >= 2 ? ` · ${streak} streak` : ''}
          </Text>
        )}
        <Pressable style={styles.navBtn} onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel="Settings">
          <Settings color={palette.textSecondary} size={20} />
        </Pressable>
      </View>
    </View>
  );

  // --- HERO VIEW ---
  if (isHero) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={[palette.bg, '#08101A', palette.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.orbLarge} />
        <View pointerEvents="none" style={styles.orbSmall} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.listContent, { flex: 1, paddingHorizontal: 20 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />}
          >
            <Header />
            <DashboardHero
              item={myDashboardVows[0]}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // --- SMART STACK ---
  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.type === 'section') {
      return (
        <View style={{ paddingHorizontal: 20, paddingTop: item.title === 'Your vows' ? 0 : 16, paddingBottom: 4 }}>
          <Text style={[styles.cardLabel, { color: item.color, letterSpacing: 1.2 }]}>{item.title}</Text>
        </View>
      );
    }
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <DashboardCard
          item={item.data}
          onTap={() => {
            hapticSecondary();
            const target = getTapTarget(item.data);
            router.push(target as any);
          }}
        />
      </View>
    );
  };

  const StackHeader = () => (
    <>
      <Header />
    </>
  );

  const StackFooter = () => (
    <View style={styles.footerWrap}>
      {completedCount > 0 && (
        <View style={styles.historyLinkWrap}>
          <Text style={styles.historyCount}>{completedCount} vow{completedCount !== 1 ? 's' : ''} completed</Text>
          <Pressable onPress={() => router.push('/history')}>
            <Text style={styles.historyLink}>View history →</Text>
          </Pressable>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.makeVowBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => { hapticPrimary(); router.push('/quick-vow'); }}
      >
        <LinearGradient
          colors={[palette.goldBright, palette.gold, palette.goldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.makeVowBtnGradient}
        >
          <Text style={styles.makeVowBtnText}>Make a Vow</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[palette.bg, '#08101A', palette.bgSecondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.orbLarge} />
      <View pointerEvents="none" style={styles.orbSmall} />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.type === 'card' ? item.data.vow.id : `section-${index}`}
          ListHeaderComponent={StackHeader}
          ListFooterComponent={StackFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />}
        />
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  orbLarge: {
    position: 'absolute', top: -90, right: -40, width: 260, height: 260,
    borderRadius: 260, backgroundColor: palette.goldGlow, opacity: 0.7,
  },
  orbSmall: {
    position: 'absolute', top: 180, left: -50, width: 160, height: 160,
    borderRadius: 160, backgroundColor: 'rgba(94,124,250,0.12)',
  },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorTitle: { color: palette.text, fontSize: 18, fontWeight: '700', fontFamily: serifFont, textAlign: 'center' },
  errorSubtitle: { color: palette.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 40, marginBottom: 8 },
  retryBtn: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  retryBtnText: { color: palette.text, fontSize: 15, fontWeight: '600' },
  listContent: { paddingBottom: 40 },

  // Header
  headerArea: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, marginBottom: 4 },
  backText: { color: palette.textSecondary, fontSize: 15, fontWeight: '500' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  navBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: palette.surface,
    borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center',
  },
  inlineStats: { color: '#5a5650', fontSize: 12, fontWeight: '600' },

  // Card shared
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  cardTime: { fontSize: 12, fontWeight: '600', color: '#8a8578', marginLeft: 'auto' },
  cardVowText: { color: palette.text, fontSize: 15, fontWeight: '500', fontFamily: serifFont, lineHeight: 21 },
  cardMeta: { fontSize: 12, fontWeight: '400' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },

  // Action buttons (card)
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  keptBtn: {
    flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(82,214,154,0.15)', borderWidth: 1, borderColor: 'rgba(82,214,154,0.3)',
  },
  keptBtnText: { color: '#52d69a', fontSize: 13, fontWeight: '700' },
  brokenBtn: {
    flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  brokenBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  orangeBtn: {
    minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    backgroundColor: '#FB923C',
  },
  orangeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  goldBtn: {
    flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#D4A24F',
  },
  goldBtnText: { color: '#0B0D11', fontSize: 13, fontWeight: '700' },
  blueBtn: {
    minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    backgroundColor: '#3B82F6',
  },
  blueBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mutedBtn: {
    flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#14161c', borderWidth: 1, borderColor: '#3a3530',
  },
  mutedBtnText: { color: '#8a8578', fontSize: 13, fontWeight: '600' },

  // Hero
  heroVowText: { color: palette.text, fontSize: 24, fontWeight: '400', fontFamily: serifFont, lineHeight: 32 },
  heroProgressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  heroProgressFill: { height: 6, borderRadius: 3 },
  heroCountdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCountdownLeft: { fontSize: 12, fontWeight: '600', color: '#8a8578' },
  heroCountdownRight: { fontSize: 12, color: '#5a5650' },

  // Witness block
  witnessBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  witnessBlockUrgent: {
    backgroundColor: 'rgba(251,146,60,0.06)', borderColor: 'rgba(251,146,60,0.25)',
  },
  witnessBlockDot: { width: 10, height: 10, borderRadius: 5 },
  witnessBlockName: { color: palette.text, fontSize: 14, fontWeight: '600' },
  witnessBlockSub: { color: '#5a5650', fontSize: 12, marginTop: 2 },

  // Hero buttons
  heroBtnWrap: { borderRadius: 14, overflow: 'hidden' },
  heroBtnGradient: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 14 },
  heroBtnDarkText: { color: '#0B0D11', fontSize: 14, fontWeight: '800' },
  heroKeptBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(82,214,154,0.15)', borderWidth: 1, borderColor: 'rgba(82,214,154,0.3)',
  },
  heroKeptText: { color: '#52d69a', fontSize: 14, fontWeight: '800' },
  heroBrokenBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  heroBrokenText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  heroOrangeBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FB923C',
  },
  heroOrangeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  heroBlueBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3B82F6',
  },
  heroBlueBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  heroMutedBtn: {
    minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#14161c', borderWidth: 1, borderColor: '#3a3530',
  },
  heroMutedBtnText: { color: '#8a8578', fontSize: 14, fontWeight: '800' },
  secondaryLink: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  secondaryLinkText: { color: '#5a5650', fontSize: 13, fontWeight: '600' },

  // Footer
  footerWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  historyLinkWrap: { alignItems: 'center', gap: 4, paddingBottom: 16 },
  historyCount: { color: '#3a3530', fontSize: 11 },
  historyLink: { color: '#5a5650', fontSize: 12 },
  makeVowBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: palette.gold, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 10,
  },
  makeVowBtnGradient: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  makeVowBtnText: { color: '#0B0D11', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
