import axios from 'axios';

export interface StartupJobsApiConfig {
  apiToken: string;
  baseUrl?: string;
}

/** An application as needed by the reconciler, normalized from the StartupJobs API response. */
export interface StartupJobsApplication {
  id: string;
  createdAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  text?: string;
  attachments: string[];
  offerId?: string;
  position?: string;
  // The same position in other languages
  positionAliases: string[];
  internalPositionName?: string;
}

/** An active offer on StartupJobs. */
export interface StartupJobsOffer {
  id: string;
  // Titles in all languages, Czech first
  names: string[];
  internalName?: string;
  url?: string;
}

export interface IStartupJobsApiClient {
  /** `skip` holds ids the caller does not need again; their details are not fetched. */
  listApplicationsSince(since: Date, skip?: Set<string>): Promise<StartupJobsApplication[]>;
  listActiveOffers(): Promise<StartupJobsOffer[]>;
}

const text = (v: any): string | undefined => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

/**
 * Titles come as [{name, lang}] under `names` (lists) or `name` (application detail).
 * Plain strings and objects keyed by language are accepted too.
 */
export const readNames = (value: any): string[] => {
  if (typeof value === 'string') {
    return text(value) ? [value.trim()] : [];
  }
  const entries: { name?: string; lang?: string }[] = Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? { name: v } : v || {}))
    : value && typeof value === 'object'
    ? Object.entries(value).map(([lang, name]) => ({ lang, name: name as string }))
    : [];
  const named = entries.filter((e) => text(e.name));
  named.sort((a, b) => (a.lang === 'cs' ? 0 : 1) - (b.lang === 'cs' ? 0 : 1));
  return Array.from(new Set(named.map((e) => (e.name as string).trim())));
};

const LIST_KEYS = ['resultSet', 'data', 'items', 'results', 'applications', 'offers'];
const MAX_PAGES = 50;

/**
 * Client for the StartupJobs company API, https://firmy.startupjobs.cz/en/articles/9506864-startupjobs-dev
 * The documentation does not describe the list envelope or pagination, so both are handled defensively:
 * an unexpected response shape throws instead of being read as "no applications".
 */
export class StartupJobsApiClient implements IStartupJobsApiClient {
  private baseUrl: string;

  constructor(private config: StartupJobsApiConfig) {
    this.baseUrl = (config.baseUrl || 'https://api.startupjobs.cz').replace(/\/$/, '');
  }

  private get requestConfig() {
    return { headers: { Authorization: `Bearer ${this.config.apiToken}` } };
  }

  public static unwrapList(data: any): any[] {
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      for (const key of LIST_KEYS) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
      throw new Error(`Unexpected StartupJobs API response, keys: ${Object.keys(data).join(', ')}`);
    }
    throw new Error(`Unexpected StartupJobs API response of type ${typeof data}`);
  }

  private static nextUrl(data: any): string | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }
    const next = data.next ?? data.links?.next ?? data.meta?.next ?? data.paginator?.next;
    return typeof next === 'string' && next.length > 0 ? next : undefined;
  }

  private async getList(path: string, params: Record<string, string>): Promise<any[]> {
    const items: any[] = [];
    let response = await axios.get(`${this.baseUrl}${path}`, { ...this.requestConfig, params });
    items.push(...StartupJobsApiClient.unwrapList(response.data));
    for (let page = 1; page < MAX_PAGES; page++) {
      const next = StartupJobsApiClient.nextUrl(response.data);
      if (!next) {
        break;
      }
      response = await axios.get(next.startsWith('http') ? next : `${this.baseUrl}${next}`, this.requestConfig);
      items.push(...StartupJobsApiClient.unwrapList(response.data));
    }
    return items;
  }

  public async listOffers(): Promise<any[]> {
    return this.getList('/company/offers', {});
  }

  public async listActiveOffers(): Promise<StartupJobsOffer[]> {
    const offers = await this.listOffers();
    return offers
      .filter((offer) => offer?.id !== undefined)
      .map((offer) => {
        const links: any[] = Array.isArray(offer.links) ? offer.links : [];
        return {
          id: String(offer.id),
          names: readNames(offer.names ?? offer.name),
          internalName: text(offer.internal_name ?? offer.internal_position_name),
          url: text((links.find((l) => l?.lang === 'cs') ?? links[0])?.url),
        };
      });
  }

  public async getApplication(id: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/company/applications/${id}`, this.requestConfig);
    return response.data?.data ?? response.data;
  }

  /**
   * All applications created since the given day. Asks once without an offer filter and once per active offer
   * and merges the results, because the documentation does not say whether the unfiltered list is complete.
   */
  public async listApplicationsSince(since: Date, skip?: Set<string>): Promise<StartupJobsApplication[]> {
    const createdAfter = since.toISOString().slice(0, 10);
    const raw = new Map<string, any>();
    const errors: Error[] = [];
    let successfulQueries = 0;

    const collect = async (params: Record<string, string>) => {
      try {
        const list = await this.getList('/company/applications', { ...params, 'created_at.gt': createdAfter });
        list.forEach((item) => item?.id !== undefined && raw.set(String(item.id), item));
        successfulQueries++;
      } catch (e) {
        errors.push(e as Error);
      }
    };

    await collect({});
    let offers: any[] = [];
    try {
      offers = await this.listOffers();
    } catch (e) {
      errors.push(e as Error);
    }
    for (const offer of offers) {
      if (offer?.id !== undefined) {
        await collect({ offer: String(offer.id) });
      }
    }
    if (successfulQueries === 0) {
      throw errors[0] ?? new Error('StartupJobs API returned no usable response');
    }

    const applications: StartupJobsApplication[] = [];
    for (const item of raw.values()) {
      if (skip?.has(String(item.id))) {
        continue;
      }
      // The list may be a summary; the detail has e-mail, attachments and the offer
      const needsDetail = item.email === undefined || item.offer === undefined;
      const full = needsDetail ? await this.getApplication(String(item.id)) : item;
      applications.push(StartupJobsApiClient.normalize({ ...item, ...full }));
    }
    return applications;
  }

  public static normalize(app: any): StartupJobsApplication {
    const names = readNames(app.offer?.name ?? app.offer?.names);
    return {
      id: String(app.id),
      createdAt: text(app.created_at),
      name: text(app.name),
      email: text(app.email),
      phone: text(app.phone),
      linkedin: text(typeof app.linkedin === 'string' ? app.linkedin : app.linkedin?.url),
      text: text(app.text),
      attachments: (Array.isArray(app.attachments) ? app.attachments : [])
        .map((a: any) => (typeof a === 'string' ? a : a?.url))
        .filter((url: any) => typeof url === 'string'),
      offerId: app.offer?.id !== undefined ? String(app.offer.id) : undefined,
      position: names[0],
      positionAliases: names.slice(1),
      internalPositionName: text(app.offer?.internal_position_name ?? app.offer?.internal_name),
    };
  }
}
