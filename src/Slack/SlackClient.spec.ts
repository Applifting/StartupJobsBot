import { SlackClient } from './SlackClient';
import { mrShark } from '../TestUtils/candidates';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { SlackIntegrationCheckResult } from './SlackIntegrationCheckResult';

describe('SlackClient', () => {
  describe('Link creation', () => {
    it('creates links', () => {
      expect(SlackClient.assembleLinks(mrShark)).toEqual(
        '<https://www.startupjobs.cz/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c|my-cv.pdf> | <https://linkedin.com/pan-zralok|LinkedIn> | <https://www.startupjobs.cz/admin/zajemce/32437?oid=4332|StartupJobs>'
      );
    });
  });

  describe('IntegrationHealthCheck', () => {
    let mock: MockAdapter;
    beforeEach(() => {
      mock = new MockAdapter(axios);
    });
    afterEach(() => {
      mock.restore();
    });

    it('Returns INVALID_URL for malformed URL', async () => {
      const mock = new MockAdapter(axios);
      mock.onAny('/test').reply(200);
      const client = new SlackClient({ webhookUrl: '/test' });
      const result = await client.checkIntegration();
      expect(result).toEqual(SlackIntegrationCheckResult.INVALID_SLACK_URL);
    });

    it('Returns INVALID_URL for http url', async () => {
      mock.onAny('http://slack.com/test').reply(200);
      const client = new SlackClient({ webhookUrl: 'http://slack.com/test' });
      const result = await client.checkIntegration();
      expect(result).toEqual(SlackIntegrationCheckResult.INVALID_SLACK_URL);
    });

    it('Returns FORBIDDEN for 403 response', async () => {
      mock.onAny('https://slack.com/test').reply(403);
      const client = new SlackClient({ webhookUrl: 'https://slack.com/test' });
      const result = await client.checkIntegration();
      expect(result).toEqual(SlackIntegrationCheckResult.FORBIDDEN);
    });

    it('Returns SLACK_NOT_AVAILABLE for 500-599 response', async () => {
      mock.onAny('https://slack.com/test').reply(503);
      const client = new SlackClient({ webhookUrl: 'https://slack.com/test' });
      const result = await client.checkIntegration();
      expect(result).toEqual(SlackIntegrationCheckResult.SLACK_NOT_AVAILABLE);
    });

    it('Returns OK for correctly configured slack webhook url with running slack', async () => {
      mock.onAny('https://slack.com/test').reply(200);
      const client = new SlackClient({ webhookUrl: 'https://slack.com/test' });
      const result = await client.checkIntegration();
      expect(result).toEqual(SlackIntegrationCheckResult.OK);
    });
  });

  describe('Posting', () => {
    const mock = new MockAdapter(axios);

    beforeAll(() => {
      mock.onPost('/test').reply(200);
    });

    it('sends the webhook payload', async () => {
      const client = new SlackClient({ webhookUrl: '/test' });
      await client.sendCandidateToSlack(mrShark);
      const expectedPayload = {
        text: 'Nový kandidát!\nPan Žralok chce být Vývojář webhooků\n\n\n:phone: +420 725 875 752\n:email: dev@startupjobs.cz\n',
        attachments: [
          {
            fallback: 'Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!',
            color: '#6B97CA',
            title: 'Proč já:question:',
            text: 'Chci se stát vývojářem webhooků na StartupJobs.cz, protože mě to baví!',
          },
          {
            fallback: 'https://www.startupjobs.cz/admin/zajemce/32437?oid=4332',
            title: 'Odkazy',
            text:
              '<https://www.startupjobs.cz/download-file?file=my-cv.pdf&hash=816dc09a57ad42048c|my-cv.pdf> | <https://linkedin.com/pan-zralok|LinkedIn> | <https://www.startupjobs.cz/admin/zajemce/32437?oid=4332|StartupJobs>',
          },
        ],
      };
      expect(mock.history.post[0].data).toBe(JSON.stringify(expectedPayload));
    });

    afterAll(() => {
      mock.restore();
    });
  });
});
