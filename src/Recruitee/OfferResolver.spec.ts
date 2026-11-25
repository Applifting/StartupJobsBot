import { OfferResolver } from './OfferResolver';
import { MockRecruiteeClient } from '../TestUtils/MockRecruiteeClient';
import { webhookDevOffer, UXDesignerOffer } from '../TestUtils/offers';

describe('OfferResolver', () => {
  let recruitee: MockRecruiteeClient;
  const talentPool = { id: 966551, title: 'Product Development 🎯', slug: 'product-development', kind: 'talent_pool', status: 'active' };

  beforeEach(() => {
    recruitee = new MockRecruiteeClient([UXDesignerOffer, webhookDevOffer]);
    recruitee.offersById = [talentPool, { id: 777, title: 'Old job', slug: 'old-job', status: 'archived' }];
  });

  it('prefers a match among active offers', async () => {
    const resolver = new OfferResolver(recruitee, 999);
    expect(await resolver.resolve({ position: 'UX Designer', internalPositionName: null })).toEqual({ offerId: 2, via: 'match', title: 'UX Designer', byId: false });
  });

  it('accepts an explicit id of an offer outside the active list, such as a talent pool', async () => {
    const resolver = new OfferResolver(recruitee, 999);
    expect(await resolver.resolve({ position: 'Whatever', internalPositionName: ' 966551 ' })).toEqual({
      offerId: 966551,
      via: 'explicit-id',
      title: 'Product Development 🎯',
      byId: true,
    });
  });

  it('does not accept an explicit id of an archived offer', async () => {
    const resolver = new OfferResolver(recruitee, 999);
    expect(await resolver.resolve({ position: 'Whatever', internalPositionName: '777' })).toEqual({ offerId: 999, via: 'fallback' });
  });

  it('falls back when nothing matches', async () => {
    const resolver = new OfferResolver(recruitee, 999);
    expect(await resolver.resolve({ position: 'Product Manager', internalPositionName: 'product' })).toEqual({
      offerId: 999,
      via: 'fallback',
    });
  });

  it('returns undefined when nothing matches and there is no fallback', async () => {
    const resolver = new OfferResolver(recruitee);
    expect(await resolver.resolve({ position: 'Product Manager', internalPositionName: 'product' })).toBeUndefined();
  });
});
