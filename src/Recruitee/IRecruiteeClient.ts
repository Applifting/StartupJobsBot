import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { AxiosPromise, AxiosResponse } from 'axios';
import { RecruiteeOffer } from './RecruiteeOffer';
import { RecruiteeIntegrationCheckResult } from './RecruiteeIntegrationCheckResult';

export interface IRecruiteeClient {
  createCandidateInRecruitee(offerId: number, candidate: StartupJobsPayload): AxiosPromise<any>;
  addCandidateTags(candidateId: number, tags: string[]): Promise<AxiosResponse<any>>;
  getOffers(): Promise<RecruiteeOffer[]>;
  checkIntegration(): Promise<RecruiteeIntegrationCheckResult>;
}
