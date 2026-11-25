import { Server } from './Server/Server';
import { StartupJobsWebhookParser } from './StartupJobs/StartupJobsWebhookParser';
import { CandidateProcessor } from './Candidate/CandidateProcessor';
import { SlackClient } from './Slack/SlackClient';
import { RecruiteeClient } from './Recruitee/RecruiteeClient';
import { GmailClient } from './Email/GmailClient';
import { getConfig } from './config';
import { IErrorReporter } from './Common/IErrorReporter';
import { HealthCheck } from './HealthCheck/HealthCheck';
import { StartupJobsApiClient } from './StartupJobs/StartupJobsApiClient';
import { Reconciler } from './Reconciler/Reconciler';
import { OfferResolver } from './Recruitee/OfferResolver';
import { sanitzeError } from './Common/sanitizeError';
import { OfferCheck } from './Reports/OfferCheck';
import { FallbackPoolReminder } from './Reports/FallbackPoolReminder';
import { formatWeeklySummary } from './Reports/WeeklySummary';
import { DailySlot } from './Reports/schedule';

const config = getConfig();
const parser = new StartupJobsWebhookParser();
const slack = config.slack && new SlackClient(config.slack);
const recruitee = config.recruitee && new RecruiteeClient(config.recruitee);
const email = config.gmail && new GmailClient(config.gmail);
const processor = new CandidateProcessor(slack, recruitee, email, {
  fallbackOfferId: config.recruitee?.fallbackOfferId,
  reconcilerImports: !!config.startupJobsApi && config.reconciler.intervalMinutes > 0 && !config.reconciler.dryRun,
});
const healthCheck = new HealthCheck(slack, recruitee);

let errorReporter: IErrorReporter | undefined;
if (config.slack && config.slack.reportErrors) {
  errorReporter = slack;
}

const server = new Server(parser, processor, healthCheck, errorReporter, config.server);
console.log('⏳  StartupJobsBot is starting...');
if (recruitee) {
  console.log(`✅  Recruitee is enabled for company domain ${config.recruitee?.companyDomain}`);
} else {
  console.log('➖  Recruitee integration is not set up');
}
if (slack) {
  console.log(`✅  Slack is enabled`);
} else {
  console.log('➖  Slack integration is not set up');
}

if (recruitee && config.recruitee?.fallbackOfferId) {
  console.log(`✅  Unmatched candidates go to Recruitee offer ${config.recruitee.fallbackOfferId}`);
} else if (recruitee) {
  console.log('⚠️  RECRUITEE_FALLBACK_OFFER_ID is not set, unmatched candidates will not reach Recruitee');
}

server.start();

const fallbackOfferId = config.recruitee?.fallbackOfferId;
const startupJobsApi = config.startupJobsApi && new StartupJobsApiClient(config.startupJobsApi);
const resolver = recruitee && new OfferResolver(recruitee, fallbackOfferId);
const reconciler = recruitee && resolver && startupJobsApi && new Reconciler(startupJobsApi, recruitee, resolver, config.reconciler);
const offerCheck = recruitee && resolver && startupJobsApi && new OfferCheck(startupJobsApi, recruitee, resolver, !!fallbackOfferId);
const fallbackReminder =
  recruitee && fallbackOfferId
    ? new FallbackPoolReminder(recruitee, fallbackOfferId, config.reports.fallbackReminderWorkdays, config.reports.timeZone)
    : undefined;

/** Runs a background job; a failure is logged and reported, never thrown. */
const background = async (name: string, job: () => Promise<void>) => {
  try {
    await job();
  } catch (e) {
    console.log(`${name} failed:`, sanitzeError(e));
    if (errorReporter) {
      errorReporter.reportError(`(${name})`, e as Error).catch((err) => console.log(err));
    }
  }
};

// Periodic safety net: import applications the webhook did not deliver
const announced = new Set<string>();
const runReconciler = () =>
  background('reconciler run', async () => {
    const report = await reconciler!.run();
    if (!report) {
      return;
    }
    console.log(
      `Reconciler: checked ${report.checked}, present ${report.present}, imported ${report.imported.length}, ` +
        `would import ${report.wouldImport.length}, needs review ${report.needsReview.length}, errors ${report.errors.length}` +
        (report.dryRun ? ' (dry run)' : '')
    );
    const news = Reconciler.onlyNew(report, announced);
    if (slack && Reconciler.isNoteworthy(news)) {
      await slack.sendNotice(Reconciler.formatForSlack(news));
    }
  });

// Every morning: offers that would not find their Recruitee job, and candidates forgotten in the fallback pool.
// Says nothing when there is nothing to fix.
const runDailyCheck = () =>
  background('daily check', async () => {
    const messages: (string | undefined)[] = [];
    if (offerCheck) {
      messages.push(offerCheck.formatBroken(await offerCheck.run()));
    }
    if (fallbackReminder) {
      messages.push(fallbackReminder.format(await fallbackReminder.check()));
    }
    const text = messages.filter(Boolean).join('\n\n');
    if (slack && text) {
      await slack.sendNotice(text);
    }
  });

// Every Monday: last week's applications, all accounted for or a list of what is not
const runWeeklySummary = () =>
  background('weekly summary', async () => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    let report = await reconciler!.run({ since, dryRun: true, ignoreSettled: true });
    for (let attempt = 0; !report && attempt < 10; attempt++) {
      // The hourly run is in progress; wait for it
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
      report = await reconciler!.run({ since, dryRun: true, ignoreSettled: true });
    }
    if (!report || !slack) {
      return;
    }
    const fallback = fallbackReminder ? await fallbackReminder.check().catch(() => undefined) : undefined;
    const fragileOffers = offerCheck ? OfferCheck.formatFragile(await offerCheck.run()) : undefined;
    await slack.sendNotice(formatWeeklySummary({ report, reconcilerDryRun: config.reconciler.dryRun, fallback, fragileOffers }));
  });

if (reconciler && config.reconciler.intervalMinutes > 0) {
  setTimeout(runReconciler, 60 * 1000);
  setInterval(runReconciler, config.reconciler.intervalMinutes * 60 * 1000);
  console.log(
    `✅  Reconciler runs every ${config.reconciler.intervalMinutes} min, looks back ${config.reconciler.lookbackDays} days` +
      (config.reconciler.dryRun ? ' (DRY RUN: set RECONCILE_DRY_RUN=false to let it import)' : '')
  );
} else {
  console.log('➖  Reconciler is not set up (needs Recruitee and STARTUPJOBS_API_TOKEN)');
}

if (slack && (offerCheck || fallbackReminder)) {
  const { timeZone, dailyCheckHour, weeklySummaryHour } = config.reports;
  const daily = new DailySlot(dailyCheckHour, timeZone);
  const weekly = new DailySlot(reconciler ? weeklySummaryHour : -1, timeZone, 'Mon');
  setInterval(() => {
    const now = new Date();
    if (daily.due(now)) {
      runDailyCheck();
    }
    if (weekly.due(now)) {
      runWeeklySummary();
    }
  }, 60 * 1000);
  console.log(
    `✅  Reports (${timeZone}): daily check ${dailyCheckHour < 0 ? 'off' : `at ${dailyCheckHour}:00`}, ` +
      `Monday summary ${!reconciler || weeklySummaryHour < 0 ? 'off' : `at ${weeklySummaryHour}:00`}`
  );
}
