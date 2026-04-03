import { Platform } from 'react-native';

export const palette = {
  bg: '#05070B',
  bgSecondary: '#0A0D12',
  surface: '#10141C',
  surfaceElevated: '#161B25',
  surfaceStrong: '#1B2230',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,214,102,0.18)',
  text: '#F6F7FB',
  textSecondary: '#A7B0C0',
  textMuted: '#667085',
  gold: '#D4A24F',
  goldBright: '#F0C86E',
  goldDeep: '#8C6423',
  goldGlow: 'rgba(212,162,79,0.28)',
  success: '#52D69A',
  successMuted: 'rgba(82,214,154,0.14)',
  danger: '#FF7B7B',
  dangerMuted: 'rgba(255,123,123,0.14)',
  whiteOverlay: 'rgba(255,255,255,0.04)',
} as const;

export const vowExamples: string[] = [
  'Wake up before 7 every weekday',
  'Go to the gym 3x this week',
  'Read every night before bed',
  'No takeout all week',
];

export const stakeAmounts: number[] = [10, 25, 50, 100];

export type ConsequenceType = 'charity' | 'witness' | 'anti';

export interface ConsequenceOption {
  id: ConsequenceType;
  label: string;
  description: string;
}

export const consequenceOptions: ConsequenceOption[] = [
  {
    id: 'charity',
    label: 'A cause you believe in',
    description: 'Your money does some good.',
  },
  {
    id: 'witness',
    label: 'Your witness gets it',
    description: 'They profit from your failure.',
  },
  {
    id: 'anti',
    label: 'A cause you dislike',
    description: 'Maximum pain. Maximum motivation.',
  },
];

export const charities: string[] = [
  'ALS Association',
  'St. Jude Children\'s Hospital',
  'Ronald McDonald House',
  'Feeding America',
];

export const antiCauses: string[] = [
  'NRA',
  'Donald Trump',
  'Planned Parenthood',
  'Kamala Harris',
  'Ted Cruz',
];

export interface HistoryEntry {
  id: string;
  text: string;
  witness: string;
  amount: number;
  date: string;
  kept: boolean;
}

export const historyEntries: HistoryEntry[] = [
  {
    id: '1',
    text: 'Gym 3x this week',
    witness: 'Daniel',
    amount: 50,
    date: 'Mar 24 – Mar 30',
    kept: true,
  },
  {
    id: '2',
    text: 'Wake before 8am weekdays',
    witness: 'Daniel',
    amount: 50,
    date: 'Mar 17 – Mar 23',
    kept: false,
  },
  {
    id: '3',
    text: 'Send update by Friday',
    witness: 'Leo',
    amount: 25,
    date: 'Mar 10 – Mar 16',
    kept: true,
  },
];

export interface WitnessContact {
  id: string;
  name: string;
  initials: string;
  accent: string;
}

export const witnessContacts: WitnessContact[] = [
  { id: 'daniel', name: 'Daniel', initials: 'D', accent: '#4A6FA5' },
  { id: 'sarah', name: 'Sarah', initials: 'S', accent: '#6B8A5E' },
  { id: 'mike', name: 'Mike', initials: 'M', accent: '#8A6B5E' },
  { id: 'ava', name: 'Ava', initials: 'A', accent: '#7B5EA5' },
  { id: 'josh', name: 'Josh', initials: 'J', accent: '#A5845E' },
];

export const serifFont = Platform.select({
  ios: 'Georgia',
  web: 'Georgia, serif',
  default: undefined,
});

export function formalizeVow(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!]$/.test(normalized) ? normalized : `${normalized}.`;
}

export interface AnalysisResult {
  type: 'vague' | 'already_good' | 'needs_tweak';
  suggestions?: string[];
  sharperText?: string;
  delta?: string;
}

