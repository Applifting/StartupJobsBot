import { getConfig } from '../config';
import { RecruiteeClient } from '../Recruitee/RecruiteeClient';
import { StartupJobsApiClient } from '../StartupJobs/StartupJobsApiClient';
import { OfferResolver } from '../Recruitee/OfferResolver';
import { Reconciler, ReconcileItem } from '../Reconciler/Reconciler';
import { sanitzeError } from '../Common/sanitizeError';

/**
 * One-off reconciliation / backfill from the command line.
 *
 *   yarn reconcile --since 2026-01-01            # dry run, prints what is missing
 *   yarn reconcile --since 2026-01-01 --apply    # imports the missing candidates
 *
 * Options: --limit N (max imports, default 500), --tag NAME (Recruitee tag for imported candidates)
 * Always a dry run unless --apply is given, whatever RECONCILE_DRY_RUN says.
 */
const arg = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const main = async () => {
  const config = getConfig();
  if (!config.recruitee || !config.startupJobsApi) {
    throw new Error('RECRUITEE_ACCESS_TOKEN, RECRUITEE_DOMAIN and STARTUPJOBS_API_TOKEN must be set');
  }
  const sinceArg = arg('since');
  const since = sinceArg ? new Date(`${sinceArg}T00:00:00Z`) : undefined;
  if (since && isNaN(since.getTime())) {
    throw new Error('--since must be a date like 2026-01-01');
  }
  const apply = process.argv.includes('--apply');

  const recruitee = new RecruiteeClient(config.recruitee);
  const reconciler = new Reconciler(
    new StartupJobsApiClient(config.startupJobsApi),
    recruitee,
    new OfferResolver(recruitee, config.recruitee.fallbackOfferId),
    config.reconciler
  );
  const report = await reconciler.run({
    since,
    dryRun: !apply,
    graceMinutes: 15,
    maxImportsPerRun: Number.parseInt(arg('limit') || '500', 10),
    tag: arg('tag') || config.reconciler.tag,
  });
  if (!report) {
    return;
  }

  const print = (title: string, items: ReconcileItem[]) => {
    console.log(`\n${title}: ${items.length}`);
    items.forEach((i) =>
      console.log(
        `  ${(i.createdAt || '').slice(0, 10)}  ${i.name || '?'}  |  ${i.position || '?'} (${i.internalPositionName || '-'})` +
          `  ->  ${i.via ? `${i.via} ${i.offerId}` : 'no target'}` +
          `${i.recruiteeCandidateId ? `  recruitee #${i.recruiteeCandidateId}` : ''}${i.reason ? `  [${i.reason}]` : ''}  sj:${i.applicationId}`
      )
    );
  };
  console.log(`Since ${report.since.toISOString().slice(0, 10)} ${apply ? '(APPLY)' : '(dry run)'}`);
  console.log(`Checked: ${report.checked}, already in Recruitee: ${report.present}, without e-mail: ${report.skippedNoEmail}, too fresh: ${report.skippedTooFresh}`);
  if (!config.recruitee.fallbackOfferId) {
    console.log('Note: RECRUITEE_FALLBACK_OFFER_ID is not set, unmatched applications are listed as errors.');
  }
  print('Imported', report.imported);
  print('Missing in Recruitee, would import', report.wouldImport);
  print('Needs review (person exists in Recruitee, this application probably does not)', report.needsReview);
  print('Skipped over the limit', report.skippedOverLimit);
  print('Errors', report.errors);
};

main().catch((e) => {
  console.error(sanitzeError(e)?.message || e);
  process.exit(1);
});
