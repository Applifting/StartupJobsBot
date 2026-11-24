import { ISlackClient, RecruiteeOutcome } from '../Slack/ISlackClient';
import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { AxiosPromise, AxiosResponse } from 'axios';
import { SlackIntegrationCheckResult } from '../Slack/SlackIntegrationCheckResult';

export class MockSlackClient implements ISlackClient {
  private opts: MockSlackClientOpts;
  constructor(opts?: MockSlackClientOpts) {
    this.opts = opts ?? {};
  }

  public async checkIntegration(): Promise<SlackIntegrationCheckResult> {
    return this.opts.integrationCheckResult ?? SlackIntegrationCheckResult.OK;
  }

  public notices: string[] = [];
  sendNotice(text: string): Promise<any> {
    this.notices.push(text);
    return Promise.resolve({ status: 200 });
  }

  public sendCandidateToSlackCalled = false;
  public outcomes: (RecruiteeOutcome | undefined)[] = [];
  public sendError: Error | undefined;
  sendCandidateToSlack(candididate: StartupJobsPayload, outcome?: RecruiteeOutcome): AxiosPromise<any> {
    this.sendCandidateToSlackCalled = true;
    this.outcomes.push(outcome);
    if (this.sendError) {
      return Promise.reject(this.sendError);
    }
    return Promise.resolve({ status: 200 } as AxiosResponse<any>);
  }
}

export interface MockSlackClientOpts {
  integrationCheckResult?: SlackIntegrationCheckResult;
}
