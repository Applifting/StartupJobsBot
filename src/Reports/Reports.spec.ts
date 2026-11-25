import { DailySlot, localParts, workingDaysSince } from './schedule';
import { OfferCheck } from './OfferCheck';
import { FallbackPoolReminder } from './FallbackPoolReminder';
import { formatWeeklySummary } from './WeeklySummary';
import { MockRecruiteeClient } from '../TestUtils/MockRecruiteeClient';
import { OfferResolver } from '../Recruitee/OfferResolver';
import { suggestOffers } from '../Recruitee/OfferSuggester';
import { IStartupJobsApiClient, StartupJobsOffer } from '../StartupJobs/StartupJobsApiClient';
import { RecruiteeOffer } from '../Recruitee/RecruiteeOffer';
import { ReconcileReport } from '../Reconciler/Reconciler';

const TZ = 'Europe/Prague';
const offers: RecruiteeOffer[] = [
  { id: 101, title: 'Product Manager', slug: 'product-manager', offer_tags: ['pm'], status: 'published' },
  { id: 102, title: 'QA Engineer', slug: 'qa-engineer', offer_tags: ['qa'], status: 'published' },
  { id: 103, title: 'Product developer', slug: 'senior-product-developer', offer_tags: ['product'], status: 'archived' },
];

describe('schedule', () => {
  it('reads local time in the given zone', () => {
    // 07:30 UTC is 08:30 in Prague in winter
    expect(localParts(new Date('2026-11-23T07:30:00Z'), TZ)).toEqual({ date: '2026-11-23', hour: 8, weekday: 'Mon' });
  });

  it('fires once per day inside its hour', () => {
    const slot = new DailySlot(8, TZ);
    expect(slot.due(new Date('2026-11-23T06:59:00Z'))).toBe(false);
    expect(slot.due(new Date('2026-11-23T07:00:00Z'))).toBe(true);
    expect(slot.due(new Date('2026-11-23T07:30:00Z'))).toBe(false);
    expect(slot.due(new Date('2026-11-24T07:01:00Z'))).toBe(true);
  });

  it('respects the weekday and the off switch', () => {
    const monday = new DailySlot(9, TZ, 'Mon');
    expect(monday.due(new Date('2026-11-24T08:10:00Z'))).toBe(false);
    expect(monday.due(new Date('2026-11-30T08:10:00Z'))).toBe(true);
    expect(new DailySlot(-1, TZ).due(new Date('2026-11-23T07:00:00Z'))).toBe(false);
  });

  it('counts working days and skips the weekend', () => {
    const friday = new Date('2026-11-20T10:00:00Z');
    expect(workingDaysSince(friday, new Date('2026-11-20T15:00:00Z'), TZ)).toBe(0);
    expect(workingDaysSince(friday, new Date('2026-11-22T15:00:00Z'), TZ)).toBe(0);
    expect(workingDaysSince(friday, new Date('2026-11-23T08:00:00Z'), TZ)).toBe(1);
    expect(workingDaysSince(friday, new Date('2026-11-24T08:00:00Z'), TZ)).toBe(2);
  });
});

describe('suggestOffers', () => {
  it('ranks the closest active offers and ignores archived ones', () => {
    const suggestions = suggestOffers(['Product Manager (m/f/d)', 'product'], offers);
    expect(suggestions.map((s) => s.id)).toEqual([101]);
  });
  it('ignores diacritics and returns nothing for unrelated text', () => {
    expect(suggestOffers(['QA Engineér'], offers)[0].id).toBe(102);
    expect(suggestOffers(['Účetní'], offers)).toEqual([]);
  });
});

