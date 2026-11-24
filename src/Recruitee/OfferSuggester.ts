import { ACTIVE_OFFER_STATUSES, RecruiteeOffer } from './RecruiteeOffer';

export interface OfferSuggestion {
  id: number;
  title: string;
  score: number;
}

const NOISE_WORDS = ['m', 'f', 'd', 'x', 'z', 'a', 'the', 'and', 'for', 'pro', 'na'];

const tokens = (text: string): string[] =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !NOISE_WORDS.includes(t));

const similarity = (a: string, b: string): number => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.length === 0 || tb.length === 0) {
    return 0;
  }
  const shared = ta.filter((t) => tb.includes(t)).length;
  const union = new Set([...ta, ...tb]).size;
  const ja = ta.join(' ');
  const jb = tb.join(' ');
  const contains = ja.length >= 3 && jb.length >= 3 && (ja.includes(jb) || jb.includes(ja));
  return shared / union + (contains ? 0.3 : 0);
};

/**
 * Finds the active Recruitee offers that look most like the given texts.
 * Used only to help a human fix a broken mapping; it never assigns a candidate.
 */
export const suggestOffers = (texts: (string | null | undefined)[], offers: RecruiteeOffer[], max = 3): OfferSuggestion[] => {
  const wanted = texts.filter((t): t is string => typeof t === 'string' && t.trim() !== '');
  return offers
    .filter((offer) => !offer.status || ACTIVE_OFFER_STATUSES.includes(offer.status))
    .map((offer) => {
      const haystack = [offer.title, (offer.slug || '').replace(/-/g, ' '), ...(offer.offer_tags || [])];
      const score = Math.max(0, ...wanted.flatMap((w) => haystack.map((h) => similarity(w, h || ''))));
      return { id: offer.id, title: offer.title, score };
    })
    .filter((s) => s.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
};

export const formatSuggestions = (suggestions: { id: number; title: string }[]): string =>
  suggestions.map((s) => `${s.title} (ID ${s.id})`).join(', ');
