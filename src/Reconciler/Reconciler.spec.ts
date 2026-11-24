import { Reconciler, ReconcilerOptions } from './Reconciler';
import { MockRecruiteeClient } from '../TestUtils/MockRecruiteeClient';
import { OfferResolver } from '../Recruitee/OfferResolver';
import { IStartupJobsApiClient, StartupJobsApplication } from '../StartupJobs/StartupJobsApiClient';
import { webhookDevOffer, UXDesignerOffer } from '../TestUtils/offers';

const NOW = new Date('2026-11-24T12:00:00Z');
const FALLBACK_POOL = 999;

const application = (overrides: Partial<StartupJobsApplication> = {}): StartupJobsApplication => ({
  id: 'app-1',
  createdAt: '2026-11-20T10:00:00+01:00',
  name: 'Pan Žralok',
  email: 'shark@example.com',
  phone: '+420 111 222 333',
  text: 'Chci k vám',
  attachments: ['https://www.startupjobs.cz/download-file?file=cv.pdf'],
  position: 'Vývojář webhooků',
  positionAliases: [],
  internalPositionName: 'JOB1',
  ...overrides,
});

class FakeStartupJobs implements IStartupJobsApiClient {
  constructor(public applications: StartupJobsApplication[]) {}
  async listApplicationsSince(): Promise<StartupJobsApplication[]> {
    return this.applications;
  }
  async listActiveOffers() {
    return [];
  }
}