export function analyzeVow(input: string): AnalysisResult {
  const lowered = input.toLowerCase().trim();
  const vagueTerms = [
    'be better',
    'be more',
    'get my life',
    'be productive',
    'be healthier',
    'improve',
    'try harder',
    'work harder',
    'do more',
    'get fit',
  ];

  if (vagueTerms.some((term) => lowered.includes(term)) || lowered.split(' ').length < 3) {
    return {
      type: 'vague',
      suggestions: [
        'Work for 90 focused minutes on 4 days this week',
        'Go to the gym 3 times this week',
        'Read every night before bed this week',
      ],
    };
  }

  const alreadyGoodPattern = /wake.*before.*\d|gym.*\d.*(?:time|x)|no.*(?:phone|takeout|alcohol|sugar|social media|instagram|tiktok|junk|delivery|netflix|youtube|screen).*(?:week|all|every|tonight|in bed|before|after)|send.*by.*(?:fri|mon|tue|wed|thu|sat|sun)|read.*every.*(?:night|day|evening|morning)|read.*(?:night|day).*(?:in bed|before bed)|run.*(?:\d|every|daily)|meditate.*(?:every|daily|\d)/i;
  if (alreadyGoodPattern.test(lowered)) {
    return { type: 'already_good' };
  }

  if (/(every|all|this week|weekday|daily|each day|each night)/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  const sharperText = buildSharper(input);
  return {
    type: 'needs_tweak',
    sharperText,
    delta: getDelta(input, sharperText),
  };
}

export function isAlreadySharp(input: string): boolean {
  const result = analyzeVow(input);
  return result.type === 'already_good';
}

function buildSharper(input: string): string {
  const lowered = input.toLowerCase();
  const clean = formalizeVow(input).replace(/[.]$/, '');

  if (/read/.test(lowered) && !/every|week/.test(lowered)) {
    return `${clean}, every night this week.`;
  }

  if (/(gym|run|workout|train|exercise|jog)/.test(lowered) && !/week|sunday|times|x/.test(lowered)) {
    return `${clean} this week, by Sunday 8pm.`;
  }

  if (/no\s+/.test(lowered) && !/all week|week|every/.test(lowered)) {
    return `${clean}, all week through Sunday midnight.`;
  }

  if (/(send|ship|finish|submit|complete)/.test(lowered) && !/by|before/.test(lowered)) {
    return `${clean} by Friday at 5pm.`;
  }

  return `${clean}, this week.`;
}

function getDelta(original: string, sharpened: string): string {
  if (/this week|sunday|friday/i.test(sharpened) && !/this week|sunday|friday/i.test(original)) {
    return 'Added a weekly window so your witness knows when to settle.';
  }

  if (/every night|every weekday/i.test(sharpened) && !/every/i.test(original)) {
    return 'Made the cadence explicit so there is no ambiguity.';
  }

  return 'Tightened the language so your witness can settle it cleanly.';
}

export function getVowDates(): { range: string; verdictLabel: string; endLabel: string } {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  const formatShort = (date: Date): string =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const formatLong = (date: Date): string =>
    date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return {
    range: `${formatShort(start)} – ${formatShort(end)}`,
    verdictLabel: `Verdict on ${formatLong(end)}`,
    endLabel: formatLong(end),
  };
}

export interface VowNeeds {
  showFrequency: boolean;
  showDuration: boolean;
  autoDeadline: boolean;
  isNegation: boolean;
  isTimeBound: boolean;
  isDeadlineTask: boolean;
}

const DURATION_RELEVANT = /(gym|exercise|run|jog|read|meditate|study|practice|work|write|code|piano|guitar|yoga|stretch|walk|swim|bike|lift|train|workout)/i;

export function detectVowNeeds(input: string): VowNeeds {
  const lower = input.toLowerCase().trim();

  const isNegation = /^(no\s+|don't\s+|stop\s+|avoid\s+|quit\s+|cut\s+)/i.test(lower);
  const isTimeBound = /(wake|get up|sleep|bed|alarm|before\s+\d)/i.test(lower);
  const isDeadlineTask = /(send|submit|finish|complete|ship|launch|deliver)/i.test(lower);
  const hasFrequency = /\d+\s*(?:x|times?)/i.test(lower) || /(every\s+(?:day|weekday|night|morning)|daily)/i.test(lower);
  const hasDuration = /\d+\s*(?:min|minute|hour|hr)/i.test(lower) || /at\s+least\s+\d/i.test(lower);
  const hasDeadline = /(this\s+week|all\s+week|by\s+\w+day|through\s+sunday)/i.test(lower);
  const isDurationRelevant = DURATION_RELEVANT.test(lower);

  return {
    showFrequency: !isNegation && !isTimeBound && !isDeadlineTask && !hasFrequency,
    showDuration: !isNegation && !isTimeBound && !isDeadlineTask && !hasDuration && isDurationRelevant,
    autoDeadline: !hasDeadline,
    isNegation,
    isTimeBound,
    isDeadlineTask,
  };
}

export interface FrequencyOption {
  label: string;
  value: string;
}

export function getFrequencyOptions(input: string): FrequencyOption[] {
  const lower = input.toLowerCase();
  if (/(wake|get up|alarm|before\s+\d)/i.test(lower)) {
    return [
      { label: 'Every weekday', value: 'every weekday' },
      { label: 'Every day', value: 'every day' },
    ];
  }

  return [
    { label: '3x this week', value: '3 times this week' },
    { label: '4x this week', value: '4 times this week' },
    { label: '5x this week', value: '5 times this week' },
    { label: 'Daily', value: 'every day this week' },
  ];
}

export const durationOptions: FrequencyOption[] = [
  { label: 'No minimum', value: '' },
  { label: '20 min', value: '20 minutes' },
  { label: '30 min', value: '30 minutes' },
  { label: '45 min', value: '45 minutes' },
  { label: '60 min', value: '60 minutes' },
];

export function composeVow(
  base: string,
  frequency: string | null,
  duration: string | null,
  needs: VowNeeds,
): string {
  let clean = base.trim().replace(/[.!,]$/, '');
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  if (needs.isNegation) {
    return `${clean}, all week.`;
  }

  if (needs.isDeadlineTask) {
    return `${clean} by Friday.`;
  }

  const parts: string[] = [clean];

  if (duration && duration.length > 0) {
    parts.push(`for at least ${duration}`);
  }

  if (frequency) {
    parts.push(frequency);
  } else if (needs.autoDeadline) {
    parts.push('this week');
  }

  let result = parts.join(', ');
  if (!/[.!]$/.test(result)) {
    result += '.';
  }
  return result;
}

export interface Challenge {
  id: string;
  title: string;
  tagline: string;
  participants: number;
  totalStake: number;
  emoji: string;
}

export const upcomingChallenges: Challenge[] = [
  {
    id: 'dry-april',
    title: 'Dry April',
    tagline: '30 days. No exceptions. No "just one." Your wallet remembers even if you don\'t.',
    participants: 412,
    totalStake: 10300,
    emoji: '🍷',
  },
  {
    id: 'no-phone-bed',
    title: 'No phone in bed',
    tagline: 'Screen Time doesn\'t lie. Post yours at the end of the week or lose your money.',
    participants: 289,
    totalStake: 7225,
    emoji: '📱',
  },
  {
    id: '10k-steps',
    title: '10K steps every day',
    tagline: 'Your Health app is the witness. Seven days. No rest days. No excuses.',
    participants: 194,
    totalStake: 4850,
    emoji: '👟',
  },
  {
    id: 'wake-before-6',
    title: 'Wake up before 6am',
    tagline: 'Set the alarm. Actually get up. Screenshot or it didn\'t happen.',
    participants: 156,
    totalStake: 3900,
    emoji: '⏰',
  },
  {
    id: 'no-takeout',
    title: 'No takeout all week',
    tagline: 'Your bank statement is the proof. Cook like your money depends on it. Because it does.',
    participants: 127,
    totalStake: 3175,
    emoji: '🍳',
  },
  {
    id: 'cold-shower',
    title: 'Cold shower every morning',
    tagline: 'You won\'t die. You\'ll just wish you did. 7 days. Film it or you\'re lying.',
    participants: 84,
    totalStake: 2100,
    emoji: '🥶',
  },
  {
    id: 'no-social-work',
    title: 'No social media during work',
    tagline: '9 to 5, no scrolling. Screen Time reports due Friday. The feed will survive without you.',
    participants: 203,
    totalStake: 5075,
    emoji: '🚫',
  },
];
