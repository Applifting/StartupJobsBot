import { describePayload } from './describePayload';
import { mrShark } from '../TestUtils/candidates';

describe('describePayload', () => {
  it('keeps what is needed to find the application and drops personal data', () => {
    const text = describePayload(mrShark);
    expect(text).toContain('12345');
    expect(text).toContain('1234');
    expect(text).toContain('JOB1');
    expect(text).not.toContain(mrShark.name);
    expect(text).not.toContain(mrShark.email);
    expect(text).not.toContain(mrShark.phone);
    expect(text).not.toContain('my-cv.pdf');
  });

  it('survives a missing body', () => {
    expect(describePayload(undefined)).toBe('(undefined payload)');
  });
});
