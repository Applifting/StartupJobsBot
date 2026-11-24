import { AxiosPromise, AxiosResponse } from 'axios';
import { RecruiteeOffer } from './RecruiteeOffer';
import { RecruiteeIntegrationCheckResult } from './RecruiteeIntegrationCheckResult';
import { CandidateData } from '../Candidate/CandidateData';
import { RecruiteeCandidateHit, RecruiteeCandidateList } from './RecruiteeCandidateHit';

export interface IRecruiteeClient {
  createCandidateInRecruitee(offerId: number, candidate: CandidateData): AxiosPromise<any>;
  addCandidateTags(candidateId: number, tags: string[]): Promise<AxiosResponse<any> | undefined>;
  /** Active (published/internal) offers including their tags. */
  getOffers(): Promise<RecruiteeOffer[]>;
  /** Any offer by id regardless of its status, or undefined when it does not exist. */
  getOfferById(offerId: number): Promise<RecruiteeOffer | undefined>;
  /** Candidates already in Recruitee with this e-mail. Throws when the search fails. */
  findCandidatesByEmail(email: string): Promise<RecruiteeCandidateHit[]>;
  /** Attaches a file, given by URL, to an existing candidate. */
  attachRemoteFile(candidateId: number, fileUrl: string): Promise<void>;
  /** Candidates placed in one offer, oldest first. `kind` picks the search filter. */
  listCandidatesInOffer(offerId: number, kind: 'job' | 'talent_pool'): Promise<RecruiteeCandidateList>;
  checkIntegration(): Promise<RecruiteeIntegrationCheckResult>;
}
