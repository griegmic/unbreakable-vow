export const UNBREAKABLE_VOW_ORIGIN = 'https://unbreakablevow.app';

export function getWitnessUrl(token?: string | null): string {
  const clean = typeof token === 'string' ? token.trim() : '';
  return clean ? `${UNBREAKABLE_VOW_ORIGIN}/w/${encodeURIComponent(clean)}` : '';
}

export function displayWitnessUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
