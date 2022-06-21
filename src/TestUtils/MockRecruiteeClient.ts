import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { AxiosPromise, AxiosResponse } from 'axios';
import { RecruiteeOffer } from '../Recruitee/RecruiteeOffer';
import { RecruiteeIntegrationCheckResult } from '../Recruitee/RecruiteeIntegrationCheckResult';

export class MockRecruiteeClient implements IRecruiteeClient {
  public createCandidateCalled = false;
  public getOffersCalled = false;
  offers: RecruiteeOffer[];
  opts: MockRecruiteeClientOpts;

  constructor(offers: RecruiteeOffer[], opts?: MockRecruiteeClientOpts) {
    this.offers = offers;
    this.opts = opts || {};
  }

  createCandidateInRecruitee(offerId: number, candidate: StartupJobsPayload): AxiosPromise<any> {
    this.createCandidateCalled = true;
    return Promise.resolve({ status: 200, data: {} } as AxiosResponse);
  }

  public async addCandidateTags(candidateId: number, tags: string[]): Promise<AxiosResponse<any>> {
    return Promise.resolve({ status: 200, data: {} } as AxiosResponse);
  }

  getOffers(): Promise<RecruiteeOffer[]> {
    this.getOffersCalled = true;
    return Promise.resolve(this.offers);
  }

  async checkIntegration(): Promise<RecruiteeIntegrationCheckResult> {
    return this.opts.integrationCheckResult ?? RecruiteeIntegrationCheckResult.OK;
  }
}

export interface MockRecruiteeClientOpts {
  integrationCheckResult?: RecruiteeIntegrationCheckResult;
}
