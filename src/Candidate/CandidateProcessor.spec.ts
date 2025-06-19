import { CandidateProcessor } from './CandidateProcessor';
import { MockSlackClient } from '../TestUtils/MockSlackClient';
import { MockRecruiteeClient } from '../TestUtils/MockRecruiteeClient';
import { mrShark } from '../TestUtils/candidates';
import { UXDesignerOffer, webhookDevOffer } from '../TestUtils/offers';

describe('CandidateProcessor', () => {
  let processor: CandidateProcessor;
  let slackMock: MockSlackClient;
  let recruiteeMock: MockRecruiteeClient;
  beforeEach(() => {
    slackMock = new MockSlackClient();
    recruiteeMock = new MockRecruiteeClient([UXDesignerOffer, webhookDevOffer]);
    processor = new CandidateProcessor(slackMock, recruiteeMock);
  });

  it('throws an error when no offer is matched', async () => {
    recruiteeMock.offers = [UXDesignerOffer];
    await expect(processor.process(mrShark)).rejects.toThrow();
  });

  it('processes candidate and sends it to slack and recruitee', async () => {
    await processor.process(mrShark);
    expect(slackMock.sendCandidateToSlackCalled).toBe(true);
    expect(recruiteeMock.getOffersCalled).toBe(true);
    expect(recruiteeMock.createCandidateCalled).toBe(true);
  });
});
