import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { AxiosPromise } from 'axios';
import { SlackIntegrationCheckResult } from './SlackIntegrationCheckResult';

/** What happened to the candidate in Recruitee, shown in the same Slack message as the candidate. */
export interface RecruiteeOutcome {
  status: 'placed' | 'fallback' | 'failed';
  offerTitle?: string;
  // Link to the candidate's profile in Recruitee
  candidateUrl?: string;
  // For 'failed': a reason safe to show, without personal data or secrets
  reason?: string;
  // Whether the hourly check will try to import a failed candidate
  willRetry?: boolean;
  // For 'fallback' and unmatched 'failed': closest Recruitee offers
  suggestions?: { id: number; title: string }[];
}

export interface ISlackClient {
  sendCandidateToSlack(candididate: StartupJobsPayload, outcome?: RecruiteeOutcome): AxiosPromise<any>;
  /** Posts a plain text message. Must not contain personal data of candidates. */
  sendNotice(text: string): Promise<any>;
  checkIntegration(): Promise<SlackIntegrationCheckResult>;
}
