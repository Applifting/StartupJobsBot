import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { OfferResolution, OfferResolver } from '../Recruitee/OfferResolver';
import { IStartupJobsApiClient, StartupJobsApplication } from '../StartupJobs/StartupJobsApiClient';
import { CandidateData } from '../Candidate/CandidateData';
import { RecruiteeOffer } from '../Recruitee/RecruiteeOffer';
import { createCandidateWithFiles } from '../Recruitee/createCandidateWithFiles';

export interface ReconcilerOptions {
  // How far back each run looks
  lookbackDays: number;
  // When true, nothing is written to Recruitee; the run only reports what it would import
  dryRun: boolean;
  // Applications younger than this are left to the webhook, so the two never race
  graceMinutes: number;
  // Safety brake: a run that wants to import more than this imports nothing above the limit
  maxImportsPerRun: number;
  // Optional Recruitee tag put on imported candidates
  tag?: string;
}

export interface ReconcileItem {
  applicationId: string;
  createdAt?: string;
  position?: string;
  internalPositionName?: string;
  // Only for local output of the CLI. Never sent to Slack.
  name?: string;
  offerId?: number;
  via?: OfferResolution['via'];
  recruiteeCandidateId?: number;
  reason?: string;
}

export interface ReconcileReport {
  since: Date;
  dryRun: boolean;
  checked: number;
  present: number;
  imported: ReconcileItem[];
  wouldImport: ReconcileItem[];
  // The person is in Recruitee from earlier, but this application does not seem to be reflected there
  needsReview: ReconcileItem[];
  skippedTooFresh: number;
  skippedNoEmail: number;
  skippedOverLimit: ReconcileItem[];
  errors: ReconcileItem[];
  // Counts per position title, for the weekly summary
  byPosition: { [position: string]: PositionStats };
}

export interface PositionStats {
  total: number;
  present: number;
  // Not in Recruitee at the time of the run, whether or not the run then imported it
  missing: number;
  review: number;
  noEmail: number;
}

