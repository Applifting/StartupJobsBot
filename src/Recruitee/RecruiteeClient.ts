import { CandidateData } from '../Candidate/CandidateData';
import { RecruiteeCandidateHit, RecruiteeCandidateList } from './RecruiteeCandidateHit';
import axios, { AxiosPromise, AxiosResponse } from 'axios';
import { DomainNormalizer } from './DomainNormalizer';
import { ACTIVE_OFFER_STATUSES, RecruiteeOffer } from './RecruiteeOffer';
import { RecruiteeConfig } from './RecruiteeConfig';
import { IRecruiteeClient } from './IRecruiteeClient';
import { RecruiteeIntegrationCheckResult } from './RecruiteeIntegrationCheckResult';
import { isAxiosError } from '../Common/isAxiosError';

export class RecruiteeClient implements IRecruiteeClient {
  private config: RecruiteeConfig;

  constructor(config: RecruiteeConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://api.recruitee.com/c/${DomainNormalizer.normalize(this.config.companyDomain)}`;
  }

  private get requestConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    };
  }

  public createCandidateInRecruitee(offerId: number, candidate: CandidateData): AxiosPromise<any> {
    const files = candidate.files || [];
    let remote_cv_url = files.length > 0 ? files[0] : undefined;
    // recruitee does not accept relative path
    if (remote_cv_url && !remote_cv_url.startsWith('http')) {
      remote_cv_url = undefined;
    }

    // Only the first file can be the CV. The others are kept as links here and attached as files afterwards.
    const extraFiles = files.slice(1).filter((f) => f.startsWith('http'));
    const links = [...(candidate.details ? [candidate.details] : []), ...extraFiles];

    return axios.post(
      `${this.baseUrl}/candidates`,
      {
        offers: [offerId],
        candidate: {
          name: candidate.name,
          emails: candidate.email ? [candidate.email] : [],
          phones: candidate.phone ? [candidate.phone] : [],
          sources: [candidate.source || 'StartupJobs'],
          cover_letter: candidate.why || undefined,
          links: links.length > 0 ? links : undefined,
          social_links: candidate.linkedin ? [candidate.linkedin] : undefined,
          remote_cv_url,
        },
      },
      this.requestConfig
    );
  }

  public async addCandidateTags(candidateId: number, tags: string[]): Promise<AxiosResponse<any> | undefined> {
    if (tags.length === 0) return undefined;

    return axios.post(
      `https://api.recruitee.com/c/${DomainNormalizer.normalize(
        this.config.companyDomain,
      )}/candidates/${candidateId}/tags`,
      {
        tags,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      },
    );
  }

  public async getOffers(): Promise<RecruiteeOffer[]> {
    const offers = await this.listAllOffers();

    // Filter out closed and archived offers - we only want active offers (published/internal)
    const activeOffers = offers.filter((offer: any) => {
      const status = offer.status;
      return ACTIVE_OFFER_STATUSES.includes(status);
    });

    // The list endpoint doesn't return offer_tags, so we need to fetch individual offer details
    // to get tags. Fetch them in parallel for efficiency.
    const offersWithTags = await Promise.all(
      activeOffers.map(async (offer: any) => {
        try {
          const detailResponse = await axios.get(
            `${this.baseUrl}/offers/${offer.id}`,
            {
              headers: {
                Authorization: `Bearer ${this.config.accessToken}`,
              },
            }
          );
          return {
            id: offer.id,
            title: offer.title,
            slug: offer.slug,
            offer_tags: detailResponse.data.offer.offer_tags || [],
            status: offer.status,
            kind: offer.kind,
          };
        } catch (error) {
          // If fetching individual offer fails, return offer without tags
          return {
            id: offer.id,
            title: offer.title,
            slug: offer.slug,
            offer_tags: [],
            status: offer.status,
            kind: offer.kind,
          };
        }
      })
    );

    return offersWithTags;
  }

  /**
   * Lists all offers (jobs and talent pools). The endpoint is paginated since December 2025,
   * so a single call may return only the first page.
   */
  private async listAllOffers(): Promise<any[]> {
    const limit = 1000;
    const maxPages = 20;
    const byId = new Map<number, any>();
    for (let page = 1; page <= maxPages; page++) {
      const response = await axios.get(`${this.baseUrl}/offers`, {
        ...this.requestConfig,
        params: { limit, page },
      });
      const pageOffers: any[] = response.data.offers || [];
      const sizeBefore = byId.size;
      pageOffers.forEach((offer) => byId.set(offer.id, offer));
      const total: number | undefined = response.data.meta?.total_count;
      const gotNothingNew = byId.size === sizeBefore;
      if (gotNothingNew || pageOffers.length < limit || (total !== undefined && byId.size >= total)) {
        break;
      }
    }
    return Array.from(byId.values());
  }

  public async getOfferById(offerId: number): Promise<RecruiteeOffer | undefined> {
    try {
      const response = await axios.get(`${this.baseUrl}/offers/${offerId}`, this.requestConfig);
      const offer = response.data.offer;
      if (!offer) {
        return undefined;
      }
      return {
        id: offer.id,
        title: offer.title,
        slug: offer.slug,
        offer_tags: offer.offer_tags || [],
        status: offer.status,
        kind: offer.kind,
        adminUrl: offer.adminapp_url,
      };
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 404) {
        return undefined;
      }
      throw e;
    }
  }

  public async findCandidatesByEmail(email: string): Promise<RecruiteeCandidateHit[]> {
    const wanted = email.trim().toLowerCase();
    const response = await axios.get(`${this.baseUrl}/search/new/candidates`, {
      ...this.requestConfig,
      params: {
        filters_json: JSON.stringify([{ field: 'all', query: wanted }]),
        limit: 50,
        page: 1,
      },
    });
    const hits: any[] = response.data?.hits;
    if (!Array.isArray(hits)) {
      // Fail loudly: treating an unexpected response as "not found" would create duplicates
      throw new Error('Unexpected response from Recruitee candidate search: no "hits" array');
    }
    return hits
      .filter((hit) => {
        // The "all" field is a full-text search. When the hit carries e-mails, require an exact one.
        if (!Array.isArray(hit.emails)) {
          return true;
        }
        return hit.emails.some((e: any) => String(e).trim().toLowerCase() === wanted);
      })
      .map(RecruiteeClient.toHit);
  }

  private static toHit(hit: any): RecruiteeCandidateHit {
    return {
      id: hit.id,
      emails: Array.isArray(hit.emails) ? hit.emails.map(String) : undefined,
      createdAt: hit.created_at,
      // Search hits nest the offer (placements[].offer.id), the create response is flat (placements[].offer_id)
      offerIds: (hit.placements || []).map((p: any) => p.offer?.id ?? p.offer_id).filter((id: any) => typeof id === 'number'),
    };
  }

  public async attachRemoteFile(candidateId: number, fileUrl: string): Promise<void> {
    await axios.post(
      `${this.baseUrl}/attachments`,
      { attachment: { remote_file_url: fileUrl, candidate_id: String(candidateId) } },
      this.requestConfig
    );
  }

  public async listCandidatesInOffer(offerId: number, kind: 'job' | 'talent_pool'): Promise<RecruiteeCandidateList> {
    const response = await axios.get(`${this.baseUrl}/search/new/candidates`, {
      ...this.requestConfig,
      params: {
        filters_json: JSON.stringify([{ filter: kind === 'job' ? 'jobs' : 'talent_pools', id: { in: [offerId] } }]),
        sort_by: 'created_at_asc',
        limit: 500,
        page: 1,
      },
    });
    const hits: any[] = response.data?.hits;
    if (!Array.isArray(hits)) {
      throw new Error('Unexpected response from Recruitee candidate search: no "hits" array');
    }
    return { total: typeof response.data.total === 'number' ? response.data.total : hits.length, hits: hits.map(RecruiteeClient.toHit) };
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
