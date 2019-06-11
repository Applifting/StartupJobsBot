import { StartupJobsPayload } from "../StartupJobs/webhookPayload";

import { AxiosPromise } from "axios";

export interface ISlackClient {
  sendCandidateToSlack(candididate: StartupJobsPayload): AxiosPromise<any>;
}
