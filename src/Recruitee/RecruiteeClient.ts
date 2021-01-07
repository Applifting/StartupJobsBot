import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import axios, { AxiosPromise } from 'axios';
import { DomainNormalizer } from './DomainNormalizer';
import { RecruiteeOffer } from './RecruiteeOffer';
import { RecruiteeConfig } from './RecruiteeConfig';
import { IRecruiteeClient } from './IRecruiteeClient';
import { RecruiteeIntegrationCheckResult } from './RecruiteeIntegrationCheckResult';
import { isAxiosError } from '../Common/isAxiosError';

export class RecruiteeClient implements IRecruiteeClient {
  private config: RecruiteeConfig;

  constructor(config: RecruiteeConfig) {
    this.config = config;
  }

  public createCandidateInRecruitee(offerId: number, candidate: StartupJobsPayload): AxiosPromise<any> {
    let remote_cv_url = candidate.files.length > 0 ? candidate.files[0] : undefined;
    // recruitee does not accept relative path
    if (remote_cv_url && !remote_cv_url.startsWith('http')) {
      remote_cv_url = undefined;
    }

    return axios.post(
      `https://api.recruitee.com/c/${DomainNormalizer.normalize(this.config.companyDomain)}/candidates`,
      {
        offers: [offerId],
        candidate: {
          name: candidate.name,
          emails: [candidate.email],
          phones: [candidate.phone],
          sources: [candidate.source || 'StartupJobs'],
          cover_letter: candidate.why,
          links: [candidate.details],
          social_links: candidate.linkedin ? [candidate.linkedin] : undefined,
          remote_cv_url,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      }
    );
  }

  public getOffers(): Promise<RecruiteeOffer[]> {
    return axios
      .get(`https://api.recruitee.com/c/${DomainNormalizer.normalize(this.config.companyDomain)}/offers`, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      })
      .then((r: any) => r.data.offers);
  }

  public async checkIntegration(): Promise<RecruiteeIntegrationCheckResult> {
    try {
      // This endpoint is used for its fast response times for the HEAD http verb
      const response = await axios.head(`https://api.recruitee.com/c/${DomainNormalizer.normalize(this.config.companyDomain)}/countries`, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });
      return RecruiteeIntegrationCheckResult.OK;
    } catch (e) {
      if (isAxiosError(e)) {
        const status = e.response?.status;
        if (status && status >= 500 && status < 600) {
          return RecruiteeIntegrationCheckResult.RECRUITEE_NOT_AVAILABLE;
        } else if (status == 401) {
          return RecruiteeIntegrationCheckResult.BAD_ACCESS_TOKEN;
        } else if (status == 403) {
          return RecruiteeIntegrationCheckResult.BAD_COMPANY_DOMAIN;
        }
      }
    }
    return RecruiteeIntegrationCheckResult.UNKNOWN_ERROR;
  }
}
