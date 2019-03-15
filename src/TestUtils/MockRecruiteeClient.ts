import { IRecruiteeClient } from "../Recruitee/IRecruiteeClient";
import { StartupJobsPayload } from "../StartupJobs/webhookPayload";
import { AxiosPromise, AxiosResponse } from "axios";
import { RecruiteeOffer } from "../Recruitee/RecruiteeOffer";
import { UXDesignerOffer, webhookDevOffer } from "./offers";

export class MockRecruiteeClient implements IRecruiteeClient {
  public createCandidateCalled = false;
  public getOffersCalled = false;
  offers: RecruiteeOffer[];

  constructor(offers: RecruiteeOffer[]) {
    this.offers = offers;
  }

  createCandidateInRecruitee(
    offerId: number,
    candidate: StartupJobsPayload
  ): AxiosPromise<any> {
    this.createCandidateCalled = true;
    return Promise.resolve({ status: 200, data: {} } as AxiosResponse);
  }
  getOffers(): Promise<RecruiteeOffer[]> {
    this.getOffersCalled = true;
    return Promise.resolve(this.offers);
  }
}
