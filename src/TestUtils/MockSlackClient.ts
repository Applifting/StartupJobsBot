import { ISlackClient } from "../Slack/ISlackClient";
import { StartupJobsPayload } from "../StartupJobs/webhookPayload";
import { AxiosPromise, AxiosResponse } from "axios";

export class MockSlackClient implements ISlackClient {
  public sendCandidateToSlackCalled = false;
  sendCandidateToSlack(candididate: StartupJobsPayload): AxiosPromise<any> {
    this.sendCandidateToSlackCalled = true;
    return Promise.resolve({ status: 200 } as AxiosResponse<any>);
  }
}
