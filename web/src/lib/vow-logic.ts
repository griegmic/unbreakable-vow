export const vowExamples: string[] = [
  'Wake up before 7 every weekday',
  'Go to the gym 3x this week',
  'Read every night before bed',
  'No takeout all week',
  'No texting my ex for 30 days',
];

export const stakeAmounts: number[] = [10, 25, 50, 100];

export type ConsequenceType = 'charity' | 'anti';

export interface ConsequenceOption {
  id: ConsequenceType;
  label: string;
  description: string;
}

export const consequenceOptions: ConsequenceOption[] = [
  { id: 'charity', label: 'A cause you believe in', description: 'Your money does some good.' },
  { id: 'anti', label: 'A cause you hate', description: 'Maximum pain. Maximum motivation.' },
];

export const charities: string[] = [
  'ALS Association',
  "St. Jude Children's Hospital",
  'Ronald McDonald House',
  'Feeding America',
];

export const antiCauses: string[] = [
  'NRA',
  'PETA',
];

export function formalizeVow(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
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
  return suggestions.map((s) =>
    s.replace(/this week/gi, timeFrame).replace(/all week/gi, `all ${timeFrame.replace('this ', '')}`)
  );
}

export function getContextualSuggestions(input: string): string[] {
  const lower = input.toLowerCase().trim();
  const tf = detectTimeFrame(input);

  if (/(walk|steps|hike)/i.test(lower)) {
    return applyTimeFrame(['Walk 10,000 steps every day this week', 'Walk for 30 minutes, 5 days this week', 'Walk 2 miles every morning this week'], tf);
  }
  if (/(gym|exercise|workout|lift|train|yoga|stretch|swim|bike)/i.test(lower)) {
    return applyTimeFrame(['Go to the gym 3 times this week', 'Do a 30-minute workout, 4 days this week', 'Exercise for 45 minutes, 4 days this week'], tf);
  }
  if (/(run|jog)/i.test(lower)) {
    return applyTimeFrame(['Run for 20 minutes, 4 days this week', 'Run 2 miles, 3 times this week', 'Run every morning this week'], tf);
  }
  if (/\bread\b/i.test(lower) && !/\bbook\b/i.test(lower)) {
    return applyTimeFrame(['Read for 30 minutes every night this week', 'Read 50 pages every day this week', 'Read one chapter every night before bed'], tf);
  }
  if (/(eat|food|cook|takeout|diet|health|healthier)/i.test(lower)) {
    return applyTimeFrame(['No takeout all week', 'Cook dinner at home every night this week', 'No junk food or sugar all week'], tf);
  }
  if (/(sleep|bed|wake|morning)/i.test(lower)) {
    return applyTimeFrame(['Be in bed by 10:30pm every night this week', 'No screens after 9pm all week', 'Wake up before 7am every weekday'], tf);
  }
  if (/(productive|work|focus|study|learn)/i.test(lower)) {
    return applyTimeFrame(['Work for 90 focused minutes on 4 days this week', 'No social media during work hours all week', 'Complete 3 deep-work blocks this week'], tf);
  }
  if (/(write|code|create)/i.test(lower)) {
    return applyTimeFrame(['Write for 60 minutes, 4 days this week', 'Write 500 words every day this week', 'Code for 90 minutes, 5 days this week'], tf);
  }
  if (/(meditat|mindful)/i.test(lower)) {
    return applyTimeFrame(['Meditate for 10 minutes every morning this week', 'Meditate every day this week', 'Do 15 minutes of meditation, 5 days this week'], tf);
  }
  if (/(phone|screen|social|scroll|instagram|tiktok)/i.test(lower)) {
    return applyTimeFrame(['No phone in bed all week', 'Under 1 hour of screen time every day this week', 'No social media all week'], tf);
  }
  if (/(drink|alcohol|sober|beer|wine)/i.test(lower)) {
    return applyTimeFrame(['No alcohol all week', 'No drinking on weeknights this week', 'Only 2 drinks max all week'], tf);
  }
  if (/(piano|guitar|music|instrument|practice)/i.test(lower)) {
    return applyTimeFrame(['Practice for 30 minutes, 5 days this week', 'Practice for 20 minutes every day this week', 'Do 3 focused practice sessions this week'], tf);
  }

  return applyTimeFrame(['Work for 90 focused minutes on 4 days this week', 'Go to the gym 3 times this week', 'Read every night before bed this week'], tf);
}

