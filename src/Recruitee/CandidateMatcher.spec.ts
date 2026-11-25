import { CandidateMatcher } from './CandidateMatcher';
import { mrShark } from '../TestUtils/candidates';
import { webhookDevOffer, UXDesignerOffer } from '../TestUtils/offers';

describe('CandidateMatcher', () => {
  let matcher: CandidateMatcher;

  beforeEach(() => {
    matcher = new CandidateMatcher();
  });

  describe('Does not match', () => {
    it('on unmatching offer', () => {
      expect(matcher.matchCandidateToOfferId(mrShark, [UXDesignerOffer])).toBeUndefined();
    });
  });

  describe('Matches candidate', () => {
    it('by position name', () => {
      expect(matcher.matchCandidateToOfferId(mrShark, [webhookDevOffer, UXDesignerOffer])).toEqual(1);
    });
    it('by internal position', () => {
      expect(matcher.matchCandidateToOfferId(mrShark, [{ ...webhookDevOffer, title: 'JOB1' }, UXDesignerOffer])).toEqual(1);
    });
    it('by internal and tags', () => {
      expect(
        matcher.matchCandidateToOfferId(mrShark, [
          UXDesignerOffer,
          {
            ...webhookDevOffer,
            offer_tags: ['JOB1', 'Some othe tags'],
            title: 'some nonsensical name',
          },
        ])
      ).toEqual(1);
    });
    it('only matches against active offers (published/internal), ignores archived/closed', () => {
      const archivedOffer = {
        ...webhookDevOffer,
        id: 10,
        offer_tags: ['JOB1'],
        status: 'archived' as const,
      };
      const publishedOffer = {
        ...webhookDevOffer,
        id: 20,
        offer_tags: ['JOB1'],
        status: 'published' as const,
      };
      // Should only match the published offer, archived should be ignored
      expect(
        matcher.matchCandidateToOfferId(mrShark, [archivedOffer, publishedOffer])
      ).toEqual(20);
      // If only archived offers exist, should not match
      expect(
        matcher.matchCandidateToOfferId(mrShark, [archivedOffer])
      ).toBeUndefined();
    });
  });

  describe('Offer id in the internal position name', () => {
    it('matches by id', () => {
      expect(matcher.matchCandidateToOfferId({ ...mrShark, internalPositionName: '2' }, [webhookDevOffer, UXDesignerOffer])).toEqual(2);
    });
    it('does not read a leading digit of a name as an id', () => {
      expect(
        matcher.matchCandidateToOfferId({ ...mrShark, position: '2D Artist', internalPositionName: '2d artist' }, [UXDesignerOffer])
      ).toBeUndefined();
    });
    it('exposes the explicit id', () => {
      expect(CandidateMatcher.explicitOfferId({ position: 'x', internalPositionName: ' 966551 ' })).toEqual(966551);
      expect(CandidateMatcher.explicitOfferId({ position: 'x', internalPositionName: 'JOB1' })).toBeUndefined();
    });
  });
});
