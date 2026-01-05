import { StartupJobsPayload } from '../StartupJobs/webhookPayload';
import { RecruiteeOffer } from './RecruiteeOffer';

export class CandidateMatcher {
  public matchCandidateToOfferId(candidate: StartupJobsPayload, offers: RecruiteeOffer[]): number | undefined {
    if (candidate.internalPositionName) {
      const matchByInternalPositionName = this.matchCandidatePropertyToOffer(
        candidate.internalPositionName.toLocaleLowerCase().trim(),
        offers
      );
      if (matchByInternalPositionName) {
        return matchByInternalPositionName;
      }
    }
    if (candidate.position) {
      const matchByPositionName = this.matchCandidatePropertyToOffer(candidate.position.toLocaleLowerCase().trim(), offers);
      if (matchByPositionName) {
        return matchByPositionName;
      }
    }

    return undefined;
  }

  private matchCandidatePropertyToOffer(property: string, offers: RecruiteeOffer[]): number | undefined {
    for (const offer of offers) {
      if (
        offer.id == Number.parseInt(property) ||
        (offer.title && offer.title.trim().toLocaleLowerCase() == property) ||
        (offer.offer_tags && offer.offer_tags.map((tag) => tag.trim().toLocaleLowerCase()).indexOf(property) !== -1) ||
        (offer.slug && offer.slug == property)
      ) {
        return offer.id;
      }
    }
  }
}
