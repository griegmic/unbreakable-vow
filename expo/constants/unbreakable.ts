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
  warmAmber: '#D4A24F',
  warmAmberMuted: 'rgba(212,162,79,0.14)',
  warmAmberBorder: 'rgba(212,162,79,0.24)',
  whiteOverlay: 'rgba(255,255,255,0.04)',
} as const;

export const vowExamples: string[] = [
  'Workout 3x this week',
  'Delete TikTok',
  'No alcohol 2 weeks',
  'No texting my ex',
];

export const stakeAmounts: number[] = [10, 25, 50, 100];

export type ConsequenceType = 'charity' | 'anti';

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
    id: 'anti',
    label: 'A cause you hate',
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
  type: 'vague' | 'already_good';
  suggestions?: string[];
}

function detectTimeFrame(input: string): string {
  const lower = input.toLowerCase();
  if (/this\s+month/i.test(lower)) return 'this month';
  if (/this\s+year/i.test(lower)) return 'this year';
  if (/this\s+quarter/i.test(lower)) return 'this quarter';
  return 'this week';
}

function applyTimeFrame(suggestions: string[], timeFrame: string): string[] {
  if (timeFrame === 'this week') return suggestions;
  return suggestions.map((s) => s.replace(/this week/gi, timeFrame).replace(/all week/gi, `all ${timeFrame.replace('this ', '')}`));
}

export function getContextualSuggestions(input: string): string[] {
  const lower = input.toLowerCase().trim();
  const tf = detectTimeFrame(input);

  if (/(walk|steps|hike)/i.test(lower)) {
    return applyTimeFrame([
      'Walk 10,000 steps every day this week',
      'Walk for 30 minutes, 5 days this week',
      'Walk 2 miles every morning this week',
    ], tf);
  }
  if (/(gym|exercise|workout|lift|train|yoga|stretch|swim|bike)/i.test(lower)) {
    return applyTimeFrame([
      'Go to the gym 3 times this week',
      'Do a 30-minute workout, 4 days this week',
      'Exercise for 45 minutes, 4 days this week',
    ], tf);
  }
  if (/(run|jog)/i.test(lower)) {
    return applyTimeFrame([
      'Run for 20 minutes, 4 days this week',
      'Run 2 miles, 3 times this week',
      'Run every morning this week',
    ], tf);
  }
  if (/(read|book)/i.test(lower)) {
    return applyTimeFrame([
      'Read for 30 minutes every night this week',
      'Read 50 pages every day this week',
      'Read one chapter every night before bed',
    ], tf);
  }
  if (/(eat|food|cook|takeout|diet|health|healthier)/i.test(lower)) {
    return applyTimeFrame([
      'No takeout all week',
      'Cook dinner at home every night this week',
      'No junk food or sugar all week',
    ], tf);
  }
  if (/(sleep|bed|wake|morning)/i.test(lower)) {
    return applyTimeFrame([
      'Be in bed by 10:30pm every night this week',
      'No screens after 9pm all week',
      'Wake up before 7am every weekday',
    ], tf);
  }
  if (/(productive|work|focus|study|learn)/i.test(lower)) {
    return applyTimeFrame([
      'Work for 90 focused minutes on 4 days this week',
      'No social media during work hours all week',
      'Complete 3 deep-work blocks this week',
    ], tf);
  }
  if (/(write|code|create)/i.test(lower)) {
    return applyTimeFrame([
      'Write for 60 minutes, 4 days this week',
      'Write 500 words every day this week',
      'Code for 90 minutes, 5 days this week',
    ], tf);
  }
  if (/(meditat|mindful)/i.test(lower)) {
    return applyTimeFrame([
      'Meditate for 10 minutes every morning this week',
      'Meditate every day this week',
      'Do 15 minutes of meditation, 5 days this week',
    ], tf);
  }
  if (/(phone|screen|social|scroll|instagram|tiktok)/i.test(lower)) {
    return applyTimeFrame([
      'No phone in bed all week',
      'Under 1 hour of screen time every day this week',
      'No social media all week',
    ], tf);
  }
  if (/(drink|alcohol|sober|beer|wine)/i.test(lower)) {
    return applyTimeFrame([
      'No alcohol all week',
      'No drinking on weeknights this week',
      'Only 2 drinks max all week',
    ], tf);
  }
  if (/(piano|guitar|music|instrument|practice)/i.test(lower)) {
    return applyTimeFrame([
      'Practice for 30 minutes, 5 days this week',
      'Practice for 20 minutes every day this week',
      'Do 3 focused practice sessions this week',
    ], tf);
  }

  return applyTimeFrame([
    'Work for 90 focused minutes on 4 days this week',
    'Go to the gym 3 times this week',
    'Read every night before bed this week',
  ], tf);
}

