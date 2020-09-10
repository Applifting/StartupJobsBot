import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { AxiosPromise } from 'axios';
import { SlackIntegrationCheckResult } from './SlackIntegrationCheckResult';

export interface ISlackClient {
  sendCandidateToSlack(candididate: StartupJobsPayload): AxiosPromise<any>;
  checkIntegration(): Promise<SlackIntegrationCheckResult>;
}
