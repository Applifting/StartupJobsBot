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
  });
});