function normalizeWordNumbers(input: string): string {
  const map: Record<string, string> = {
    one: '1', once: '1', two: '2', twice: '2', three: '3',
    four: '4', five: '5', six: '6', seven: '7',
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
  const hasFrequency = /\d+\s*(?:x|times?)/i.test(normalizeWordNumbers(lower));
  const hasDeadline = /by\s+\w+day|by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(?:by\s+)?end\s+of\s+(?:the\s+)?(?:this\s+)?(?:week|month|year|quarter)/i.test(lower);

  // If vow already has a relative time reference, don't try to enhance it
  if (hasRelativeTime(lower)) return `${clean}.`;

  if (hasTimeWindow && hasFrequency) return `${clean}.`;
  if (hasTimeWindow && hasDeadline) return `${clean}.`;
  if (hasDeadline) return `${clean}.`;

  if (/(send|submit|finish|complete|ship|launch|book|buy|pay|sign\s+up|register|schedule|apply|cancel|hire|file|confirm|order|plan|organize)/i.test(lower) && !hasDeadline && !hasTimeWindow) return `${clean} by Friday at 5pm.`;

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
  if (/\bread\b/i.test(lower) && !/\bbook\b/i.test(lower)) {
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
  const vagueTerms = ['be better', 'be more', 'get my life', 'be productive', 'be healthier', 'improve', 'try harder', 'work harder', 'do more', 'get fit'];

  const hasVagueTerm = vagueTerms.some((term) => lowered.includes(term));
  const tooShort = lowered.split(' ').length < 3;

  const hasVagueAction = /(more|less|better|some|a bit|a little|a few)\s+(\w+)/i.test(lowered)
    && !/\d+/.test(lowered)
    && !/(no\s+|don't\s+|stop\s+|avoid\s+|quit\s+)/i.test(lowered);
  const hasNoMeasurable = !/(\d+|every|all\s+week|all\s+month|daily|no\s+|don't|stop|avoid|quit|before\s+\d|by\s+\w+day|by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(?:by\s+)?end\s+of)/i.test(lowered);

  // Reject explicitly vague or too-short vows first
  if (hasVagueTerm || tooShort) {
    return { type: 'vague', suggestions: getContextualSuggestions(input) };
  }
  if (hasVagueAction && hasNoMeasurable) {
    return { type: 'vague', suggestions: getContextualSuggestions(input) };
  }

  // If vow has a clear action verb and is long enough, accept it —
  // the app has a separate date picker that adds the deadline.
  if (hasActionVerb(lowered) && lowered.split(' ').length >= 4) {
    return { type: 'already_good' };
  }

  // Action + relative time reference = good enough (e.g. "go to the gym tomorrow morning")
  if (hasActionVerb(lowered) && hasRelativeTime(lowered)) return { type: 'already_good' };

  const alreadyGoodPattern = /wake.*before.*\d|gym.*\d.*(?:time|x)|no.*(?:phone|takeout|alcohol|sugar|social media|instagram|tiktok|junk|delivery|netflix|youtube|screen).*(?:week|month|all|every|tonight|in bed|before|after)|send.*by.*(?:fri|mon|tue|wed|thu|sat|sun)|read.*every.*(?:night|day|evening|morning)|read.*(?:night|day).*(?:in bed|before bed)|run.*(?:\d|every|daily)|meditate.*(?:every|daily|\d)/i;
  if (alreadyGoodPattern.test(lowered)) return { type: 'already_good' };
  if (hasExplicitDate(input.toLowerCase())) return { type: 'already_good' };
  if (/\d+\s*(?:x|times?)/i.test(lowered) && /(this\s+(?:week|month|year))/i.test(lowered)) return { type: 'already_good' };
  if (/\d+/.test(lowered) && /(this\s+(?:week|month|year)|every\s+(?:day|night|morning|weekday))/i.test(lowered) && lowered.split(' ').length >= 4) return { type: 'already_good' };
  if (/(every|all|this\s+week|this\s+month|this\s+year|weekday|daily|each day|each night)/i.test(lowered) && lowered.split(' ').length >= 4) return { type: 'already_good' };

  return { type: 'vague', suggestions: getContextualSuggestions(input) };
}

export function hasExplicitDate(input: string): boolean {
  const lower = input.toLowerCase();
  const MONTH_NAMES = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const monthWithDay = new RegExp(`(${MONTH_NAMES})\\s+\\d{1,2}`, 'i');
  const byMonth = new RegExp(`by\\s+(?:end\\s+of\\s+)?(?:the\\s+)?(?:${MONTH_NAMES})(?:\\s+\\d{1,2})?`, 'i');
  const endOfPattern = /(?:by\s+)?end\s+of\s+(?:the\s+)?(?:this\s+)?(?:week|month|year|quarter|semester)/i;
  const endOfMonthName = new RegExp(`(?:by\\s+)?end\\s+of\\s+(?:${MONTH_NAMES})`, 'i');
  const slashDate = /by\s+\d{1,2}\/\d{1,2}/i;
  return monthWithDay.test(lower) || byMonth.test(lower) || endOfPattern.test(lower) || endOfMonthName.test(lower) || slashDate.test(lower);
}

export function extractDeadlineDate(input: string): string | null {
  const lower = input.toLowerCase();
  const monthNames: Record<string, string> = {
    jan: 'January', january: 'January', feb: 'February', february: 'February',
    mar: 'March', march: 'March', apr: 'April', april: 'April', may: 'May',
    jun: 'June', june: 'June', jul: 'July', july: 'July', aug: 'August', august: 'August',
    sep: 'September', september: 'September', oct: 'October', october: 'October',
    nov: 'November', november: 'November', dec: 'December', december: 'December',
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

export function getVowVerdictDate(input: string, deadlineIso?: string | null): { verdictLabel: string; endLabel: string; range: string; isCustomDate: boolean } {
  const formatShort = (date: Date): string => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatLong = (date: Date): string => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // 1. Use explicit deadline from flow state (most authoritative)
  if (deadlineIso) {
    const end = new Date(deadlineIso);
    if (!isNaN(end.getTime())) {
      const start = new Date();
      return { verdictLabel: `Verdict on ${formatLong(end)}`, endLabel: formatLong(end), range: `${formatShort(start)} \u2013 ${formatShort(end)}`, isCustomDate: true };
    }
  }

  // 2. Try to extract from vow text
  const deadlineDate = extractDeadlineDate(input);
  if (deadlineDate) {
    const start = new Date();
    const parsed = new Date(`${deadlineDate}, ${start.getFullYear()}`);
    if (!isNaN(parsed.getTime())) {
      return { verdictLabel: `Verdict on ${formatLong(parsed)}`, endLabel: formatLong(parsed), range: `${formatShort(start)} \u2013 ${formatShort(parsed)}`, isCustomDate: true };
    }
    return { verdictLabel: `Verdict on ${deadlineDate}`, endLabel: deadlineDate, range: `${formatShort(start)} \u2013 ${deadlineDate}`, isCustomDate: true };
  }

  // 3. Default to 7-day window
  const dates = getVowDates();
  return { ...dates, isCustomDate: false };
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

export function getDailyNudge(): string {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return vowNudges[seed % vowNudges.length];
}

/**
 * Attempts to infer an end date from vow text. Returns null if uncertain.
 * "tomorrow morning" → tomorrow 11:59pm
 * "this Friday" → this Friday 11:59pm
 * "this week" / "all week" → Sunday 11:59pm
 * "this weekend" → Sunday 11:59pm
 * "next Monday" → next Monday 11:59pm
 * "tonight" / "today" → today 11:59pm
 */
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
  const nextDayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);

  if (thisDayMatch) {
    const target = dayNames.indexOf(thisDayMatch[1].toLowerCase());
    const d = new Date(now);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    d.setHours(23, 59, 59, 0);
    return d;
  }

  if (nextDayMatch) {
    const target = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    const d = new Date(now);
    let diff = target - d.getDay();
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff + 7);
    d.setHours(23, 59, 59, 0);
    return d;
  }

  if (/\bthis\s+weekend\b/.test(lower)) {
    const d = new Date(now);
    const diff = 7 - d.getDay();
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    d.setHours(23, 59, 59, 0);
    return d;
  }

  if (/\bthis\s+week\b|\ball\s+week\b|\beveryday\b|\bevery\s+day\b|\beveryday\b/.test(lower)) {
    const d = new Date(now);
    const diff = 7 - d.getDay();
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    d.setHours(23, 59, 59, 0);
    return d;
  }

  if (/\bnext\s+week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 14 - d.getDay());
    d.setHours(23, 59, 59, 0);
    return d;
  }

  if (/\bthis\s+month\b|\ball\s+month\b/.test(lower)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 0);
    return d;
  }

  // Check explicit dates (e.g. "by April 15")
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

export function getVowDates(): { range: string; verdictLabel: string; endLabel: string } {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const formatShort = (date: Date): string => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const formatLong = (date: Date): string => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return { range: `${formatShort(start)} – ${formatShort(end)}`, verdictLabel: `Verdict on ${formatLong(end)}`, endLabel: formatLong(end) };
}