function normalizeWordNumbers(input: string): string {
  const map: Record<string, string> = {
    'one': '1', 'once': '1',
    'two': '2', 'twice': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
  };
  let result = input;
  for (const [word, digit] of Object.entries(map)) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
  }
  return result;
}

export function generateSuggestion(input: string): string {
  const lower = input.toLowerCase().trim();
  let clean = input.trim().replace(/[.!,]$/, '');
  clean = clean.charAt(0).toUpperCase() + clean.slice(1);

  const hasTimeWindow = /(this\s+(week|month|year)|all\s+(week|month)|every|daily)/i.test(lower);
  const hasDuration = /for\s+\d+\s+(?:days?|weeks?|months?)\b|\buntil\s+\w+/i.test(lower);
  const hasFrequency = /\d+\s*(?:x|times?)/i.test(normalizeWordNumbers(lower));
  const hasDeadline = /by\s+\w+day|by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|by\s+end/i.test(lower);

  // If vow already has a relative time reference, don't try to enhance it
  if (hasRelativeTime(lower)) return `${clean}.`;

  // If vow already has a duration ("for 30 days", "until May"), don't append time window
  if (hasDuration) return `${clean}.`;

  // If vow already has a "by [day]" or "by [month]" deadline, don't append time window
  if (hasDeadline) return `${clean}.`;

  if (hasTimeWindow && hasFrequency) return `${clean}.`;

  if (/(send|submit|finish|complete|ship|launch)/i.test(lower) && !hasDeadline) {
    return `${clean} by Friday at 5pm.`;
  }

  if (/(walk|steps|hike)/i.test(lower)) {
    if (!hasFrequency && !hasTimeWindow) return `${clean} 10,000 steps every day this week.`;
    if (!hasTimeWindow) return `${clean}, this week.`;
    return `${clean}.`;
  }

  if (/(gym|exercise|workout|lift|train|yoga|stretch|swim|bike)/i.test(lower)) {
    if (!hasFrequency && !hasTimeWindow) return `${clean} 3 times this week.`;
    if (!hasTimeWindow) return `${clean}, this week.`;
    return `${clean}.`;
  }

  if (/(run|jog)/i.test(lower)) {
    if (!hasFrequency && !hasTimeWindow) return `${clean} 3 times this week.`;
    if (!hasTimeWindow) return `${clean}, this week.`;
    return `${clean}.`;
  }

  if (/(read|book)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean} every night this week.`;
    return `${clean}.`;
  }

  if (/(meditat|mindful)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean} every morning this week.`;
    return `${clean}.`;
  }

  if (/(write|code|create)/i.test(lower)) {
    if (!hasFrequency && !hasTimeWindow) return `${clean} for 60 minutes, 4 days this week.`;
    if (!hasTimeWindow) return `${clean}, this week.`;
    return `${clean}.`;
  }

  if (/(study|learn|practice)/i.test(lower)) {
    if (!hasFrequency && !hasTimeWindow) return `${clean} for 45 minutes, 4 days this week.`;
    if (!hasTimeWindow) return `${clean}, this week.`;
    return `${clean}.`;
  }

  if (/(eat|food|cook|takeout|diet|health)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean}, all week.`;
    return `${clean}.`;
  }

  if (/(drink|alcohol|sober|beer|wine)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean}, all week.`;
    return `${clean}.`;
  }

  if (/(phone|screen|social|scroll|instagram|tiktok)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean}, all week.`;
    return `${clean}.`;
  }

  if (/(sleep|bed|wake|morning)/i.test(lower)) {
    if (!hasTimeWindow) return `${clean} every weekday.`;
    return `${clean}.`;
  }

  if (!hasTimeWindow) return `${clean}, this week.`;
  return `${clean}.`;
}

function hasRelativeTime(input: string): boolean {
  return /(tomorrow|tonight|today|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight)|this\s+(morning|afternoon|evening|weekend|friday|saturday|sunday|monday|tuesday|wednesday|thursday)|next\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|in\s+the\s+(morning|afternoon|evening)|before\s+(bed|work|lunch|dinner|noon|midnight|class|school)|after\s+(work|lunch|dinner|class|school)|(?:by\s+)?end\s+of\s+(?:the\s+)?week)/i.test(input);
}

function hasActionVerb(input: string): boolean {
  return /(go\s+to|get|grab|take|return|bring|find|ask|talk|meet|attend|check|fix|replace|install|remove|eat|drink|try|wake|run|walk|read|write|code|cook|call|send|finish|complete|submit|clean|study|practice|meditate|exercise|work\s+out|lift|swim|bike|jog|stretch|do\s+a|make\s+a|no\s+|don't|stop|avoid|quit|book|buy|pay|sign\s+up|register|schedule|apply|cancel|start|launch|ship|publish|post|upload|delete|move|file|hire|fire|close|open|set\s+up|plan|organize|confirm|order|deliver|pick\s+up|drop\s+off)/i.test(input);
}

export function analyzeVow(input: string): AnalysisResult {
  const normalized = normalizeWordNumbers(input);
  const lowered = normalized.toLowerCase().trim();
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

  const hasVagueTerm = vagueTerms.some((term) => lowered.includes(term));
  const tooShort = lowered.split(' ').length < 3;

  const hasVagueAction = /(more|less|better|some|a bit|a little|a few)\s+(\w+)/i.test(lowered)
    && !/\d+/.test(lowered)
    && !/(no\s+|don't\s+|stop\s+|avoid\s+|quit\s+)/i.test(lowered);

  const hasNoMeasurable = !/(\d+|every|all\s+week|all\s+month|daily|no\s+|don't|stop|avoid|quit|before\s+\d|by\s+\w+day|by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|by\s+end)/i.test(lowered);

  const originalLower = input.toLowerCase().trim();

  if (hasVagueTerm || tooShort) {
    return {
      type: 'vague',
      suggestions: getContextualSuggestions(input),
    };
  }

  if (hasVagueAction && hasNoMeasurable) {
    return {
      type: 'vague',
      suggestions: getContextualSuggestions(input),
    };
  }

  // Action + relative time reference = good enough (e.g. "go to the gym tomorrow morning")
  if (hasActionVerb(lowered) && hasRelativeTime(lowered)) {
    return { type: 'already_good' };
  }

  const alreadyGoodPattern = /wake.*before.*\d|gym.*\d.*(?:time|x)|no.*(?:phone|takeout|alcohol|sugar|social media|instagram|tiktok|junk|delivery|netflix|youtube|screen).*(?:week|month|all|every|tonight|in bed|before|after|for\s+\d|until)|send.*by.*(?:fri|mon|tue|wed|thu|sat|sun)|(?:ship|launch|deploy|build).*by.*(?:fri|mon|tue|wed|thu|sat|sun)|read.*every.*(?:night|day|evening|morning)|read.*(?:night|day).*(?:in bed|before bed)|run.*(?:\d|every|daily)|meditate.*(?:every|daily|\d)/i;
  if (alreadyGoodPattern.test(lowered)) {
    return { type: 'already_good' };
  }

  if (hasExplicitDate(originalLower)) {
    return { type: 'already_good' };
  }

  if (/\d+\s*(?:x|times?)/i.test(lowered) && /(this\s+(?:week|month|year))/i.test(lowered)) {
    return { type: 'already_good' };
  }

  if (/\d+/.test(lowered) && /(this\s+(?:week|month|year)|every\s+(?:day|night|morning|weekday))/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  if (/(every|all|this\s+week|this\s+month|this\s+year|weekday|daily|each day|each night)/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  // Action verb + "by [day name]" = good enough
  if (/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  // "for N days/weeks/months" duration pattern
  if (/for\s+\d+\s+(?:days?|weeks?|months?)\b/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  // "until [date/word]" pattern
  if (/\buntil\s+\w+/i.test(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  // "end of [month]" pattern
  if (/end\s+of\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lowered)) {
    return { type: 'already_good' };
  }

  return {
    type: 'vague',
    suggestions: getContextualSuggestions(input),
  };
}

export function hasExplicitDate(input: string): boolean {
  const lower = input.toLowerCase();
  const MONTH_NAMES = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const monthWithDay = new RegExp(`(${MONTH_NAMES})\\s+\\d{1,2}`, 'i');
  const byMonth = new RegExp(`by\\s+(?:end\\s+of\\s+)?(?:the\\s+)?(?:${MONTH_NAMES})(?:\\s+\\d{1,2})?`, 'i');
  const endOfPattern = /(?:by\s+)?end\s+of\s+(?:the\s+)?(?:this\s+)?(?:month|year|quarter|semester)/i;
  const endOfMonthName = new RegExp(`(?:by\\s+)?end\\s+of\\s+(?:${MONTH_NAMES})`, 'i');
  const slashDate = /by\s+\d{1,2}\/\d{1,2}/i;
  return monthWithDay.test(lower) || byMonth.test(lower) || endOfPattern.test(lower) || endOfMonthName.test(lower) || slashDate.test(lower);
}

export function extractDeadlineDate(input: string): string | null {
  const lower = input.toLowerCase();
  const monthNames: Record<string, string> = {
    jan: 'January', january: 'January',
    feb: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December',
  };

  const monthMatch = lower.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})/i);
  if (monthMatch) {
    const month = monthNames[monthMatch[1].toLowerCase()] ?? monthMatch[1];
    const day = parseInt(monthMatch[2], 10);
    return `${month} ${day}`;
  }

  if (/end\s+of\s+(this\s+)?month/i.test(lower)) {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  return null;
}

export function inferDeadline(input: string): Date | null {
  const lower = input.toLowerCase();
  const now = new Date();

  if (/\btonight\b|\btoday\b/.test(lower)) {
    const d = new Date(now);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const thisDayMatch = lower.match(/this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (thisDayMatch) {
    const target = dayNames.indexOf(thisDayMatch[1].toLowerCase());
    const d = new Date(now);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (nextDayMatch) {
    const target = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    const d = new Date(now);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff + 7);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  // "by Friday", "by Monday" etc (without "this" or "next" prefix)
  const byDayMatch = lower.match(/by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (byDayMatch) {
    const target = dayNames.indexOf(byDayMatch[1].toLowerCase());
    const d = new Date(now);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  if (/\bthis\s+weekend\b/.test(lower)) {
    const d = new Date(now);
    const diff = 7 - d.getDay(); // days until Sunday
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    d.setHours(23, 59, 59, 0);
    return d;
  }
  if (/\bthis\s+week\b|\ball\s+week\b|\beveryday\b|\bevery\s+day\b|\bdaily\b|\bevery\s+weekday\b|\bevery\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lower)) {
    const d = new Date(now);
    const diff = 7 - d.getDay();
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    d.setHours(23, 59, 59, 0);
    return d;
  }
  if (/\bthis\s+month\b|\ball\s+month\b/.test(lower)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  // "for N days/weeks/months" patterns
  const forDaysMatch = lower.match(/for\s+(\d+)\s+days?\b/);
  if (forDaysMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(forDaysMatch[1], 10));
    d.setHours(23, 59, 59, 0);
    return d;
  }
  const forWeeksMatch = lower.match(/for\s+(\d+)\s+weeks?\b/);
  if (forWeeksMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(forWeeksMatch[1], 10) * 7);
    d.setHours(23, 59, 59, 0);
    return d;
  }
  const forMonthsMatch = lower.match(/for\s+(\d+)\s+months?\b/);
  if (forMonthsMatch) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + parseInt(forMonthsMatch[1], 10));
    d.setHours(23, 59, 59, 0);
    return d;
  }
  // "end of [month name]"
  const endOfMonthMatch = lower.match(/end\s+of\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
  if (endOfMonthMatch) {
    const monthNames: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11,
    };
    const monthIdx = monthNames[endOfMonthMatch[1].toLowerCase()];
    if (monthIdx !== undefined) {
      let year = now.getFullYear();
      if (monthIdx < now.getMonth()) year++;
      const d = new Date(year, monthIdx + 1, 0);
      d.setHours(23, 59, 59, 0);
      return d;
    }
  }
  // "until [month name]" — deadline is the 1st of that month
  const untilMonthMatch = lower.match(/until\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)/i);
  if (untilMonthMatch) {
    const monthNames: Record<string, number> = {
      jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
      apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
      aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
      nov: 10, november: 10, dec: 11, december: 11,
    };
    const monthIdx = monthNames[untilMonthMatch[1].toLowerCase()];
    if (monthIdx !== undefined) {
      let year = now.getFullYear();
      if (monthIdx <= now.getMonth()) year++;
      const d = new Date(year, monthIdx, 1);
      d.setHours(23, 59, 59, 0);
      return d;
    }
  }
  const explicitDate = extractDeadlineDate(lower);
  if (explicitDate) {
    const parsed = new Date(`${explicitDate}, ${now.getFullYear()}`);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(23, 59, 59, 0);
      if (parsed < now) parsed.setFullYear(parsed.getFullYear() + 1);
      return parsed;
    }
  }
  return null;
}

export function getVowVerdictDate(input: string): { verdictLabel: string; endLabel: string; range: string; isCustomDate: boolean } {
  const deadlineDate = extractDeadlineDate(input);
  if (deadlineDate) {
    const start = new Date();
    const formatShort = (date: Date): string =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      verdictLabel: `Verdict on ${deadlineDate}`,
      endLabel: deadlineDate,
      range: `${formatShort(start)} \u2013 ${deadlineDate}`,
      isCustomDate: true,
    };
  }
  const dates = getVowDates();
  return { ...dates, isCustomDate: false };
}

export function isAlreadySharp(input: string): boolean {
  const result = analyzeVow(input);
  return result.type === 'already_good';
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
  const isCompletionTask = /(send|submit|finish|complete|ship|launch|deliver)/i.test(lower);
  const isDeadlineTask = isCompletionTask && !hasExplicitDate(lower);
  const hasFrequency = /\d+\s*(?:x|times?)/i.test(lower)
    || /(every\s+(?:day|weekday|night|morning)|daily)/i.test(lower)
    || /(three|four|five|six|seven)\s+times/i.test(lower);
  const hasDuration = /\d+\s*(?:min|minute|hour|hr)/i.test(lower) || /at\s+least\s+\d/i.test(lower);
  const hasDeadline = /(this\s+week|this\s+month|this\s+year|this\s+quarter|all\s+week|all\s+month|by\s+\w+day|through\s+sunday)/i.test(lower) || hasExplicitDate(lower);
  const isDurationRelevant = DURATION_RELEVANT.test(lower);
  const hasNumericQuantity = /(?:\d+[,.]?\d*k?|\d{1,3}(?:,\d{3})+)\s*(?:steps|miles?|km|kilometers?|pages?|reps|pushups?|pullups?|situps?|laps?|words|oz|glasses|cups|liters?)/i.test(lower);
  const hasVerbalQuantity = /(?:a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:mile|km|kilometer|lap|chapter|book|page|rep|set|round|block|hour|song|piece|essay|article)/i.test(lower);
  const hasImplicitMeasure = /(?:finish|complete|ship|submit|launch|deliver|build|read|write)\s+(?:a|one|the|my)\s+\w+/i.test(lower) && hasExplicitDate(lower);
  const hasQuantity = hasNumericQuantity || hasVerbalQuantity || hasImplicitMeasure;

  return {
    showFrequency: !isNegation && !isTimeBound && !isDeadlineTask && !isCompletionTask && !hasFrequency,
    showDuration: !isNegation && !isTimeBound && !isDeadlineTask && !isCompletionTask && !hasDuration && isDurationRelevant && !hasQuantity,
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

  const tf = detectTimeFrame(input);
  return [
    { label: `3x ${tf}`, value: `3 times ${tf}` },
    { label: `4x ${tf}`, value: `4 times ${tf}` },
    { label: `5x ${tf}`, value: `5 times ${tf}` },
    { label: 'Daily', value: `every day ${tf}` },
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
    if (/(all\s+(week|month)|every|this\s+(week|month|year))/i.test(clean)) {
      return `${clean}.`;
    }
    return `${clean}, all week.`;
  }

  if (needs.isDeadlineTask) {
    if (/by\s+(mon|tue|wed|thu|fri|sat|sun)/i.test(clean)) {
      return `${clean}.`;
    }
    return `${clean} by Friday.`;
  }

  const timeWindowPattern = /\s*(,\s*)?(this\s+(?:week|month|year|quarter))/i;
  const hasTimeWindow = timeWindowPattern.test(clean);

  if (frequency) {
    if (hasTimeWindow) {
      const freqCore = frequency.replace(/\s*this\s+(?:week|month|year|quarter)/i, '').trim();
      if (freqCore) {
        clean = clean.replace(timeWindowPattern, (_match, comma, tw) => ` ${freqCore} ${tw}`);
      }
    } else {
      clean = `${clean}, ${frequency}`;
    }
  } else if (needs.autoDeadline) {
    if (!hasTimeWindow && !/(all\s+(week|month)|by\s+)/i.test(clean) && !hasExplicitDate(clean.toLowerCase())) {
      clean = `${clean}, this week`;
    }
  }

  if (duration && duration.length > 0) {
    clean = `${clean}, for at least ${duration}`;
  }

  if (!/[.!]$/.test(clean)) {
    clean += '.';
  }
  return clean;
}

export interface Challenge {
  id: string;
  title: string;
  tagline: string;
  participants: number;
  totalStake: number;
  emoji: string;
}

export const vowNudges: string[] = [
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be extreme, just consistent.",
  "The pain of discipline weighs ounces. The pain of regret weighs tons.",
  "Small daily improvements are the key to staggering long-term results.",
  "You're not just doing this for you. Someone's watching.",
  "The best time to start was yesterday. The second best time is now.",
  "A vow isn't a wish. It's a contract with yourself.",
  "Show up today. Tomorrow's you will thank you.",
  "Motivation gets you started. Commitment keeps you going.",
  "Every day you keep your word, you become harder to break.",
];

export function getRandomNudge(seed?: number): string {
  const idx = seed !== undefined ? seed % vowNudges.length : Math.floor(Math.random() * vowNudges.length);
  return vowNudges[idx];
}

export function getDailyNudge(): string {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return getRandomNudge(seed);
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