describe('Reconciler', () => {
  let recruitee: MockRecruiteeClient;
  let startupJobs: FakeStartupJobs;
  const options: ReconcilerOptions = { lookbackDays: 14, dryRun: false, graceMinutes: 15, maxImportsPerRun: 25 };
  const reconciler = (fallback: number | undefined = FALLBACK_POOL, opts: Partial<ReconcilerOptions> = {}) =>
    new Reconciler(startupJobs, recruitee, new OfferResolver(recruitee, fallback), { ...options, ...opts });

  beforeEach(() => {
    recruitee = new MockRecruiteeClient([UXDesignerOffer, webhookDevOffer]);
    startupJobs = new FakeStartupJobs([application()]);
  });

  it('imports an application missing in Recruitee into the matched offer', async () => {
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(1);
    expect(recruitee.created[0].offerId).toBe(webhookDevOffer.id);
    expect(recruitee.created[0].candidate.email).toBe('shark@example.com');
    expect(recruitee.created[0].candidate.why).toContain('Doplněno automaticky ze StartupJobs (přihláška z 2026-11-20)');
    expect(report!.imported).toHaveLength(1);
    expect(report!.imported[0].via).toBe('match');
  });

  it('puts an unmatched application into the fallback offer', async () => {
    startupJobs.applications = [application({ position: 'Product Manager', internalPositionName: 'product' })];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created[0].offerId).toBe(FALLBACK_POOL);
    expect(report!.imported[0].via).toBe('fallback');
  });

  it('reports an unmatched application as an error when there is no fallback', async () => {
    startupJobs.applications = [application({ position: 'Product Manager', internalPositionName: 'product' })];
    const report = await reconciler(0).run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.errors).toHaveLength(1);
  });

  it('writes nothing in dry run', async () => {
    const report = await reconciler(FALLBACK_POOL, { dryRun: true }).run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.wouldImport).toHaveLength(1);
  });

  it('skips a candidate already placed in the target offer', async () => {
    recruitee.existing['shark@example.com'] = [{ id: 5, offerIds: [webhookDevOffer.id], createdAt: '2025-01-01T00:00:00Z' }];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.present).toBe(1);
  });

  it('skips a candidate added to Recruitee around the application date, even to another offer', async () => {
    recruitee.existing['shark@example.com'] = [{ id: 5, offerIds: [UXDesignerOffer.id], createdAt: '2026-11-21T09:00:00Z' }];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.present).toBe(1);
  });

  it('flags for review, without importing, a person known from an older application only', async () => {
    recruitee.existing['shark@example.com'] = [{ id: 5, offerIds: [UXDesignerOffer.id], createdAt: '2024-03-01T09:00:00Z' }];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.needsReview).toHaveLength(1);
    expect(report!.needsReview[0].recruiteeCandidateId).toBe(5);
  });

  it('assumes present when the search hit says nothing about offers or dates', async () => {
    recruitee.existing['shark@example.com'] = [{ id: 5, offerIds: [] }];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.present).toBe(1);
  });

  it('does not import when the Recruitee search fails', async () => {
    recruitee.searchError = new Error('search is down');
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.errors[0].reason).toBe('search is down');
  });

  it('leaves fresh applications to the webhook', async () => {
    startupJobs.applications = [application({ createdAt: '2026-11-24T11:55:00Z' })];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.skippedTooFresh).toBe(1);
  });

  it('skips anonymized applications', async () => {
    startupJobs.applications = [application({ email: undefined })];
    const report = await reconciler().run({ now: NOW });
    expect(recruitee.created).toHaveLength(0);
    expect(report!.skippedNoEmail).toBe(1);
  });

  it('respects the import limit', async () => {
    startupJobs.applications = [1, 2, 3].map((n) => application({ id: `app-${n}`, email: `shark${n}@example.com` }));
    const report = await reconciler(FALLBACK_POOL, { maxImportsPerRun: 2 }).run({ now: NOW });
    expect(recruitee.created).toHaveLength(2);
    expect(report!.skippedOverLimit).toHaveLength(1);
  });

  it('does not import the same application twice across runs', async () => {
    const r = reconciler();
    await r.run({ now: NOW });
    await r.run({ now: NOW });
    expect(recruitee.created).toHaveLength(1);
  });

  it('tags imported candidates when a tag is configured', async () => {
    await reconciler(FALLBACK_POOL, { tag: 'doplneno' }).run({ now: NOW });
    expect(recruitee.taggings).toEqual([{ candidateId: 1000, tags: ['doplneno'] }]);
  });

  it('keeps names and contact details out of the Slack summary', async () => {
    startupJobs.applications = [application(), application({ id: 'app-2', email: 'x@example.com', position: 'Nic', internalPositionName: 'nic' })];
    const report = await reconciler().run({ now: NOW });
    const text = Reconciler.formatForSlack(report!);
    expect(Reconciler.isNoteworthy(report!)).toBe(true);
    expect(text).toContain('Doplněno do Recruitee (2)');
    expect(text).toContain('záložní talent pool');
    expect(text).not.toContain('Žralok');
    expect(text).not.toContain('example.com');
    expect(text).not.toContain('111 222 333');
  });

  it('matches by the title in another language', async () => {
    startupJobs.applications = [application({ position: 'Webhook dev', positionAliases: ['UX Designer'], internalPositionName: undefined })];
    await reconciler().run({ now: NOW });
    expect(recruitee.created[0].offerId).toBe(UXDesignerOffer.id);
  });

  it('attaches the files after the first one', async () => {
    startupJobs.applications = [application({ attachments: ['https://sj/cv.pdf', 'https://sj/portfolio.pdf'] })];
    await reconciler().run({ now: NOW });
    expect(recruitee.attached).toEqual([{ candidateId: 1000, fileUrl: 'https://sj/portfolio.pdf' }]);
  });

  it('counts per position, and an audit re-checks settled applications without writing', async () => {
    const r = reconciler();
    await r.run({ now: NOW });
    recruitee.existing['shark@example.com'] = [{ id: 1000, offerIds: [webhookDevOffer.id], createdAt: '2026-11-24T11:00:00Z' }];
    const audit = await r.run({ now: NOW, dryRun: true, ignoreSettled: true });
    expect(recruitee.created).toHaveLength(1);
    expect(audit!.byPosition).toEqual({ 'Vývojář webhooků': { total: 1, present: 1, missing: 0, review: 0, noEmail: 0 } });
  });
});

describe('Reconciler.onlyNew', () => {
  it('announces a finding once', () => {
    const item = { applicationId: 'a1' };
    const report: any = { imported: [], wouldImport: [item], needsReview: [], skippedOverLimit: [], errors: [] };
    const announced = new Set<string>();
    expect(Reconciler.isNoteworthy(Reconciler.onlyNew(report, announced))).toBe(true);
    expect(Reconciler.isNoteworthy(Reconciler.onlyNew(report, announced))).toBe(false);
  });
});