type RunOverrides = Partial<ReconcilerOptions> & {
  since?: Date;
  now?: Date;
  // Check every application again, even those this process already settled. For read-only audits.
  ignoreSettled?: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Safety net for the webhook: pulls applications from the StartupJobs API and imports those missing in Recruitee.
 * Covers a webhook missing on an offer, a webhook deleted by StartupJobs, bot downtime and failed processing.
 * Run with a long lookback, it is also the backfill.
 *
 * It never creates a candidate when it cannot tell whether the person already is in Recruitee.
 */
export class Reconciler {
  // Applications already confirmed present or imported by this process, to save API calls between runs
  private settled = new Set<string>();
  private running = false;

  constructor(
    private startupJobs: IStartupJobsApiClient,
    private recruitee: IRecruiteeClient,
    private resolver: OfferResolver,
    private options: ReconcilerOptions
  ) {}

  public async run(overrides: RunOverrides = {}): Promise<ReconcileReport | undefined> {
    if (this.running) {
      return undefined;
    }
    this.running = true;
    try {
      return await this.reconcile(overrides);
    } finally {
      this.running = false;
    }
  }

  private async reconcile(overrides: RunOverrides): Promise<ReconcileReport> {
    const options = { ...this.options, ...overrides };
    const now = overrides.now ?? new Date();
    const since = overrides.since ?? new Date(now.getTime() - options.lookbackDays * DAY_MS);
    const report: ReconcileReport = {
      since,
      dryRun: options.dryRun,
      checked: 0,
      present: 0,
      imported: [],
      wouldImport: [],
      needsReview: [],
      skippedTooFresh: 0,
      skippedNoEmail: 0,
      skippedOverLimit: [],
      errors: [],
      byPosition: {},
    };

    const applications = await this.startupJobs.listApplicationsSince(since, overrides.ignoreSettled ? undefined : this.settled);
    const activeOffers = await this.recruitee.getOffers();
    applications.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    for (const application of applications) {
      if (!overrides.ignoreSettled && this.settled.has(application.id)) {
        continue;
      }
      const item = Reconciler.describe(application);
      try {
        await this.reconcileOne(application, item, activeOffers, options, now, report);
      } catch (e) {
        // A stable application id keeps a repeating failure from being announced every hour
        report.errors.push({ ...item, reason: (e as Error).message });
      }
    }
    return report;
  }

  private async reconcileOne(
    application: StartupJobsApplication,
    item: ReconcileItem,
    activeOffers: RecruiteeOffer[],
    options: ReconcilerOptions,
    now: Date,
    report: ReconcileReport
  ): Promise<void> {
    const createdAt = application.createdAt ? new Date(application.createdAt) : undefined;
    const createdAtMs = createdAt && !isNaN(createdAt.getTime()) ? createdAt.getTime() : undefined;
    if (createdAtMs !== undefined && now.getTime() - createdAtMs < options.graceMinutes * 60 * 1000) {
      report.skippedTooFresh++;
      return;
    }
    report.checked++;
    const position = application.position || '(neznámá pozice)';
    const stats = (report.byPosition[position] = report.byPosition[position] || { total: 0, present: 0, missing: 0, review: 0, noEmail: 0 });
    stats.total++;
    if (!application.email || !application.name) {
      // Anonymized or incomplete application; nothing to match on
      report.skippedNoEmail++;
      stats.noEmail++;
      return;
    }

    const candidate = Reconciler.toCandidate(application);
    const resolution = await this.resolver.resolve(candidate, activeOffers);
    item.offerId = resolution?.offerId;
    item.via = resolution?.via;

    const hits = await this.recruitee.findCandidatesByEmail(application.email);
    if (hits.length > 0) {
      const inTargetOffer = !!resolution && hits.some((h) => h.offerIds.includes(resolution.offerId));
      const addedAroundApplication =
        createdAtMs !== undefined &&
        hits.some((h) => h.createdAt && new Date(h.createdAt).getTime() >= createdAtMs - 2 * DAY_MS);
      const cannotTell = createdAtMs === undefined || hits.every((h) => h.offerIds.length === 0 && !h.createdAt);
      if (inTargetOffer || addedAroundApplication || cannotTell) {
        report.present++;
        stats.present++;
        this.settled.add(application.id);
      } else {
        stats.review++;
        report.needsReview.push({
          ...item,
          recruiteeCandidateId: hits[0].id,
          reason: 'Candidate exists in Recruitee from earlier, but not in the offer this application belongs to',
        });
      }
      return;
    }

    stats.missing++;
    if (!resolution) {
      report.errors.push({ ...item, reason: 'No matching Recruitee offer and no fallback offer configured' });
      return;
    }
    if (options.dryRun) {
      report.wouldImport.push(item);
      return;
    }
    if (report.imported.length >= options.maxImportsPerRun) {
      report.skippedOverLimit.push(item);
      return;
    }

    const response = await createCandidateWithFiles(this.recruitee, resolution.offerId, candidate);
    const candidateId: number | undefined = response?.data?.candidate?.id;
    this.settled.add(application.id);
    report.imported.push({ ...item, recruiteeCandidateId: candidateId });
    if (options.tag && candidateId) {
      // Tagging is a nicety; the candidate is already in
      await this.recruitee.addCandidateTags(candidateId, [options.tag]).catch(() => undefined);
    }
  }

  private static describe(application: StartupJobsApplication): ReconcileItem {
    return {
      applicationId: application.id,
      createdAt: application.createdAt,
      position: application.position,
      internalPositionName: application.internalPositionName,
      name: application.name,
    };
  }

  public static toCandidate(application: StartupJobsApplication): CandidateData {
    const appliedOn = application.createdAt ? application.createdAt.slice(0, 10) : 'neznámého data';
    const note = `<p><em>Doplněno automaticky ze StartupJobs (přihláška z ${appliedOn}). Webhook tuto přihlášku do Recruitee nedoručil.</em></p>`;
    return {
      name: application.name || '',
      email: application.email,
      phone: application.phone,
      linkedin: application.linkedin,
      why: `${note}${application.text || ''}`,
      files: application.attachments,
      position: application.position || '',
      positionAliases: application.positionAliases,
      internalPositionName: application.internalPositionName,
      source: 'StartupJobs',
    };
  }

  /**
   * The report without the findings already announced, so an hourly run does not repeat itself.
   * `announced` is updated with what this report adds. Imports are always new.
   */
  public static onlyNew(report: ReconcileReport, announced: Set<string>): ReconcileReport {
    const fresh = (items: ReconcileItem[]) => items.filter((i) => !announced.has(i.applicationId));
    const result = {
      ...report,
      wouldImport: fresh(report.wouldImport),
      needsReview: fresh(report.needsReview),
      skippedOverLimit: fresh(report.skippedOverLimit),
      errors: fresh(report.errors),
    };
    [...result.wouldImport, ...result.needsReview, ...result.skippedOverLimit, ...result.errors].forEach((i) => announced.add(i.applicationId));
    return result;
  }

  /** Whether the report contains anything a human should see. */
  public static isNoteworthy(report: ReconcileReport): boolean {
    return (
      report.imported.length + report.wouldImport.length + report.needsReview.length + report.skippedOverLimit.length + report.errors.length > 0
    );
  }

  /** Slack summary. Deliberately without names or contact details. */
  public static formatForSlack(report: ReconcileReport): string {
    const line = (i: ReconcileItem) => {
      const position = `„${i.position || '?'}“${i.internalPositionName ? ` (${i.internalPositionName})` : ''}`;
      const applied = i.createdAt ? ` z ${i.createdAt.slice(0, 10)}` : '';
      const where = i.via === 'fallback' ? ' → záložní talent pool' : i.offerId ? ` → Recruitee offer ${i.offerId}` : '';
      const candidate = i.recruiteeCandidateId ? `, kandidát #${i.recruiteeCandidateId}` : '';
      const reason = i.reason ? ` — ${i.reason}` : '';
      return `• ${position}${applied}${where}${candidate}${reason} [StartupJobs ${i.applicationId}]`;
    };
    const section = (title: string, items: ReconcileItem[]) => (items.length ? `\n*${title} (${items.length})*\n${items.map(line).join('\n')}` : '');
    const since = report.since.toISOString().slice(0, 10);
    return (
      `:mag: Kontrola StartupJobs → Recruitee od ${since}${report.dryRun ? ' (*zkušební režim, nic se nezapisuje*)' : ''}: ` +
      `zkontrolováno ${report.checked}, v Recruitee už je ${report.present}.` +
      section('Doplněno do Recruitee', report.imported) +
      section('Chybí v Recruitee, doplnilo by se', report.wouldImport) +
      section('Ke kontrole: člověk v Recruitee je, tahle přihláška nejspíš ne', report.needsReview) +
      section('Nedoplněno kvůli limitu na jeden běh', report.skippedOverLimit) +
      section('Chyby', report.errors)
    );
  }
}
