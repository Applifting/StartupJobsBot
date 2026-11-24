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

  it('puts an unmatched candidate into the fallback offer and says so in the candidate message', async () => {
    recruiteeMock.offers = [UXDesignerOffer, { id: 7, title: 'Vývojář webhooků senior', slug: 'webhook-senior', status: 'published' }];
    processor = new CandidateProcessor(slackMock, recruiteeMock, undefined, { fallbackOfferId: 999 });
    await processor.process({ ...mrShark, internalPositionName: 'nic' }, { tag: 'backend' });
    expect(recruiteeMock.created[0].offerId).toBe(999);
    expect(recruiteeMock.taggings[0].tags).toEqual(['backend']);
    expect(slackMock.outcomes).toHaveLength(1);
    expect(slackMock.outcomes[0]!.status).toBe('fallback');
    expect(slackMock.outcomes[0]!.candidateUrl).toContain('candidate=1000');
    expect(slackMock.outcomes[0]!.suggestions![0].id).toBe(7);
  });

  it('tells Slack which offer a matched candidate went to', async () => {
    processor = new CandidateProcessor(slackMock, recruiteeMock, undefined, { fallbackOfferId: 999 });
    await processor.process(mrShark);
    expect(recruiteeMock.created[0].offerId).toBe(webhookDevOffer.id);
    expect(slackMock.outcomes[0]).toMatchObject({ status: 'placed', offerTitle: 'Vývojář webhooků' });
  });

  it('still announces the candidate on Slack when Recruitee fails, without leaking the error, and rethrows', async () => {
    recruiteeMock.createError = new Error('Request failed: Bearer secret-token');
    processor = new CandidateProcessor(slackMock, recruiteeMock, undefined, { reconcilerImports: true });
    await expect(processor.process(mrShark)).rejects.toThrow('secret-token');
    expect(slackMock.sendCandidateToSlackCalled).toBe(true);
    expect(slackMock.outcomes[0]).toEqual({ status: 'failed', reason: 'chyba při zápisu do Recruitee', willRetry: true, suggestions: undefined });
  });

  it('reports an unmatched candidate as failed, with suggestions, when there is no fallback', async () => {
    recruiteeMock.offers = [UXDesignerOffer];
    await expect(processor.process({ ...mrShark, position: 'UX Designer senior', internalPositionName: 'nic' })).rejects.toThrow('Unable to match');
    expect(slackMock.outcomes[0]!.status).toBe('failed');
    expect(slackMock.outcomes[0]!.suggestions).toEqual([expect.objectContaining({ id: UXDesignerOffer.id })]);
  });

  it('creates the candidate even when Slack is down, then reports the Slack failure', async () => {
    slackMock.sendError = new Error('slack is down');
    await expect(processor.process(mrShark)).rejects.toThrow('slack is down');
    expect(recruiteeMock.created).toHaveLength(1);
  });

  it('attaches every file after the first', async () => {
    await processor.process({ ...mrShark, files: ['https://sj/cv.pdf', 'https://sj/portfolio.pdf', 'https://sj/letter.pdf'] });
    expect(recruiteeMock.attached.map((a) => a.fileUrl)).toEqual(['https://sj/portfolio.pdf', 'https://sj/letter.pdf']);
  });

  it('keeps the candidate when attaching a file fails', async () => {
    recruiteeMock.attachError = new Error('nope');
    await processor.process({ ...mrShark, files: ['https://sj/cv.pdf', 'https://sj/portfolio.pdf'] });
    expect(recruiteeMock.created).toHaveLength(1);
    expect(slackMock.outcomes[0]!.status).toBe('placed');
  });
});
