import { StartupJobsPayload } from "../StartupJobs/webhookPayload";
import axios, { AxiosPromise } from "axios";
import { DomainNormalizer } from "./DomainNormalizer";
import { RecruiteeOffer } from "./RecruiteeOffer";
import { RecruiteeConfig } from "./RecruiteeConfig";

export class RecruiteeClient {
  private config: RecruiteeConfig;

  constructor(config: RecruiteeConfig) {
    this.config = config;
  }

  public createCandidateInRecruitee(
    offerId: number,
    candidate: StartupJobsPayload
  ): AxiosPromise<any> {
    return axios.post(
      `https://api.recruitee.com/c/${DomainNormalizer.normalize(
        this.config.companyDomain
      )}/candidates`,
      {
        offers: [250113],
        candidate: {
          name: candidate.name,
          emails: [candidate.email],
          phones: [candidate.phone],
          sources: ["StartupJobs"],
          cover_letter: candidate.why,
          links: [candidate.details],
          social_links: candidate.linkedin ? [candidate.linkedin] : undefined,
          remote_cv_url:
            candidate.files.length > 0 ? candidate.files[0] : undefined
        }
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`
        }
      }
    );
  }

  public getOffers(): Promise<RecruiteeOffer[]> {
    return axios
      .get(
        `https://api.recruitee.com/c/${DomainNormalizer.normalize(
          this.config.companyDomain
        )}/offers`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`
          }
        }
      )
      .then(r => r.data.offers);
  }
}
