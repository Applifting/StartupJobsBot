import { StartupJobsPayload } from "../StartupJobs/webhookPayload";

import { AxiosPromise } from "axios";

export interface ISlackClient {
  sendCandidateToSclack(candididate: StartupJobsPayload): AxiosPromise<any>;
}
