import { ReconcileReport } from '../Reconciler/Reconciler';
import { FallbackPoolState } from './FallbackPoolReminder';

export interface WeeklySummaryInput {
  // Result of a read-only reconciler pass over the last week
  report: ReconcileReport;
  // True when the hourly check only reports and does not import
  reconcilerDryRun: boolean;
  fallback?: FallbackPoolState;
  fragileOffers?: string;
}

/** The Monday message: every application of the last week accounted for, or a clear list of what is not. */
export const formatWeeklySummary = (input: WeeklySummaryInput): string => {
  const { report } = input;
  const positions = Object.entries(report.byPosition).sort((a, b) => b[1].total - a[1].total);
  const total = positions.reduce((sum, [, p]) => sum + p.total, 0);
  const missing = positions.reduce((sum, [, p]) => sum + p.missing, 0);
  const review = positions.reduce((sum, [, p]) => sum + p.review, 0);
  const since = report.since.toISOString().slice(0, 10);

  if (total === 0) {
    return `:white_check_mark: Týden na StartupJobs (od ${since}): žádné přihlášky.` + extras(input);
  }
  const allIn = missing === 0 && review === 0;
  const headline = allIn
    ? `:white_check_mark: Týden na StartupJobs (od ${since}): přihlášek ${total}, všechny jsou v Recruitee.`
    : `:warning: Týden na StartupJobs (od ${since}): přihlášek ${total}, v Recruitee chybí ${missing}, ke kontrole ${review}.`;
  const lines = positions.map(([position, p]) => {
    const problems = [
      p.missing ? `chybí ${p.missing}` : '',
      p.review ? `ke kontrole ${p.review}` : '',
      p.noEmail ? `bez e-mailu (anonymizováno) ${p.noEmail}` : '',
    ].filter(Boolean);
    return `• ${position}: ${p.total}${problems.length ? ` (${problems.join(', ')})` : ''}`;
  });
  const missingNote =
    missing > 0
      ? input.reconcilerDryRun
        ? '\nChybějící se nedoplní samy: hodinová kontrola běží ve zkušebním režimu.'
        : '\nChybějící doplní nejbližší hodinová kontrola.'
      : '';
  return `${headline}\n${lines.join('\n')}${missingNote}${extras(input)}`;
};

const extras = (input: WeeklySummaryInput): string => {
  const parts: string[] = [];
  if (input.fallback) {
    parts.push(`Nezařazených v záložním talent poolu: ${input.fallback.unsorted}.`);
  }
  if (input.fragileOffers) {
    parts.push(input.fragileOffers);
  }
  return parts.length ? `\n${parts.join('\n')}` : '';
};
