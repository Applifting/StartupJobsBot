import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { inspect } from 'util';
import { summarizeError } from './summarizeError';

describe('summarizeError', () => {
  it('drops the request body and headers of a failed HTTP call', async () => {
    const mock = new MockAdapter(axios);
    mock.onPost('https://api.recruitee.com/c/1/candidates').reply(422, { error: ["Name can't be blank"] });
    const error = await axios
      .post('https://api.recruitee.com/c/1/candidates', { candidate: { name: 'Pan Žralok', emails: ['shark@example.com'] } }, { headers: { Authorization: 'Bearer secret' } })
      .catch((e) => e);
    mock.restore();
    const text = inspect(summarizeError(error), false, 10);
    expect(text).toContain('422');
    expect(text).toContain("Name can't be blank");
    expect(text).not.toContain('Žralok');
    expect(text).not.toContain('shark@example.com');
    expect(text).not.toContain('secret');
  });

  it('keeps ordinary errors readable', () => {
    expect(summarizeError(new Error('boom')).message).toBe('boom');
  });
});
