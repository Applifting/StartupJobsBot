import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { CandidateData } from '../Candidate/CandidateData';
import { RecruiteeCandidateHit, RecruiteeCandidateList } from '../Recruitee/RecruiteeCandidateHit';
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

  public created: { offerId: number; candidate: CandidateData }[] = [];
  public taggings: { candidateId: number; tags: string[] }[] = [];
  // Offers reachable by id only (talent pools, drafts...), on top of `offers`
  public offersById: RecruiteeOffer[] = [];
  // Existing candidates by e-mail
  public existing: { [email: string]: RecruiteeCandidateHit[] } = {};
  public searchError: Error | undefined;
  public createError: Error | undefined;
  public attachError: Error | undefined;
  public attached: { candidateId: number; fileUrl: string }[] = [];
  public inOffer: { [offerId: number]: RecruiteeCandidateHit[] } = {};
  private nextCandidateId = 1000;

  createCandidateInRecruitee(offerId: number, candidate: CandidateData): AxiosPromise<any> {
    this.createCandidateCalled = true;
    this.created.push({ offerId, candidate });
    if (this.createError) {
      return Promise.reject(this.createError);
    }
    const id = this.nextCandidateId++;
    return Promise.resolve({
      status: 201,
      data: { candidate: { id, adminapp_url: `https://app.recruitee.com/#/dashboard/overview?candidate=${id}&company=1` } },
    } as AxiosResponse);
  }

  public async addCandidateTags(candidateId: number, tags: string[]): Promise<AxiosResponse<any>> {
    this.taggings.push({ candidateId, tags });
    return Promise.resolve({ status: 200, data: {} } as AxiosResponse);
  }

  async getOfferById(offerId: number): Promise<RecruiteeOffer | undefined> {
    return [...this.offers, ...this.offersById].find((o) => o.id === offerId);
  }

  async attachRemoteFile(candidateId: number, fileUrl: string): Promise<void> {
    if (this.attachError) {
      throw this.attachError;
    }
    this.attached.push({ candidateId, fileUrl });
  }

  async listCandidatesInOffer(offerId: number): Promise<RecruiteeCandidateList> {
    const hits = this.inOffer[offerId] || [];
    return { total: hits.length, hits };
  }

  async findCandidatesByEmail(email: string): Promise<RecruiteeCandidateHit[]> {
    if (this.searchError) {
      throw this.searchError;
    }
    return this.existing[email.toLowerCase()] || [];
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
