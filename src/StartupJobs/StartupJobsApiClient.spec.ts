import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { StartupJobsApiClient } from './StartupJobsApiClient';

describe('StartupJobsApiClient', () => {
  let mock: MockAdapter;
  const client = new StartupJobsApiClient({ apiToken: 'secret' });
  const detail = {
    id: 'a1',
    name: 'Pan Žralok',
    email: 'shark@example.com',
    phone: '+420 111 222 333',
    linkedin: { url: 'https://linkedin.com/in/shark' },
    text: '<p>Ahoj</p>',
    attachments: [{ url: 'https://files/cv.pdf' }],
    offer: {
      id: 'o1',
      name: [
        { name: 'Product Manager EN', lang: 'en' },
        { name: 'Produktový manažer', lang: 'cs' },
      ],
      internal_position_name: 'product',
    },
    created_at: '2026-11-05T10:00:00+01:00',
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });
  afterEach(() => mock.restore());

  it('normalizes an application detail', () => {
    expect(StartupJobsApiClient.normalize(detail)).toEqual({
      id: 'a1',
      createdAt: '2026-11-05T10:00:00+01:00',
      name: 'Pan Žralok',
      email: 'shark@example.com',
      phone: '+420 111 222 333',
      linkedin: 'https://linkedin.com/in/shark',
      text: '<p>Ahoj</p>',
      attachments: ['https://files/cv.pdf'],
      offerId: 'o1',
      position: 'Produktový manažer',
      positionAliases: ['Product Manager EN'],
      internalPositionName: 'product',
    });
  });

  it('unwraps bare arrays and enveloped lists, and refuses unknown shapes', () => {
    expect(StartupJobsApiClient.unwrapList([1])).toEqual([1]);
    expect(StartupJobsApiClient.unwrapList({ resultSet: [1] })).toEqual([1]);
    expect(StartupJobsApiClient.unwrapList({ data: [1] })).toEqual([1]);
    expect(() => StartupJobsApiClient.unwrapList({ message: 'nope' })).toThrow('Unexpected StartupJobs API response');
  });

  it('merges the unfiltered list with per-offer lists and fetches details for summaries', async () => {
    mock.onGet('https://api.startupjobs.cz/company/offers').reply(200, [{ id: 'o1' }]);
    mock.onGet('https://api.startupjobs.cz/company/applications').reply((config) => {
      expect(config.headers!.Authorization).toBe('Bearer secret');
      expect(config.params['created_at.gt']).toBe('2026-11-01');
      return config.params.offer === 'o1' ? [200, [{ id: 'a1' }, { id: 'a2' }]] : [200, [{ id: 'a1' }]];
    });
    mock.onGet('https://api.startupjobs.cz/company/applications/a1').reply(200, detail);
    mock.onGet('https://api.startupjobs.cz/company/applications/a2').reply(200, { ...detail, id: 'a2', email: 'two@example.com' });

    const applications = await client.listApplicationsSince(new Date('2026-11-01T00:00:00Z'));
    expect(applications.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
    expect(applications.find((a) => a.id === 'a2')!.email).toBe('two@example.com');
  });

  it('follows pagination links', async () => {
    mock.onGet('https://api.startupjobs.cz/company/offers').reply(200, []);
    mock
      .onGet('https://api.startupjobs.cz/company/applications')
      .reply(200, { data: [detail], next: 'https://api.startupjobs.cz/company/applications?page=2' });
    mock.onGet('https://api.startupjobs.cz/company/applications?page=2').reply(200, { data: [{ ...detail, id: 'a2' }] });
    const applications = await client.listApplicationsSince(new Date('2026-11-01T00:00:00Z'));
    expect(applications).toHaveLength(2);
  });

  it('throws when no query succeeds, so an outage is not read as "nothing to import"', async () => {
    mock.onGet('https://api.startupjobs.cz/company/offers').reply(500);
    mock.onGet('https://api.startupjobs.cz/company/applications').reply(401);
    await expect(client.listApplicationsSince(new Date())).rejects.toThrow();
  });

  it('lists active offers with titles in all languages, Czech first', async () => {
    mock.onGet('https://api.startupjobs.cz/company/offers').reply(200, [
      {
        id: '9629f28d',
        links: [
          { url: 'https://www.startupjobs.cz/en/job/1234', lang: 'en' },
          { url: 'https://www.startupjobs.cz/nabidka/1234', lang: 'cs' },
        ],
        names: [
          { name: 'PHP shark', lang: 'en' },
          { name: 'PHP žralok', lang: 'cs' },
        ],
        internal_name: 'PHP programátor',
      },
    ]);
    expect(await client.listActiveOffers()).toEqual([
      { id: '9629f28d', names: ['PHP žralok', 'PHP shark'], internalName: 'PHP programátor', url: 'https://www.startupjobs.cz/nabidka/1234' },
    ]);
  });
});
