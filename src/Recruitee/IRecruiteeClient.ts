import { StartupJobsPayload } from "../StartupJobs/webhookPayload";

import { AxiosPromise } from "axios";
import { RecruiteeOffer } from "./RecruiteeOffer";

export interface IRecruiteeClient {
  createCandidateInRecruitee(
    offerId: number,
    candidate: StartupJobsPayload
  ): AxiosPromise<any>;
  getOffers(): Promise<RecruiteeOffer[]>;
}
