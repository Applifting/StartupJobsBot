import { CandidateMatcher, Matchable } from './CandidateMatcher';
import { IRecruiteeClient } from './IRecruiteeClient';
import { DEAD_OFFER_STATUSES, RecruiteeOffer } from './RecruiteeOffer';

export interface OfferResolution {
  offerId: number;
  /**
   * match       - matched an active offer by id, title, tag or slug
   * explicit-id - the internal position name is the id of an offer that is not in the active list (e.g. a talent pool or a draft job)
   * fallback    - nothing matched, the configured fallback offer is used
   */
  via: 'match' | 'explicit-id' | 'fallback';
  // Title of the offer, when known
  title?: string;
  // True when the link is the Recruitee offer id written in the internal position name, i.e. it survives renaming
  byId?: boolean;
}

/**
 * Decides which Recruitee offer a candidate belongs to. Shared by the webhook and by the reconciler,
 * so both always put a candidate in the same place.
 */
export class OfferResolver {
  private matcher = new CandidateMatcher();

  constructor(private recruitee: IRecruiteeClient, private fallbackOfferId?: number) {}

  public async resolve(
    candidate: Matchable,
    activeOffers?: RecruiteeOffer[]
  ): Promise<OfferResolution | undefined> {
    const offers = activeOffers ?? (await this.recruitee.getOffers());
    const matched = this.matcher.matchCandidateToOfferId(candidate, offers);
    const explicitId = CandidateMatcher.explicitOfferId(candidate);
    if (matched) {
      return { offerId: matched, via: 'match', title: offers.find((o) => o.id === matched)?.title, byId: matched === explicitId };
    }

    if (explicitId) {
      const offer = await this.recruitee.getOfferById(explicitId);
      if (offer && !(offer.status && DEAD_OFFER_STATUSES.includes(offer.status))) {
        return { offerId: offer.id, via: 'explicit-id', title: offer.title, byId: true };
      }
    }

    if (this.fallbackOfferId) {
      return { offerId: this.fallbackOfferId, via: 'fallback' };
    }
    return undefined;
  }
}
