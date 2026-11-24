import { ACTIVE_OFFER_STATUSES, RecruiteeOffer } from './RecruiteeOffer';
import { CandidateData } from '../Candidate/CandidateData';

export type Matchable = Pick<CandidateData, 'position' | 'internalPositionName' | 'positionAliases'>;

export class CandidateMatcher {
  /**
   * The Recruitee offer id written directly into the StartupJobs internal position name, if there is one.
   * This is the only mapping that survives renaming of offers on either side.
   */
  public static explicitOfferId(candidate: Matchable): number | undefined {
    const value = (candidate.internalPositionName || '').trim();
    return /^\d+$/.test(value) ? Number(value) : undefined;
  }

  public matchCandidateToOfferId(candidate: Matchable, offers: RecruiteeOffer[]): number | undefined {
    if (candidate.internalPositionName) {
      const matchByInternalPositionName = this.matchCandidatePropertyToOffer(
        candidate.internalPositionName.toLocaleLowerCase().trim(),
        offers
      );
      if (matchByInternalPositionName) {
        return matchByInternalPositionName;
      }
    }
    for (const position of [candidate.position, ...(candidate.positionAliases || [])]) {
      if (!position) {
        continue;
      }
      const matchByPositionName = this.matchCandidatePropertyToOffer(position.toLocaleLowerCase().trim(), offers);
      if (matchByPositionName) {
        return matchByPositionName;
      }
    }

    return undefined;
  }

  private matchCandidatePropertyToOffer(property: string, offers: RecruiteeOffer[]): number | undefined {
    const numericId = /^\d+$/.test(property) ? Number(property) : undefined;
    for (const offer of offers) {
      // Offers without a status (older callers, tests) are treated as active
      if (offer.status && !ACTIVE_OFFER_STATUSES.includes(offer.status)) {
        continue;
      }
      if (
        offer.id === numericId ||
        (offer.title && offer.title.trim().toLocaleLowerCase() == property) ||
        (offer.offer_tags && offer.offer_tags.map((tag) => tag.trim().toLocaleLowerCase()).indexOf(property) !== -1) ||
        (offer.slug && offer.slug.toLocaleLowerCase() == property)
      ) {
        return offer.id;
      }
    }
    return undefined;
  }
}
