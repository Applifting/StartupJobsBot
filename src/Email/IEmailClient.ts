import { StartupJobsPayload } from '../StartupJobs/webhookPayload';

export interface IEmailClient {
  sendCandidateEmail(candidate: StartupJobsPayload, recruiteeResponse: any): Promise<void>;
}