describe('OfferCheck', () => {
  const startupJobs = (list: StartupJobsOffer[]): IStartupJobsApiClient => ({
    listApplicationsSince: async () => [],
    listActiveOffers: async () => list,
  });
  const check = (list: StartupJobsOffer[], fallback?: number) => {
    const recruitee = new MockRecruiteeClient(offers);
    return new OfferCheck(startupJobs(list), recruitee, new OfferResolver(recruitee, fallback), !!fallback);
  };

  it('sorts offers into solid, fragile and broken', async () => {
    const c = check(
      [
        { id: 'a', names: ['Product Manager'], internalName: '101' },
        { id: 'b', names: ['Tester'], internalName: 'qa' },
        { id: 'c', names: ['Produktový manažer', 'Product Manager senior'], internalName: 'product', url: 'https://sj/nabidka/1' },
      ],
      999
    );
    const result = await c.run();
    expect(result.checked).toBe(3);
    expect(result.fragile.map((i) => i.name)).toEqual(['Tester']);
    expect(result.broken.map((i) => i.name)).toEqual(['Produktový manažer']);
    const text = c.formatBroken(result)!;
    expect(text).toContain('1 z 3');
    expect(text).toContain('<https://sj/nabidka/1|Produktový manažer>');
    expect(text).toContain('Product Manager (ID 101)');
    expect(text).toContain('záložním talent poolu');
    expect(OfferCheck.formatFragile(result)).toContain('QA Engineer (ID 102)');
  });

  it('says nothing when every offer resolves', async () => {
    const c = check([{ id: 'a', names: ['Product Manager'], internalName: '101' }]);
    const result = await c.run();
    expect(c.formatBroken(result)).toBeUndefined();
    expect(OfferCheck.formatFragile(result)).toBeUndefined();
  });
});

describe('FallbackPoolReminder', () => {
  const NOW = new Date('2026-11-24T08:00:00Z');
  it('counts those who wait in the pool only, and for too long', async () => {
    const recruitee = new MockRecruiteeClient(offers);
    recruitee.offersById = [{ id: 999, title: 'Unsorted', slug: 'unsorted', kind: 'talent_pool', adminUrl: 'https://app.recruitee.com/#/offers/unsorted' }];
    recruitee.inOffer[999] = [
      { id: 1, offerIds: [999], createdAt: '2026-11-18T09:00:00Z' },
      { id: 2, offerIds: [999], createdAt: '2026-11-23T16:00:00Z' },
      { id: 3, offerIds: [999, 101], createdAt: '2026-11-10T09:00:00Z' },
    ];
    const reminder = new FallbackPoolReminder(recruitee, 999, 2, TZ);
    const state = await reminder.check(NOW);
    expect(state).toEqual({ unsorted: 2, overdue: 1, oldestSince: '2026-11-18', url: 'https://app.recruitee.com/#/offers/unsorted' });
    expect(reminder.format(state)).toContain('déle než 2 pracovní dny: 1 (nejdéle od 2026-11-18)');
  });

  it('is silent when nobody is overdue', async () => {
    const recruitee = new MockRecruiteeClient(offers);
    const reminder = new FallbackPoolReminder(recruitee, 999, 2, TZ);
    expect(reminder.format(await reminder.check(NOW))).toBeUndefined();
  });
});

describe('formatWeeklySummary', () => {
  const report = (byPosition: ReconcileReport['byPosition']): ReconcileReport => ({
    since: new Date('2026-11-16T08:00:00Z'),
    dryRun: true,
    checked: 0,
    present: 0,
    imported: [],
    wouldImport: [],
    needsReview: [],
    skippedTooFresh: 0,
    skippedNoEmail: 0,
    skippedOverLimit: [],
    errors: [],
    byPosition,
  });

  it('gives the all-clear', () => {
    const text = formatWeeklySummary({
      report: report({ QA: { total: 5, present: 5, missing: 0, review: 0, noEmail: 0 }, PM: { total: 9, present: 9, missing: 0, review: 0, noEmail: 0 } }),
      reconcilerDryRun: false,
      fallback: { unsorted: 0, overdue: 0 },
    });
    expect(text).toContain('přihlášek 14, všechny jsou v Recruitee');
    expect(text.indexOf('PM: 9')).toBeLessThan(text.indexOf('QA: 5'));
    expect(text).toContain('Nezařazených v záložním talent poolu: 0.');
  });

  it('says what is missing and whether it will fix itself', () => {
    const text = formatWeeklySummary({
      report: report({ PM: { total: 9, present: 7, missing: 2, review: 0, noEmail: 0 } }),
      reconcilerDryRun: true,
    });
    expect(text).toContain('v Recruitee chybí 2');
    expect(text).toContain('PM: 9 (chybí 2)');
    expect(text).toContain('zkušebním režimu');
  });

  it('handles an empty week', () => {
    expect(formatWeeklySummary({ report: report({}), reconcilerDryRun: false })).toContain('žádné přihlášky');
  });
});
