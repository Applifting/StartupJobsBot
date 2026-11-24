import { IRecruiteeClient } from '../Recruitee/IRecruiteeClient';
import { OfferResolver } from '../Recruitee/OfferResolver';
import { formatSuggestions, OfferSuggestion, suggestOffers } from '../Recruitee/OfferSuggester';
import { IStartupJobsApiClient } from '../StartupJobs/StartupJobsApiClient';

export interface OfferCheckItem {
  name: string;
  internalName?: string;
  url?: string;
  // For broken offers: the closest Recruitee offers. For fragile ones: the offer it currently resolves to.
  suggestions: { id: number; title: string }[];
}

export interface OfferCheckResult {
  checked: number;
  // Would not find any Recruitee offer: applications end in the fallback pool, or nowhere without one
  broken: OfferCheckItem[];
  // Resolves today, but through a title, slug or tag that breaks when somebody renames things
  fragile: OfferCheckItem[];
}

/**
 * Goes through the active StartupJobs offers and checks that each would find its Recruitee offer,
 * so a broken mapping shows up before the first application instead of after it.
 */
export class OfferCheck {
  constructor(
    private startupJobs: IStartupJobsApiClient,
    private recruitee: IRecruiteeClient,
    private resolver: OfferResolver,
    private hasFallback: boolean
  ) {}

  public async run(): Promise<OfferCheckResult> {
    const startupJobsOffers = await this.startupJobs.listActiveOffers();
    const recruiteeOffers = await this.recruitee.getOffers();
    const result: OfferCheckResult = { checked: startupJobsOffers.length, broken: [], fragile: [] };

    for (const offer of startupJobsOffers) {
      const candidate = { position: offer.names[0] || '', positionAliases: offer.names.slice(1), internalPositionName: offer.internalName };
      const resolution = await this.resolver.resolve(candidate, recruiteeOffers);
      const item = { name: offer.names[0] || `(${offer.id})`, internalName: offer.internalName, url: offer.url };
      if (!resolution || resolution.via === 'fallback') {
        const suggestions: OfferSuggestion[] = suggestOffers([...offer.names, offer.internalName], recruiteeOffers);
        result.broken.push({ ...item, suggestions });
      } else if (!resolution.byId) {
        result.fragile.push({ ...item, suggestions: [{ id: resolution.offerId, title: resolution.title || '?' }] });
      }
    }
    return result;
  }

  private static label(item: OfferCheckItem): string {
    const name = item.url ? `<${item.url}|${item.name}>` : `„${item.name}“`;
    return `${name} (interní název: ${item.internalName || 'nevyplněn'})`;
  }

  public formatBroken(result: OfferCheckResult): string | undefined {
    if (result.broken.length === 0) {
      return undefined;
    }
    const consequence = this.hasFallback
      ? 'Přihlášky z nich skončí v záložním talent poolu.'
      : 'Přihlášky z nich se do Recruitee nedostanou.';
    const lines = result.broken.map(
      (item) =>
        `• ${OfferCheck.label(item)}` +
        (item.suggestions.length ? ` → nejblíž v Recruitee: ${formatSuggestions(item.suggestions)}` : ' → v Recruitee nic podobného není, pozice tam nejspíš chybí nebo není publikovaná')
    );
    return (
      `:rotating_light: Nabídky na StartupJobs, které nenajdou pozici v Recruitee (${result.broken.length} z ${result.checked}). ${consequence}\n` +
      `${lines.join('\n')}\n` +
      `Oprava: do interního názvu nabídky na StartupJobs napište ID pozice z Recruitee.`
    );
  }

  public static formatFragile(result: OfferCheckResult): string | undefined {
    if (result.fragile.length === 0) {
      return undefined;
    }
    const lines = result.fragile.map((item) => `• ${OfferCheck.label(item)} → dejte do interního názvu ${formatSuggestions(item.suggestions)}`);
    return `Nabídky spárované podle názvu nebo tagu místo ID (fungují, ale rozbije je přejmenování):\n${lines.join('\n')}`;
  }
}
