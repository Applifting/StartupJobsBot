import { ISlackClient } from "../Slack/ISlackClient";
import { StartupJobsPayload } from "../StartupJobs/webhookPayload";
import { AxiosPromise, AxiosResponse } from "axios";
import { SlackIntegrationCheckResult } from "../Slack/SlackIntegrationCheckResult";

export class MockSlackClient implements ISlackClient {
  private opts: MockSlackClientOpts;
  constructor(opts?: MockSlackClientOpts) {
    this.opts = opts ?? {};
  }

  public async checkIntegration(): Promise<SlackIntegrationCheckResult> {
    return this.opts.integrationCheckResult ?? SlackIntegrationCheckResult.OK;
  }

  public sendCandidateToSlackCalled = false;
  sendCandidateToSlack(candididate: StartupJobsPayload): AxiosPromise<any> {
    this.sendCandidateToSlackCalled = true;
    return Promise.resolve({ status: 200 } as AxiosResponse<any>);
  }
}

export interface MockSlackClientOpts {
  integrationCheckResult?: SlackIntegrationCheckResult;
}
